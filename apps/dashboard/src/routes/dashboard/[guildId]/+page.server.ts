import { redirect, error } from '@sveltejs/kit'
import type { PageServerLoad, Actions } from './$types'
import { getDb, schema } from '@embebot/db'
import { eq } from '@embebot/db'

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
	const result = await db
		.select()
		.from(schema.serverSettings)
		.where(eq(schema.serverSettings.guildId, params.guildId))
		.limit(1)

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
		defaults: DEFAULT_ENDPOINTS
	}
}

export const actions: Actions = {
	default: async ({ request, params, platform, locals }) => {
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
	}
}
