import { redirect, error } from '@sveltejs/kit'
import type { PageServerLoad, Actions } from './$types'
import { getDb, schema } from '@embebot/db'
import { eq } from '@embebot/db'

const ALL_SERVICES = ['twitter', 'x', 'tiktok', 'instagram', 'reddit'] as const
type ServiceName = (typeof ALL_SERVICES)[number]

export const load: PageServerLoad = async ({ locals, params, platform }) => {
	if (!locals.user) {
		redirect(302, '/auth/discord')
	}

	// Check if user has access to this guild
	const guild = locals.user.guilds.find((g) => g.id === params.guildId)
	if (!guild) {
		error(403, 'You do not have access to this server')
	}

	const databaseUrl = platform?.env?.DATABASE_URL
	if (!databaseUrl) {
		error(500, 'Database not configured')
	}

	// Fetch current settings from database
	const db = getDb(databaseUrl)
	const result = await db
		.select()
		.from(schema.serverSettings)
		.where(eq(schema.serverSettings.guildId, params.guildId))
		.limit(1)

	// Build settings object (false = enabled, true = disabled in DB)
	const settings: Record<string, boolean> = {}
	for (const service of ALL_SERVICES) {
		// Default is enabled (false in DB means not disabled)
		settings[service] = true
		if (result.length > 0) {
			const row = result[0]
			const value = row[service as ServiceName]
			// If DB value is true, service is disabled
			settings[service] = value !== true
		}
	}

	return {
		guild,
		settings
	}
}

export const actions: Actions = {
	default: async ({ request, params, platform, locals }) => {
		if (!locals.user) {
			error(401, 'Unauthorized')
		}

		// Verify access
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

		// Build the values object - checkboxes only send value if checked
		const values: Record<string, boolean> = {}
		for (const service of ALL_SERVICES) {
			// If checkbox is checked, service is enabled (store false)
			// If checkbox is not checked, service is disabled (store true)
			values[service] = !formData.has(service)
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
