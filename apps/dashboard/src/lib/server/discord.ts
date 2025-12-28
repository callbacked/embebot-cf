const DISCORD_API_BASE = 'https://discord.com/api/v10'
const DISCORD_OAUTH_BASE = 'https://discord.com/api/oauth2'

// Permission flag for Administrator
const ADMINISTRATOR = 1 << 3

interface DiscordTokenResponse {
	access_token: string
	token_type: string
	expires_in: number
	refresh_token: string
	scope: string
}

interface DiscordUser {
	id: string
	username: string
	discriminator: string
	avatar: string | null
}

interface DiscordGuild {
	id: string
	name: string
	icon: string | null
	owner: boolean
	permissions: string
}

export function getOAuthUrl(clientId: string, redirectUri: string, state: string): string {
	const params = new URLSearchParams({
		client_id: clientId,
		redirect_uri: redirectUri,
		response_type: 'code',
		scope: 'identify guilds',
		state
	})

	return `${DISCORD_OAUTH_BASE}/authorize?${params}`
}

export async function exchangeCode(
	code: string,
	clientId: string,
	clientSecret: string,
	redirectUri: string
): Promise<DiscordTokenResponse> {
	const response = await fetch(`${DISCORD_OAUTH_BASE}/token`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body: new URLSearchParams({
			client_id: clientId,
			client_secret: clientSecret,
			grant_type: 'authorization_code',
			code,
			redirect_uri: redirectUri
		})
	})

	if (!response.ok) {
		const error = await response.text()
		throw new Error(`Discord token exchange failed: ${error}`)
	}

	return response.json()
}

export async function getUser(accessToken: string): Promise<DiscordUser> {
	const response = await fetch(`${DISCORD_API_BASE}/users/@me`, {
		headers: {
			Authorization: `Bearer ${accessToken}`
		}
	})

	if (!response.ok) {
		throw new Error('Failed to fetch user')
	}

	return response.json()
}

export async function getGuilds(accessToken: string): Promise<DiscordGuild[]> {
	const response = await fetch(`${DISCORD_API_BASE}/users/@me/guilds`, {
		headers: {
			Authorization: `Bearer ${accessToken}`
		}
	})

	if (!response.ok) {
		throw new Error('Failed to fetch guilds')
	}

	return response.json()
}

export function filterAdminGuilds(
	guilds: DiscordGuild[]
): Array<{ id: string; name: string; icon: string | null }> {
	return guilds
		.filter((guild) => {
			const permissions = BigInt(guild.permissions)
			return guild.owner || (permissions & BigInt(ADMINISTRATOR)) !== 0n
		})
		.map((guild) => ({
			id: guild.id,
			name: guild.name,
			icon: guild.icon
		}))
}

export function getGuildIconUrl(guildId: string, iconHash: string | null): string | null {
	if (!iconHash) return null
	return `https://cdn.discordapp.com/icons/${guildId}/${iconHash}.png`
}

export function getUserAvatarUrl(userId: string, avatarHash: string | null): string {
	if (!avatarHash) {
		// Default avatar based on user ID
		const index = Number(BigInt(userId) >> 22n) % 6
		return `https://cdn.discordapp.com/embed/avatars/${index}.png`
	}
	return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.png`
}
