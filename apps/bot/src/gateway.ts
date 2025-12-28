import { DurableObject } from 'cloudflare:workers'
import type {
  Env,
  GatewayPayload,
  HelloPayload,
  ReadyPayload,
  DiscordMessage,
  Interaction,
} from './types'
import { handleMessageCreate, processSuppressionAlarms } from './handlers/message'
import { handleInteraction } from './handlers/interactions'

const GATEWAY_URL = 'wss://gateway.discord.gg/?v=10&encoding=json'
const REQUIRED_INTENTS = (1 << 9) | (1 << 15) // GuildMessages | MessageContent = 33280

interface GatewayState {
  sessionId: string | null
  sequence: number | null
  resumeGatewayUrl: string | null
  heartbeatInterval: number | null
  lastHeartbeatAck: boolean
}

export class DiscordGateway extends DurableObject<Env> {
  private ws: WebSocket | null = null
  private state: GatewayState = {
    sessionId: null,
    sequence: null,
    resumeGatewayUrl: null,
    heartbeatInterval: null,
    lastHeartbeatAck: true,
  }
  private isConnecting = false

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    this.ctx.blockConcurrencyWhile(async () => {
      const stored = await this.ctx.storage.get<GatewayState>('gatewayState')
      if (stored) {
        this.state = stored
      }
    })
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    switch (url.pathname) {
      case '/connect':
        await this.connect()
        return new Response('Connecting to Discord Gateway')

      case '/disconnect':
        await this.disconnect()
        return new Response('Disconnected from Discord Gateway')

      case '/status':
        return new Response(
          JSON.stringify({
            connected: this.ws !== null && this.ws.readyState === WebSocket.OPEN,
            sessionId: this.state.sessionId,
            sequence: this.state.sequence,
          }),
          { headers: { 'Content-Type': 'application/json' } }
        )

      default:
        return new Response('Unknown endpoint', { status: 404 })
    }
  }

  async alarm(): Promise<void> {
    console.log('Alarm triggered')

    // Process any pending suppression tasks
    await processSuppressionAlarms(this.ctx, this.env)

    // If connected, send heartbeat
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      if (!this.state.lastHeartbeatAck) {
        console.log('No heartbeat ACK received, reconnecting')
        this.ws.close(4000, 'Heartbeat timeout')
        return
      }
      this.sendHeartbeat()
      // Schedule next heartbeat
      if (this.state.heartbeatInterval) {
        await this.scheduleNextHeartbeat()
      }
    } else {
      // Not connected, try to connect
      console.log('Not connected, attempting connection')
      await this.connect()
    }
  }

  private async connect(): Promise<void> {
    if (this.isConnecting) {
      console.log('Already connecting, skipping')
      return
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('Already connected')
      return
    }

    this.isConnecting = true
    console.log('Connecting to Discord Gateway...')

    try {
      const gatewayUrl = this.state.resumeGatewayUrl || GATEWAY_URL
      this.ws = new WebSocket(gatewayUrl)

      this.ws.addEventListener('open', () => {
        console.log('WebSocket connection opened')
      })

      this.ws.addEventListener('message', (event) => {
        this.handleMessage(event.data as string)
      })

      this.ws.addEventListener('close', (event) => {
        console.log(`WebSocket closed: ${event.code} - ${event.reason}`)
        this.handleDisconnect(event.code)
      })

      this.ws.addEventListener('error', (event) => {
        console.error('WebSocket error:', event)
      })
    } catch (error) {
      console.error('Failed to connect:', error)
      this.isConnecting = false
      await this.scheduleReconnect()
    }
  }

  private async disconnect(): Promise<void> {
    this.state.heartbeatInterval = null
    await this.saveState()
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect')
      this.ws = null
    }
  }

  private handleMessage(data: string): void {
    try {
      const payload: GatewayPayload = JSON.parse(data)

      if (payload.s !== null && payload.s !== undefined) {
        this.state.sequence = payload.s
        this.saveState()
      }

      switch (payload.op) {
        case 10: // Hello
          this.handleHello(payload.d as HelloPayload)
          break

        case 11: // Heartbeat ACK
          console.log('Heartbeat ACK received')
          this.state.lastHeartbeatAck = true
          this.saveState()
          break

        case 0: // Dispatch
          this.handleDispatch(payload.t!, payload.d)
          break

        case 7: // Reconnect
          console.log('Received RECONNECT, closing and resuming')
          this.ws?.close(4000, 'Reconnect requested')
          break

        case 9: // Invalid Session
          console.log('Invalid session, resumable:', payload.d)
          if (!payload.d) {
            this.state.sessionId = null
            this.state.sequence = null
            this.saveState()
          }
          this.scheduleReconnect()
          break

        case 1: // Heartbeat request from Discord
          this.sendHeartbeat()
          break

        default:
          break
      }
    } catch (error) {
      console.error('Failed to parse gateway message:', error)
    }
  }

  private handleHello(data: HelloPayload): void {
    console.log('Received HELLO, heartbeat interval:', data.heartbeat_interval)
    this.isConnecting = false

    // Store heartbeat interval and schedule first heartbeat
    this.state.heartbeatInterval = data.heartbeat_interval
    this.state.lastHeartbeatAck = true
    this.saveState()

    // Send first heartbeat after jitter, then schedule alarm for next
    const jitter = Math.floor(Math.random() * data.heartbeat_interval)
    this.ctx.waitUntil(
      (async () => {
        await this.ctx.storage.setAlarm(Date.now() + jitter)
      })()
    )

    // Send IDENTIFY or RESUME
    if (this.state.sessionId && this.state.sequence !== null) {
      this.sendResume()
    } else {
      this.sendIdentify()
    }
  }

  private sendIdentify(): void {
    console.log('Sending IDENTIFY')
    const payload = {
      op: 2,
      d: {
        token: this.env.DISCORD_BOT_TOKEN,
        intents: REQUIRED_INTENTS,
        properties: {
          os: 'cloudflare',
          browser: 'embebot-cf',
          device: 'embebot-cf',
        },
        presence: {
          activities: [{ name: 'your messages', type: 3 }],
          status: 'dnd',
          since: null,
          afk: false,
        },
      },
    }
    this.ws?.send(JSON.stringify(payload))
  }

  private sendResume(): void {
    console.log('Sending RESUME')
    const payload = {
      op: 6,
      d: {
        token: this.env.DISCORD_BOT_TOKEN,
        session_id: this.state.sessionId,
        seq: this.state.sequence,
      },
    }
    this.ws?.send(JSON.stringify(payload))
  }

  private handleDispatch(eventName: string, data: unknown): void {
    switch (eventName) {
      case 'READY': {
        const readyData = data as ReadyPayload
        console.log(`Bot ready as ${readyData.user.username}`)
        this.state.sessionId = readyData.session_id
        this.state.resumeGatewayUrl = readyData.resume_gateway_url
        this.saveState()
        break
      }

      case 'RESUMED':
        console.log('Session resumed successfully')
        break

      case 'MESSAGE_CREATE': {
        const message = data as DiscordMessage
        if (message.author.bot) return
        this.ctx.waitUntil(this.processMessage(message))
        break
      }

      case 'INTERACTION_CREATE': {
        const interaction = data as Interaction
        this.ctx.waitUntil(this.processInteraction(interaction))
        break
      }

      default:
        break
    }
  }

  private async processMessage(message: DiscordMessage): Promise<void> {
    try {
      await handleMessageCreate(message, this.env, this.ctx)
    } catch (error) {
      console.error('Error processing message:', error)
    }
  }

  private async processInteraction(interaction: Interaction): Promise<void> {
    try {
      const response = await handleInteraction(interaction, this.env)

      // Respond via REST API callback
      const callbackUrl = `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`
      const res = await fetch(callbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(response),
      })

      if (!res.ok) {
        const error = await res.text()
        console.error('Failed to respond to interaction:', error)
      }
    } catch (error) {
      console.error('Error processing interaction:', error)
    }
  }

  private sendHeartbeat(): void {
    console.log('Sending heartbeat, seq:', this.state.sequence)
    this.state.lastHeartbeatAck = false
    this.saveState()
    const payload = {
      op: 1,
      d: this.state.sequence,
    }
    this.ws?.send(JSON.stringify(payload))
  }

  private async scheduleNextHeartbeat(): Promise<void> {
    if (this.state.heartbeatInterval) {
      await this.ctx.storage.setAlarm(Date.now() + this.state.heartbeatInterval)
    }
  }

  private handleDisconnect(code: number): void {
    this.ws = null
    this.isConnecting = false
    this.state.heartbeatInterval = null

    if (this.shouldReconnect(code)) {
      console.log('Scheduling reconnection...')
      this.scheduleReconnect()
    } else {
      console.log('Not reconnecting due to close code:', code)
      this.state.sessionId = null
      this.state.sequence = null
      this.state.resumeGatewayUrl = null
      this.saveState()
    }
  }

  private shouldReconnect(code: number): boolean {
    const noReconnectCodes = [4004, 4010, 4011, 4012, 4013, 4014]
    return !noReconnectCodes.includes(code)
  }

  private async scheduleReconnect(): Promise<void> {
    const alarm = await this.ctx.storage.getAlarm()
    if (!alarm) {
      await this.ctx.storage.setAlarm(Date.now() + 5000)
    }
  }

  private saveState(): void {
    this.ctx.waitUntil(this.ctx.storage.put('gatewayState', this.state))
  }
}
