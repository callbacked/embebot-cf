import { eq } from 'drizzle-orm'
import type { Env } from '../types'
import { getDb, schema } from '../db'
import { ALL_SERVICES } from './url-matcher'

// Column mapping for services
const serviceColumns = {
  twitter: schema.serverSettings.twitter,
  x: schema.serverSettings.x,
  tiktok: schema.serverSettings.tiktok,
  instagram: schema.serverSettings.instagram,
  reddit: schema.serverSettings.reddit,
} as const

type ServiceName = keyof typeof serviceColumns

export async function getGuildSettings(
  env: Env,
  guildId: string
): Promise<Record<string, boolean>> {
  const db = getDb(env)
  const result = await db
    .select()
    .from(schema.serverSettings)
    .where(eq(schema.serverSettings.guildId, guildId))
    .limit(1)

  if (result.length === 0) {
    return {}
  }

  const row = result[0]
  const settings: Record<string, boolean> = {}

  for (const service of ALL_SERVICES) {
    if (row[service as ServiceName] !== null) {
      settings[service] = row[service as ServiceName] as boolean
    }
  }

  return settings
}

export async function getEnabledServices(env: Env, guildId: string): Promise<Set<string>> {
  const settings = await getGuildSettings(env, guildId)
  const enabled = new Set<string>()

  for (const service of ALL_SERVICES) {
    // If not in settings or settings[service] is false, service is enabled
    // (disabled=true means service is off)
    if (!settings[service]) {
      enabled.add(service)
    }
  }

  return enabled
}

export async function setServiceEnabled(
  env: Env,
  guildId: string,
  serviceName: string,
  enabled: boolean
): Promise<void> {
  const db = getDb(env)
  const disabled = !enabled

  if (!(serviceName in serviceColumns)) {
    throw new Error(`Unknown service: ${serviceName}`)
  }

  await db
    .insert(schema.serverSettings)
    .values({ guildId, [serviceName]: disabled })
    .onConflictDoUpdate({
      target: schema.serverSettings.guildId,
      set: { [serviceName]: disabled },
    })
}

export async function setAllServicesEnabled(
  env: Env,
  guildId: string,
  enabled: boolean
): Promise<void> {
  const db = getDb(env)
  const disabled = !enabled

  const values: Record<string, boolean> = {}
  for (const service of ALL_SERVICES) {
    values[service] = disabled
  }

  await db
    .insert(schema.serverSettings)
    .values({ guildId, ...values })
    .onConflictDoUpdate({
      target: schema.serverSettings.guildId,
      set: values,
    })
}
