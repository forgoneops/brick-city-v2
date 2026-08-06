import { z } from 'zod';
import { and, desc, eq, like, or, sql } from 'drizzle-orm';
import { protectedProcedure, router } from '../../trpc.js';
import { getDb } from '../../db/index.js';
import { chatMessages, users } from '../../db/schema.js';
import { dmChannelFor, getHistory, isValidChannel } from './ws.js';

export const chatRouter = router({
  // Initial history for a room or DM channel — live updates then flow over
  // /ws/chat. DM channels are only readable by their two members (enforced
  // inside getHistory via canJoin).
  history: protectedProcedure
    .input(z.object({ channel: z.string().max(96), limit: z.number().int().min(1).max(100).default(50) }))
    .query(async ({ ctx, input }) => {
      if (!isValidChannel(input.channel)) return { items: [] };
      return { items: await getHistory(input.channel, ctx.user.id, input.limit) };
    }),

  // DM conversation list: every dm:* channel I've spoken in, with the other
  // party's nick + last message. Derived from chat_messages — no extra table.
  conversations: protectedProcedure.query(async ({ ctx }) => {
    const db = getDb();
    const prefix = 'dm:%';
    const rows = await db
      .select({
        channel: chatMessages.channel,
        body: chatMessages.body,
        createdAt: chatMessages.createdAt,
      })
      .from(chatMessages)
      .where(
        and(
          like(chatMessages.channel, prefix),
          or(
            sql`${chatMessages.channel} LIKE ${`dm:${ctx.user.id}:%`}`,
            sql`${chatMessages.channel} LIKE ${`dm:%:${ctx.user.id}`}`
          )
        )
      )
      .orderBy(desc(chatMessages.createdAt))
      .limit(500);

    const seen = new Map<string, { channel: string; body: string; createdAt: string }>();
    for (const r of rows) {
      if (!seen.has(r.channel)) {
        seen.set(r.channel, { channel: r.channel, body: r.body, createdAt: r.createdAt.toISOString() });
      }
    }

    const items = [];
    for (const conv of seen.values()) {
      const [a, b] = conv.channel.slice(3).split(':');
      const otherId = a === ctx.user.id ? b : a;
      const [other] = await db.select({ id: users.id, nick: users.nick }).from(users).where(eq(users.id, otherId)).limit(1);
      if (other) items.push({ ...conv, other });
    }
    return { items };
  }),

  // Open (or create) a DM channel with another user by id. Returns the
  // canonical channel key — messages then flow over history + the socket.
  openDm: protectedProcedure
    .input(z.object({ userId: z.string().length(36) }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id) {
        return { channel: null };
      }
      const db = getDb();
      const [other] = await db.select({ id: users.id }).from(users).where(eq(users.id, input.userId)).limit(1);
      if (!other) return { channel: null };
      return { channel: dmChannelFor(ctx.user.id, input.userId) };
    }),
});
