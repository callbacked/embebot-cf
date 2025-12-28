import type { DurableObjectNamespace } from '@cloudflare/workers-types'

export interface Env {
  // Durable Objects
  GATEWAY: DurableObjectNamespace

  // Environment variables
  DISCORD_API_VERSION: string

  // Secrets
  DISCORD_BOT_TOKEN: string
  DISCORD_PUBLIC_KEY: string
  DISCORD_APPLICATION_ID: string
  DATABASE_URL: string // Neon Postgres connection string
}
