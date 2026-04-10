import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const polls = sqliteTable('polls', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  pollId: text('poll_id').notNull(),
  adminHash: text('admin_hash').notNull(),
  name: text('name').notNull(),
  details: text('details').notNull(),
  questions: text('questions').notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
}, (table) => ({
  pollIdIdx: uniqueIndex('polls_poll_id_idx').on(table.pollId),
  adminHashIdx: uniqueIndex('polls_admin_hash_idx').on(table.adminHash)
}));

export const answers = sqliteTable('answers', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  pollId: text('poll_id').notNull(),
  userInfo: text('user_info').notNull(),
  answers: text('answers').notNull(),
  time: text('time').notNull(),
  status: text('status').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
}, (table) => ({
  answerSessionIdx: uniqueIndex('answers_poll_user_idx').on(table.pollId, table.userId)
}));
