import { TRPCError } from '@trpc/server';
import { and, asc, desc, eq, isNull, lt, sql } from 'drizzle-orm';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { activeAccessProcedure, moderatorProcedure, protectedProcedure, publicProcedure, router } from '../../trpc.js';
import { getDb } from '../../db/index.js';
import { forumCategories, forumProps, forumReplies, forumThreads, users } from '../../db/schema.js';

const PAGE_SIZE = 20;

export const forumRouter = router({
  categories: publicProcedure.query(async () => {
    const db = getDb();
    const rows = await db.select().from(forumCategories).orderBy(asc(forumCategories.order));
    return rows;
  }),

  // Cursor pagination on lastActivityAt, pinned threads always float first.
  threads: publicProcedure
    .input(
      z
        .object({
          categoryId: z.string().optional(),
          cursor: z.string().datetime().optional(),
          limit: z.number().int().min(1).max(50).optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = getDb();
      const limit = input?.limit ?? PAGE_SIZE;

      const conditions = [isNull(forumThreads.deletedAt)];
      if (input?.categoryId) {
        conditions.push(eq(forumThreads.categoryId, input.categoryId));
      }
      if (input?.cursor) {
        conditions.push(lt(forumThreads.lastActivityAt, new Date(input.cursor)));
      }

      const rows = await db
        .select({
          id: forumThreads.id,
          categoryId: forumThreads.categoryId,
          title: forumThreads.title,
          authorNick: users.nick,
          createdAt: forumThreads.createdAt,
          lastActivityAt: forumThreads.lastActivityAt,
          isPinned: forumThreads.isPinned,
          isLocked: forumThreads.isLocked,
          replyCount: sql<number>`(SELECT COUNT(*) FROM ${forumReplies} WHERE ${forumReplies.threadId} = ${forumThreads.id}) - 1`,
        })
        .from(forumThreads)
        .innerJoin(users, eq(forumThreads.authorId, users.id))
        .where(and(...conditions))
        .orderBy(desc(forumThreads.isPinned), desc(forumThreads.lastActivityAt))
        .limit(limit + 1);

      const page = rows.slice(0, limit);
      const last = page[page.length - 1];
      return {
        items: page.map((r) => ({
          id: r.id,
          categoryId: r.categoryId,
          title: r.title,
          authorNick: r.authorNick,
          createdAt: r.createdAt.toISOString(),
          lastActivityAt: r.lastActivityAt.toISOString(),
          isPinned: r.isPinned,
          isLocked: r.isLocked,
          replyCount: Number(r.replyCount),
        })),
        nextCursor: rows.length > limit && last ? last.lastActivityAt.toISOString() : null,
      };
    }),

  thread: publicProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ input }) => {
      const db = getDb();
      const [thread] = await db
        .select({
          id: forumThreads.id,
          categoryId: forumThreads.categoryId,
          title: forumThreads.title,
          authorNick: users.nick,
          createdAt: forumThreads.createdAt,
          isPinned: forumThreads.isPinned,
          isLocked: forumThreads.isLocked,
        })
        .from(forumThreads)
        .innerJoin(users, eq(forumThreads.authorId, users.id))
        .where(and(eq(forumThreads.id, input.id), isNull(forumThreads.deletedAt)));
      if (!thread) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Thread not found' });
      }

      const replyRows = await db
        .select({
          id: forumReplies.id,
          body: forumReplies.body,
          authorId: forumReplies.authorId,
          authorNick: users.nick,
          createdAt: forumReplies.createdAt,
          propsCount: forumReplies.propsCount,
        })
        .from(forumReplies)
        .innerJoin(users, eq(forumReplies.authorId, users.id))
        .where(eq(forumReplies.threadId, input.id))
        .orderBy(asc(forumReplies.createdAt));

      return {
        ...thread,
        createdAt: thread.createdAt.toISOString(),
        replies: replyRows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
      };
    }),

  // Creates the thread plus its opening post (the first reply carries the
  // body — forumThreads has no body column, matching the table shape given
  // in the brief).
  createThread: activeAccessProcedure
    .input(
      z.object({
        categoryId: z.string().min(1),
        title: z.string().min(1).max(255),
        body: z.string().min(1).max(4000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [category] = await db
        .select({ id: forumCategories.id })
        .from(forumCategories)
        .where(eq(forumCategories.id, input.categoryId));
      if (!category) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Unknown category' });
      }

      const threadId = randomUUID();
      await db.transaction(async (tx) => {
        await tx.insert(forumThreads).values({
          id: threadId,
          categoryId: input.categoryId,
          authorId: ctx.user.id,
          title: input.title,
        });
        await tx.insert(forumReplies).values({
          id: randomUUID(),
          threadId,
          authorId: ctx.user.id,
          body: input.body,
        });
      });

      return { id: threadId };
    }),

  reply: activeAccessProcedure
    .input(z.object({ threadId: z.string().min(1), body: z.string().min(1).max(4000) }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [thread] = await db
        .select({ id: forumThreads.id, isLocked: forumThreads.isLocked })
        .from(forumThreads)
        .where(and(eq(forumThreads.id, input.threadId), isNull(forumThreads.deletedAt)));
      if (!thread) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Thread not found' });
      }
      if (thread.isLocked) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Thread is locked' });
      }

      const id = randomUUID();
      await db.transaction(async (tx) => {
        await tx.insert(forumReplies).values({ id, threadId: input.threadId, authorId: ctx.user.id, body: input.body });
        await tx.update(forumThreads).set({ lastActivityAt: new Date() }).where(eq(forumThreads.id, input.threadId));
      });

      return { id };
    }),

  props: router({
    // One prop per user per reply — exact mirror of gallery.props.toggle.
    // Deliberately not a ranking points source (see docs/DECISIONS.md).
    toggle: protectedProcedure
      .input(z.object({ replyId: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const db = getDb();
        return await db.transaction(async (tx) => {
          const [reply] = await tx
            .select({ id: forumReplies.id })
            .from(forumReplies)
            .where(eq(forumReplies.id, input.replyId))
            .for('update');
          if (!reply) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Reply not found' });
          }

          const existing = await tx
            .select({ id: forumProps.id })
            .from(forumProps)
            .where(and(eq(forumProps.replyId, input.replyId), eq(forumProps.userId, ctx.user.id)));

          let active: boolean;
          if (existing.length > 0) {
            await tx.delete(forumProps).where(eq(forumProps.id, existing[0].id));
            await tx
              .update(forumReplies)
              .set({ propsCount: sql`GREATEST(${forumReplies.propsCount} - 1, 0)` })
              .where(eq(forumReplies.id, input.replyId));
            active = false;
          } else {
            await tx.insert(forumProps).values({ id: randomUUID(), replyId: input.replyId, userId: ctx.user.id });
            await tx
              .update(forumReplies)
              .set({ propsCount: sql`${forumReplies.propsCount} + 1` })
              .where(eq(forumReplies.id, input.replyId));
            active = true;
          }

          const [updated] = await tx
            .select({ propsCount: forumReplies.propsCount })
            .from(forumReplies)
            .where(eq(forumReplies.id, input.replyId));
          return { active, propsCount: updated.propsCount };
        });
      }),
  }),

  moderation: router({
    setPinned: moderatorProcedure
      .input(z.object({ id: z.string().min(1), pinned: z.boolean() }))
      .mutation(async ({ input }) => {
        const db = getDb();
        await db.update(forumThreads).set({ isPinned: input.pinned }).where(eq(forumThreads.id, input.id));
        return { id: input.id, isPinned: input.pinned };
      }),

    setLocked: moderatorProcedure
      .input(z.object({ id: z.string().min(1), locked: z.boolean() }))
      .mutation(async ({ input }) => {
        const db = getDb();
        await db.update(forumThreads).set({ isLocked: input.locked }).where(eq(forumThreads.id, input.id));
        return { id: input.id, isLocked: input.locked };
      }),

    delete: moderatorProcedure
      .input(z.object({ id: z.string().min(1) }))
      .mutation(async ({ input }) => {
        const db = getDb();
        await db.update(forumThreads).set({ deletedAt: new Date() }).where(eq(forumThreads.id, input.id));
        return { id: input.id };
      }),
  }),
});
