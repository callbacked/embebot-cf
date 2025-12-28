import { redirect, error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import { getDb, schema } from '@embebot/db'
import { inArray } from '@embebot/db'

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (!locals.user) {
		redirect(302, '/auth/discord')
	}

	const databaseUrl = platform?.env?.DATABASE_URL
	if (!databaseUrl) {
		error(500, 'Database not configured')
	}

	// Check which guilds have settings (meaning bot has been used there)
	const guildIds = locals.user.guilds.map((g) => g.id)
	const db = getDb(databaseUrl)
	const existingSettings = await db
		.select({ guildId: schema.serverSettings.guildId })
		.from(schema.serverSettings)
		.where(inArray(schema.serverSettings.guildId, guildIds))

	const guildsWithBot = new Set(existingSettings.map((s) => s.guildId))

	return {
		user: {
			id: locals.user.id,
			username: locals.user.username,
			avatar: locals.user.avatar
		},
		guilds: locals.user.guilds.map((g) => ({
			...g,
			hasBot: guildsWithBot.has(g.id)
		}))
	}
}
