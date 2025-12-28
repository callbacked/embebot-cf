import type { Env } from '../types'
import { eq, getDb, schema } from '@embebot/db'
import { ALL_SERVICES } from './url-matcher'

// Column mapping for services (enabled/disabled)
const serviceColumns = {
  twitter: schema.serverSettings.twitter,
  x: schema.serverSettings.x,
  tiktok: schema.serverSettings.tiktok,
  instagram: schema.serverSettings.instagram,
  reddit: schema.serverSettings.reddit,
} as const

// Column mapping for custom endpoints
const endpointColumns = {
  twitter: schema.serverSettings.twitterEndpoint,
  x: schema.serverSettings.xEndpoint,
  tiktok: schema.serverSettings.tiktokEndpoint,
  instagram: schema.serverSettings.instagramEndpoint,
  reddit: schema.serverSettings.redditEndpoint,
} as const

type ServiceName = keyof typeof serviceColumns

export async function getGuildSettings(
  env: Env,
  guildId: string
): Promise<Record<string, boolean>> {
  const db = getDb(env.DATABASE_URL)
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
  const db = getDb(env.DATABASE_URL)
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
  const db = getDb(env.DATABASE_URL)
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

export async function getCustomEndpoints(
  env: Env,
  guildId: string
): Promise<Record<string, string | null>> {
  const db = getDb(env.DATABASE_URL)
  const result = await db
    .select()
    .from(schema.serverSettings)
    .where(eq(schema.serverSettings.guildId, guildId))
    .limit(1)

  if (result.length === 0) {
    return {}
  }

  const row = result[0]
  const endpoints: Record<string, string | null> = {}

  for (const service of ALL_SERVICES) {
    const endpointKey = `${service}Endpoint` as keyof typeof row
    endpoints[service] = row[endpointKey] as string | null
  }

  return endpoints
}

export async function setCustomEndpoint(
  env: Env,
  guildId: string,
  serviceName: string,
  endpoint: string
): Promise<void> {
  const db = getDb(env.DATABASE_URL)
  const endpointKey = `${serviceName}Endpoint`

  if (!(serviceName in endpointColumns)) {
    throw new Error(`Unknown service: ${serviceName}`)
  }

  await db
    .insert(schema.serverSettings)
    .values({ guildId, [endpointKey]: endpoint })
    .onConflictDoUpdate({
      target: schema.serverSettings.guildId,
      set: { [endpointKey]: endpoint },
    })
}

export async function resetCustomEndpoint(
  env: Env,
  guildId: string,
  serviceName: string
): Promise<void> {
  const db = getDb(env.DATABASE_URL)
  const endpointKey = `${serviceName}Endpoint`

  if (!(serviceName in endpointColumns)) {
    throw new Error(`Unknown service: ${serviceName}`)
  }

  await db
    .insert(schema.serverSettings)
    .values({ guildId, [endpointKey]: null })
    .onConflictDoUpdate({
      target: schema.serverSettings.guildId,
      set: { [endpointKey]: null },
    })
}
