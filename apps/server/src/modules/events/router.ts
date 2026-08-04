import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { publicProcedure, protectedProcedure, router } from '../../trpc.js';
import { getDb } from '../../db/index.js';
import { events } from '../../db/schema.js';

function serializeEvent(e: typeof events.$inferSelect) {
  return {
    id: e.id,
    name: e.name,
    city: e.city,
    type: e.type,
    date: e.date.toISOString(),
    status: e.status,
    createdAt: e.createdAt.toISOString(),
  };
}

export const eventsRouter = router({
  // Public: live events only.
  list: publicProcedure.query(async () => {
    const db = getDb();
    const rows = await db
      .select()
      .from(events)
      .where(eq(events.status, 'live'))
      .orderBy(events.date);
    return rows.map(serializeEvent);
  }),

  // Authenticated submission lands in the moderation queue as pending.
  submit: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        city: z.string().max(128).default(''),
        type: z.string().min(1).max(64).default('jam'),
        date: z.string().datetime(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const id = randomUUID();
      await db.insert(events).values({
        id,
        authorId: ctx.user.id,
        name: input.name,
        city: input.city,
        type: input.type,
        date: new Date(input.date),
        status: 'pending',
      });
      return { id, status: 'pending' as const };
    }),
});
