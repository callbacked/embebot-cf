// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
			user: {
				id: string
				username: string
				avatar: string | null
				guilds: Array<{
					id: string
					name: string
					icon: string | null
				}>
			} | null
		}
		interface Platform {
			env: {
				DISCORD_CLIENT_ID: string
				DISCORD_CLIENT_SECRET: string
				JWT_SECRET: string
				DATABASE_URL: string
			}
		}
	}
}

export {};
