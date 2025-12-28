import type { Env, DiscordMessage } from '../types'

const DISCORD_API_BASE = 'https://discord.com/api/v10'

interface RequestOptions {
  method: string
  path: string
  body?: unknown
  token: string
}

async function discordRequest<T>({ method, path, body, token }: RequestOptions): Promise<T> {
  const response = await fetch(`${DISCORD_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Discord API error: ${response.status} - ${error}`)
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T
  }

  return response.json()
}

export function getMessage(
  env: Env,
  channelId: string,
  messageId: string
): Promise<DiscordMessage> {
  return discordRequest<DiscordMessage>({
    method: 'GET',
    path: `/channels/${channelId}/messages/${messageId}`,
    token: env.DISCORD_BOT_TOKEN,
  })
}

export function sendMessage(
  env: Env,
  channelId: string,
  content: string,
  replyTo?: { messageId: string; guildId?: string }
): Promise<DiscordMessage> {
  const body: Record<string, unknown> = {
    content,
    allowed_mentions: { parse: [] },
  }

  if (replyTo) {
    body.message_reference = {
      message_id: replyTo.messageId,
      channel_id: channelId,
      guild_id: replyTo.guildId,
    }
  }

  return discordRequest<DiscordMessage>({
    method: 'POST',
    path: `/channels/${channelId}/messages`,
    body,
    token: env.DISCORD_BOT_TOKEN,
  })
}

export function suppressEmbeds(env: Env, channelId: string, messageId: string): Promise<void> {
  return discordRequest({
    method: 'PATCH',
    path: `/channels/${channelId}/messages/${messageId}`,
    body: { flags: 1 << 2 }, // MessageFlags.SuppressEmbeds = 4
    token: env.DISCORD_BOT_TOKEN,
  })
}

export function editMessage(
  env: Env,
  channelId: string,
  messageId: string,
  content: string
): Promise<DiscordMessage> {
  return discordRequest<DiscordMessage>({
    method: 'PATCH',
    path: `/channels/${channelId}/messages/${messageId}`,
    body: { content },
    token: env.DISCORD_BOT_TOKEN,
  })
}

export async function registerCommands(env: Env): Promise<void> {
  const commands = [
    {
      name: 'enable',
      description: 'Enable embed services',
      options: [
        {
          type: 3, // STRING
          name: 'service',
          description: 'Service to enable',
          required: true,
          autocomplete: true,
        },
      ],
    },
    {
      name: 'disable',
      description: 'Disable embed services',
      options: [
        {
          type: 3, // STRING
          name: 'service',
          description: 'Service to disable',
          required: true,
          autocomplete: true,
        },
      ],
    },
    {
      name: 'settings',
      description: 'Shows the current embed settings for this server',
    },
    {
      name: 'endpoint',
      description: 'Configure custom embed endpoints',
      options: [
        {
          type: 1, // SUB_COMMAND
          name: 'set',
          description: 'Set a custom endpoint for a service',
          options: [
            {
              type: 3, // STRING
              name: 'service',
              description: 'Service to configure',
              required: true,
              autocomplete: true,
            },
            {
              type: 3, // STRING
              name: 'url',
              description: 'Custom endpoint domain (e.g., fxtwitter.com)',
              required: true,
            },
          ],
        },
        {
          type: 1, // SUB_COMMAND
          name: 'reset',
          description: 'Reset a service to its default endpoint',
          options: [
            {
              type: 3, // STRING
              name: 'service',
              description: 'Service to reset',
              required: true,
              autocomplete: true,
            },
          ],
        },
      ],
    },
  ]

  const response = await fetch(
    `${DISCORD_API_BASE}/applications/${env.DISCORD_APPLICATION_ID}/commands`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commands),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Discord API error: ${response.status} - ${error}`)
  }
}

export function getGatewayBot(
  env: Env
): Promise<{ url: string; shards: number; session_start_limit: unknown }> {
  return discordRequest({
    method: 'GET',
    path: '/gateway/bot',
    token: env.DISCORD_BOT_TOKEN,
  })
}
