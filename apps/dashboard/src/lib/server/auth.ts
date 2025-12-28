import * as jose from 'jose'
import type { Cookies } from '@sveltejs/kit'

const COOKIE_NAME = 'embebot_session'

interface UserPayload {
	id: string
	username: string
	avatar: string | null
	guilds: Array<{
		id: string
		name: string
		icon: string | null
	}>
}

export async function createToken(user: UserPayload, jwtSecret: string): Promise<string> {
	const secret = new TextEncoder().encode(jwtSecret)

	return await new jose.SignJWT({
		id: user.id,
		username: user.username,
		avatar: user.avatar,
		guilds: user.guilds
	})
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuedAt()
		.setExpirationTime('7d')
		.sign(secret)
}

export async function verifyToken(token: string, jwtSecret: string): Promise<UserPayload | null> {
	try {
		const secret = new TextEncoder().encode(jwtSecret)
		const { payload } = await jose.jwtVerify(token, secret)

		return {
			id: payload.id as string,
			username: payload.username as string,
			avatar: payload.avatar as string | null,
			guilds: payload.guilds as UserPayload['guilds']
		}
	} catch {
		return null
	}
}

export async function getSession(
	cookies: Cookies,
	jwtSecret: string
): Promise<UserPayload | null> {
	const token = cookies.get(COOKIE_NAME)
	if (!token) return null

	return await verifyToken(token, jwtSecret)
}

export function setSessionCookie(cookies: Cookies, token: string): void {
	cookies.set(COOKIE_NAME, token, {
		path: '/',
		httpOnly: true,
		secure: true,
		sameSite: 'lax',
		maxAge: 60 * 60 * 24 * 7 // 7 days
	})
}

export function clearSessionCookie(cookies: Cookies): void {
	cookies.delete(COOKIE_NAME, { path: '/' })
}
