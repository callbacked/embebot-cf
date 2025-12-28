import { pgTable, text, boolean } from 'drizzle-orm/pg-core'

export const serverSettings = pgTable('server_settings', {
  guildId: text('guild_id').primaryKey(),
  // Service enabled/disabled (true = disabled)
  twitter: boolean('twitter').default(false),
  x: boolean('x').default(false),
  tiktok: boolean('tiktok').default(false),
  instagram: boolean('instagram').default(false),
  reddit: boolean('reddit').default(false),
  // Custom endpoints (null = use default)
  twitterEndpoint: text('twitter_endpoint'),
  xEndpoint: text('x_endpoint'),
  tiktokEndpoint: text('tiktok_endpoint'),
  instagramEndpoint: text('instagram_endpoint'),
  redditEndpoint: text('reddit_endpoint'),
})

export type ServerSettings = typeof serverSettings.$inferSelect
export type NewServerSettings = typeof serverSettings.$inferInsert
