import { drizzle, type MySql2Database } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { env } from '../env.js';
import * as schema from './schema.js';

export type Db = MySql2Database<typeof schema>;

let db: Db | null = null;

/**
 * Lazy singleton — the pool is created on first use so the server process
 * can boot (and be type-checked / smoke-tested) without a live database.
 */
export function getDb(): Db {
  if (!db) {
    const pool = mysql.createPool(env.databaseUrl);
    db = drizzle(pool, { schema, mode: 'default' });
  }
  return db;
}

export { schema };
