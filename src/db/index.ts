import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import type { Env } from '../types'
import * as schema from './schema'

export { schema }

export function getDb(env: Env) {
  const sql = neon(env.DATABASE_URL)
  return drizzle(sql, { schema })
}
