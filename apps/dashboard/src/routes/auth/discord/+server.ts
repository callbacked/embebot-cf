import { redirect } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { getOAuthUrl } from '$lib/server/discord'

export const GET: RequestHandler = async ({ url, platform, cookies }) => {
	const clientId = platform?.env?.DISCORD_CLIENT_ID
	if (!clientId) {
		throw new Error('DISCORD_CLIENT_ID not configured')
	}

	// Generate state for CSRF protection
	const state = crypto.randomUUID()
	cookies.set('oauth_state', state, {
		path: '/',
		httpOnly: true,
		secure: true,
		sameSite: 'lax',
		maxAge: 60 * 10 // 10 minutes
	})

	// Build redirect URI from current request
	const redirectUri = `${url.origin}/auth/callback`
	const authUrl = getOAuthUrl(clientId, redirectUri, state)

	redirect(302, authUrl)
}
