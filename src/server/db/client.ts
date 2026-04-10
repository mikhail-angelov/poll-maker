import { drizzle } from 'drizzle-orm/sqlite-proxy';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import { polls, answers } from './schema';

export function createDb(filename = process.env.SQLITE_FILE ?? 'poll-maker.sqlite') {
  const sqlite = new sqlite3.Database(filename);
  
  // Promisify sqlite methods
  const run = promisify(sqlite.run.bind(sqlite));
  const all = promisify(sqlite.all.bind(sqlite));
  const get = promisify(sqlite.get.bind(sqlite));
  
  const db = drizzle(async (sql, params, method) => {
    try {
      if (method === 'run') {
        const result = await run(sql, ...(params as any[]));
        return { rows: [] };
      } else if (method === 'all') {
        const rows = await all(sql, ...(params as any[]));
        return { rows };
      } else if (method === 'get') {
        const row = await get(sql, ...(params as any[]));
        return { rows: row ? [row] : [] };
      }
      return { rows: [] };
    } catch (error) {
      console.error('Database error:', error);
      throw error;
    }
  }, { schema: { polls, answers } });

  return { sqlite, db, polls, answers };
}

export type Db = ReturnType<typeof createDb>;