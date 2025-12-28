import type { Env } from './types'
import { DiscordGateway } from './gateway'

// Re-export Durable Object for wrangler
export { DiscordGateway }

export default {
  async fetch(request: Request, _env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/health') {
      return new Response('OK', { status: 200 })
    }

    return new Response('Not Found', { status: 404 })
  },

  // Scheduled handler - bootstraps gateway on deploy, recovers if disconnected
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    const gatewayId = env.GATEWAY.idFromName('main')
    const gateway = env.GATEWAY.get(gatewayId)

    const response = await gateway.fetch(new Request('http://internal/status'))
    const status = await response.json<{ connected: boolean }>()

    if (!status.connected) {
      console.log('Gateway disconnected, triggering reconnect')
      await gateway.fetch(new Request('http://internal/connect'))
    }
  },
}
