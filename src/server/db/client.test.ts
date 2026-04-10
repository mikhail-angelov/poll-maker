import { describe, expect, it } from 'vitest';
import { createDb } from './client';
import { migrate } from './migrate';
import { polls } from './schema';

describe('createDb', () => {
  it('exposes a Drizzle ORM database that maps schema tables', async () => {
    const db = createDb(':memory:');

    try {
      await migrate(db.sqlite);
      await db.db.insert(polls).values({
        id: 'poll-row',
        userId: 'u'.repeat(20),
        pollId: 'p'.repeat(20),
        adminHash: 'a'.repeat(20),
        name: 'Test',
        details: 'Details',
        questions: '[]',
        active: true,
        createdAt: '2026-04-10T00:00:00.000Z',
        updatedAt: '2026-04-10T00:00:00.000Z'
      });

      const rows = await db.db.select().from(polls);

      expect(rows).toEqual([
        expect.objectContaining({
          id: 'poll-row',
          userId: 'u'.repeat(20),
          pollId: 'p'.repeat(20),
          adminHash: 'a'.repeat(20),
          name: 'Test',
          active: true
        })
      ]);
    } finally {
      db.sqlite.close();
    }
  });
});
