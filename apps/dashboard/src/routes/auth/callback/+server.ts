import { redirect, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { exchangeCode, getUser, getGuilds, filterAdminGuilds } from '$lib/server/discord'
import { createToken, setSessionCookie } from '$lib/server/auth'

export const GET: RequestHandler = async ({ url, platform, cookies }) => {
	const code = url.searchParams.get('code')
	const state = url.searchParams.get('state')
	const storedState = cookies.get('oauth_state')

	// Clear the state cookie
	cookies.delete('oauth_state', { path: '/' })

	// Validate state to prevent CSRF
	if (!state || state !== storedState) {
		error(400, 'Invalid state parameter')
	}

	if (!code) {
		error(400, 'Missing authorization code')
	}

	const env = platform?.env
	if (!env?.DISCORD_CLIENT_ID || !env?.DISCORD_CLIENT_SECRET || !env?.JWT_SECRET) {
		error(500, 'Server configuration error')
	}

	const redirectUri = `${url.origin}/auth/callback`

	// Exchange code for tokens
	const tokens = await exchangeCode(
		code,
		env.DISCORD_CLIENT_ID,
		env.DISCORD_CLIENT_SECRET,
		redirectUri
	)

	// Fetch user info and guilds in parallel
	const [user, guilds] = await Promise.all([
		getUser(tokens.access_token),
		getGuilds(tokens.access_token)
	])

	// Filter to only guilds where user is admin
	const adminGuilds = filterAdminGuilds(guilds)

	// Create JWT
	const token = await createToken(
		{
			id: user.id,
			username: user.username,
			avatar: user.avatar,
			guilds: adminGuilds
		},
		env.JWT_SECRET
	)

	// Set session cookie
	setSessionCookie(cookies, token)

	redirect(302, '/dashboard')
}
