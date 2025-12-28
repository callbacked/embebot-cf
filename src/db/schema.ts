import { pgTable, text, boolean } from 'drizzle-orm/pg-core'

export const serverSettings = pgTable('server_settings', {
  guildId: text('guild_id').primaryKey(),
  twitter: boolean('twitter').default(false),
  x: boolean('x').default(false),
  tiktok: boolean('tiktok').default(false),
  instagram: boolean('instagram').default(false),
  reddit: boolean('reddit').default(false),
})

export type ServerSettings = typeof serverSettings.$inferSelect
export type NewServerSettings = typeof serverSettings.$inferInsert
