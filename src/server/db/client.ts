import { drizzle } from 'drizzle-orm/sqlite-proxy';
import sqlite3 from 'sqlite3';
import { polls, answers } from './schema';

export function createDb(filename = process.env.SQLITE_FILE ?? 'poll-maker.sqlite') {
  const sqlite = new sqlite3.Database(filename);

  const sqliteProxy = {
    run(sql: string, params: unknown[] = []) {
      return new Promise<void>((resolve, reject) => {
        sqlite.run(sql, params, (error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    },
    all(sql: string, params: unknown[] = []) {
      return new Promise<unknown[][]>((resolve, reject) => {
        sqlite.all(sql, params, (error, rows) => {
          if (error) reject(error);
          else resolve(rows.map((row) => Object.values(row as Record<string, unknown>)));
        });
      });
    },
    get(sql: string, params: unknown[] = []) {
      return new Promise<unknown[] | undefined>((resolve, reject) => {
        sqlite.get(sql, params, (error, row) => {
          if (error) reject(error);
          else resolve(row ? Object.values(row as Record<string, unknown>) : undefined);
        });
      });
    }
  };

  const db = drizzle(async (sql, params, method) => {
    try {
      if (method === 'run') {
        await sqliteProxy.run(sql, params as unknown[]);
        return { rows: [] };
      } else if (method === 'all') {
        const rows = await sqliteProxy.all(sql, params as unknown[]);
        return { rows };
      } else if (method === 'get') {
        const row = await sqliteProxy.get(sql, params as unknown[]);
        return { rows: row ? [row] : [] };
      } else if (method === 'values') {
        const rows = await sqliteProxy.all(sql, params as unknown[]);
        return { rows };
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
