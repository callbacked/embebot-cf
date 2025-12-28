import type { Handle } from '@sveltejs/kit'
import { getSession } from '$lib/server/auth'

export const handle: Handle = async ({ event, resolve }) => {
	const jwtSecret = event.platform?.env?.JWT_SECRET
	if (jwtSecret) {
		event.locals.user = await getSession(event.cookies, jwtSecret)
	} else {
		event.locals.user = null
	}

	return resolve(event)
}
