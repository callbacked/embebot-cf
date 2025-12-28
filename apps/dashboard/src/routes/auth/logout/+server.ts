import { redirect } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { clearSessionCookie } from '$lib/server/auth'

export const GET: RequestHandler = async ({ cookies }) => {
	clearSessionCookie(cookies)
	redirect(302, '/')
}
