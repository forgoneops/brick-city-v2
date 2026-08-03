import { drizzle, type MySql2Database } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { env } from '../env.js';
import * as schema from './schema.js';

let dbInstance: MySql2Database<typeof schema> | null = null;

export function getDb(): MySql2Database<typeof schema> {
  if (!dbInstance) {
    if (!env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not configured');
    }
    const pool = mysql.createPool({ uri: env.DATABASE_URL });
    dbInstance = drizzle(pool, { schema, mode: 'default' });
  }
  return dbInstance;
}

export type Database = ReturnType<typeof getDb>;
