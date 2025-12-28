import { redirect, error } from '@sveltejs/kit'
import type { PageServerLoad, Actions } from './$types'
import { getDb, schema, eq, and } from '@embebot/db'

const ALL_SERVICES = ['twitter', 'x', 'tiktok', 'instagram', 'reddit'] as const
type ServiceName = (typeof ALL_SERVICES)[number]

const DEFAULT_ENDPOINTS: Record<ServiceName, string> = {
	twitter: 'vxtwitter.com',
	x: 'vxtwitter.com',
	tiktok: 'vxtiktok.com',
	instagram: 'ddinstagram.com',
	reddit: 'vxreddit.com'
}

export const load: PageServerLoad = async ({ locals, params, platform }) => {
	if (!locals.user) {
		redirect(302, '/auth/discord')
	}

	const guild = locals.user.guilds.find((g) => g.id === params.guildId)
	if (!guild) {
		error(403, 'You do not have access to this server')
	}

	const databaseUrl = platform?.env?.DATABASE_URL
	if (!databaseUrl) {
		error(500, 'Database not configured')
	}

	const db = getDb(databaseUrl)

	// Fetch server settings and custom services in parallel
	const [result, customServices] = await Promise.all([
		db
			.select()
			.from(schema.serverSettings)
			.where(eq(schema.serverSettings.guildId, params.guildId))
			.limit(1),
		db
			.select()
			.from(schema.customServices)
			.where(eq(schema.customServices.guildId, params.guildId))
	])

	const settings: Record<string, boolean> = {}
	const endpoints: Record<string, string> = {}

	for (const service of ALL_SERVICES) {
		settings[service] = true
		endpoints[service] = DEFAULT_ENDPOINTS[service]

		if (result.length > 0) {
			const row = result[0]
			const value = row[service as ServiceName]
			settings[service] = value !== true

			// Get custom endpoint if set
			const endpointKey = `${service}Endpoint` as keyof typeof row
			const customEndpoint = row[endpointKey]
			if (customEndpoint && typeof customEndpoint === 'string') {
				endpoints[service] = customEndpoint
			}
		}
	}

	return {
		guild,
		settings,
		endpoints,
		defaults: DEFAULT_ENDPOINTS,
		customServices
	}
}

// Built-in service domains that can't be used as custom services
const BUILTIN_DOMAINS = ['twitter.com', 'x.com', 'tiktok.com', 'instagram.com', 'reddit.com']

// Validate and normalize domain
function normalizeDomain(input: string): string | null {
	let domain = input.trim().toLowerCase()
	// Remove protocol if present
	domain = domain.replace(/^https?:\/\//, '')
	// Remove trailing slash
	domain = domain.replace(/\/$/, '')
	// Remove path if any
	domain = domain.split('/')[0]
	// Basic validation
	if (!domain || domain.length < 3 || !domain.includes('.')) {
		return null
	}
	return domain
}

function isBuiltinDomain(domain: string): boolean {
	return BUILTIN_DOMAINS.some(
		(builtin) => domain === builtin || domain.endsWith('.' + builtin)
	)
}

export const actions: Actions = {
	saveSettings: async ({ request, params, platform, locals }) => {
		if (!locals.user) {
			error(401, 'Unauthorized')
		}

		const guild = locals.user.guilds.find((g) => g.id === params.guildId)
		if (!guild) {
			error(403, 'You do not have access to this server')
		}

		const databaseUrl = platform?.env?.DATABASE_URL
		if (!databaseUrl) {
			error(500, 'Database not configured')
		}

		const formData = await request.formData()
		const db = getDb(databaseUrl)

		const values: Record<string, boolean | string | null> = {}

		for (const service of ALL_SERVICES) {
			// Service enabled/disabled
			values[service] = !formData.has(service)

			// Custom endpoint (null if empty or same as default)
			const endpoint = formData.get(`${service}Endpoint`)?.toString().trim() || null
			const endpointKey = `${service}Endpoint`

			if (endpoint && endpoint !== DEFAULT_ENDPOINTS[service]) {
				values[endpointKey] = endpoint
			} else {
				values[endpointKey] = null
			}
		}

		await db
			.insert(schema.serverSettings)
			.values({ guildId: params.guildId, ...values })
			.onConflictDoUpdate({
				target: schema.serverSettings.guildId,
				set: values
			})

		return { success: true }
	},

	addCustomService: async ({ request, params, platform, locals }) => {
		if (!locals.user) {
			error(401, 'Unauthorized')
		}

		const guild = locals.user.guilds.find((g) => g.id === params.guildId)
		if (!guild) {
			error(403, 'You do not have access to this server')
		}

		const databaseUrl = platform?.env?.DATABASE_URL
		if (!databaseUrl) {
			error(500, 'Database not configured')
		}

		const formData = await request.formData()
		const matchDomain = normalizeDomain(formData.get('matchDomain')?.toString() || '')
		const replaceDomain = normalizeDomain(formData.get('replaceDomain')?.toString() || '')

		if (!matchDomain || !replaceDomain) {
			return { error: 'Invalid domain format' }
		}

		if (isBuiltinDomain(matchDomain)) {
			return { error: 'This domain is already handled by a built-in service' }
		}

		const db = getDb(databaseUrl)

		await db
			.insert(schema.customServices)
			.values({
				guildId: params.guildId,
				matchDomain,
				replaceDomain,
				enabled: true
			})
			.onConflictDoUpdate({
				target: [schema.customServices.guildId, schema.customServices.matchDomain],
				set: { replaceDomain }
			})

		return { success: true }
	},

	deleteCustomService: async ({ request, params, platform, locals }) => {
		if (!locals.user) {
			error(401, 'Unauthorized')
		}

		const guild = locals.user.guilds.find((g) => g.id === params.guildId)
		if (!guild) {
			error(403, 'You do not have access to this server')
		}

		const databaseUrl = platform?.env?.DATABASE_URL
		if (!databaseUrl) {
			error(500, 'Database not configured')
		}

		const formData = await request.formData()
		const matchDomain = formData.get('matchDomain')?.toString()

		if (!matchDomain) {
			return { error: 'Missing match domain' }
		}

		const db = getDb(databaseUrl)

		await db
			.delete(schema.customServices)
			.where(
				and(
					eq(schema.customServices.guildId, params.guildId),
					eq(schema.customServices.matchDomain, matchDomain)
				)
			)

		return { success: true }
	},

	toggleCustomService: async ({ request, params, platform, locals }) => {
		if (!locals.user) {
			error(401, 'Unauthorized')
		}

		const guild = locals.user.guilds.find((g) => g.id === params.guildId)
		if (!guild) {
			error(403, 'You do not have access to this server')
		}

		const databaseUrl = platform?.env?.DATABASE_URL
		if (!databaseUrl) {
			error(500, 'Database not configured')
		}

		const formData = await request.formData()
		const matchDomain = formData.get('matchDomain')?.toString()
		const enabled = formData.get('enabled') === 'true'

		if (!matchDomain) {
			return { error: 'Missing match domain' }
		}

		const db = getDb(databaseUrl)

		await db
			.update(schema.customServices)
			.set({ enabled })
			.where(
				and(
					eq(schema.customServices.guildId, params.guildId),
					eq(schema.customServices.matchDomain, matchDomain)
				)
			)

		return { success: true }
	}
}
