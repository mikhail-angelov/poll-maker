import { createDb } from './client';

export async function migrate(db: any) {
  // Create polls table
  await db.run(`
    CREATE TABLE IF NOT EXISTS polls (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      poll_id TEXT NOT NULL,
      admin_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      details TEXT NOT NULL,
      questions TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // Create polls_poll_id_idx unique index
  await db.run(`
    CREATE UNIQUE INDEX IF NOT EXISTS polls_poll_id_idx 
    ON polls(poll_id)
  `);

  // Create polls_admin_hash_idx unique index
  await db.run(`
    CREATE UNIQUE INDEX IF NOT EXISTS polls_admin_hash_idx 
    ON polls(admin_hash)
  `);

  // Create answers table
  await db.run(`
    CREATE TABLE IF NOT EXISTS answers (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      poll_id TEXT NOT NULL,
      user_info TEXT NOT NULL,
      answers TEXT NOT NULL,
      time TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // Create answers_poll_user_idx unique index
  await db.run(`
    CREATE UNIQUE INDEX IF NOT EXISTS answers_poll_user_idx 
    ON answers(poll_id, user_id)
  `);

  console.log('Database migration completed');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const db = createDb();
  migrate(db.db)
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}