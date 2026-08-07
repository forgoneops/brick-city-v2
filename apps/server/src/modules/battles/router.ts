import { randomUUID } from 'node:crypto';
import { desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { activeAccessProcedure, adminProcedure, publicProcedure, router } from '../../trpc.js';
import { getDb } from '../../db/index.js';
import { battles, battleStatusValues, battleSubmissions } from '../../db/schema.js';

export const battlesRouter = router({
  // Public: every battle (optionally filtered by status) with a live
  // participant count from battleSubmissions — no separate admin-only list,
  // the admin panel reuses this with no status filter.
  list: publicProcedure
    .input(
      z
        .object({
          status: z.enum(battleStatusValues).optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = getDb();
      const rows = await db
        .select({
          id: battles.id,
          title: battles.title,
          status: battles.status,
          closesAt: battles.closesAt,
          createdAt: battles.createdAt,
          participantCount: sql<number>`COUNT(${battleSubmissions.id})`,
        })
        .from(battles)
        .leftJoin(battleSubmissions, eq(battleSubmissions.battleId, battles.id))
        .where(input?.status ? eq(battles.status, input.status) : undefined)
        .groupBy(battles.id)
        .orderBy(desc(battles.closesAt));

      return rows.map((r) => ({
        id: r.id,
        title: r.title,
        status: r.status,
        closesAt: r.closesAt.toISOString(),
        createdAt: r.createdAt.toISOString(),
        participantCount: Number(r.participantCount),
      }));
    }),

  // Paywall-gated the same way map.submit/forum.createThread are — one
  // piece per writer per battle (battle_submissions_unique).
  submit: activeAccessProcedure
    .input(
      z.object({
        battleId: z.string().uuid(),
        imageUrl: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [battle] = await db.select().from(battles).where(eq(battles.id, input.battleId));
      if (!battle) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Battle not found' });
      }
      if (battle.status !== 'active' || battle.closesAt.getTime() <= Date.now()) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Battle is not open for submissions' });
      }

      const id = randomUUID();
      try {
        await db.insert(battleSubmissions).values({
          id,
          battleId: input.battleId,
          userId: ctx.user.id,
          imageUrl: input.imageUrl,
        });
      } catch (err) {
        // drizzle-orm wraps the real mysql2 driver error in a DrizzleQueryError,
        // with the original (carrying .code) as .cause — not on the thrown
        // error itself. MySQL unique-index violation on (battle_id, user_id)
        // is surfaced as CONFLICT rather than a raw 500.
        const cause = (err as { cause?: { code?: string } }).cause;
        if (cause?.code === 'ER_DUP_ENTRY') {
          throw new TRPCError({ code: 'CONFLICT', message: 'You already submitted to this battle' });
        }
        throw err;
      }

      return { id, status: 'submitted' as const };
    }),

  adminCreate: adminProcedure
    .input(
      z.object({
        title: z.string().min(1).max(255),
        status: z.enum(battleStatusValues).default('upcoming'),
        closesAt: z.string().datetime(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const id = randomUUID();
      await db.insert(battles).values({
        id,
        title: input.title,
        status: input.status,
        closesAt: new Date(input.closesAt),
      });
      return { id };
    }),

  adminUpdate: adminProcedure
    .input(
      z.object({
        id: z.string().min(1),
        title: z.string().min(1).max(255),
        status: z.enum(battleStatusValues),
        closesAt: z.string().datetime(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const [existing] = await db.select().from(battles).where(eq(battles.id, input.id));
      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Battle not found' });
      }
      await db
        .update(battles)
        .set({ title: input.title, status: input.status, closesAt: new Date(input.closesAt) })
        .where(eq(battles.id, input.id));
      return { id: input.id };
    }),
});
