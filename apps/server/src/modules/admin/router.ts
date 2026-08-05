import { TRPCError } from '@trpc/server';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { adminProcedure, protectedProcedure, router } from '../../trpc.js';
import { getDb } from '../../db/index.js';
import {
  events,
  paymentProviderIdValues,
  paymentProviders,
  photos,
  pins,
  reports,
  reportTargetTypeValues,
  subscriptions,
  users,
  walletTransactions,
} from '../../db/schema.js';
import { ROLES } from '@bcv2/shared';
import { closeActiveSeasonAndOpenNext, runNightlyRecalc } from '../ranking/scoring.js';

export const adminRouter = router({
  // Dashboard counters.
  stats: adminProcedure.query(async () => {
    const db = getDb();
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [userCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(users);
    const [uploadsToday] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(photos)
      .where(gte(photos.createdAt, dayAgo));
    const [openReports] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(reports)
      .where(eq(reports.status, 'open'));
    const [pendingPins] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(pins)
      .where(eq(pins.status, 'pending'));

    return {
      users: Number(userCount.count),
      uploadsPerDay: Number(uploadsToday.count),
      openReports: Number(openReports.count),
      pendingPins: Number(pendingPins.count),
    };
  }),

  reports: router({
    list: adminProcedure
      .input(z.object({ status: z.enum(['open', 'resolved', 'dismissed']).default('open') }).optional())
      .query(async ({ input }) => {
        const db = getDb();
        const status = input?.status ?? 'open';
        const rows = await db
          .select()
          .from(reports)
          .where(eq(reports.status, status))
          .orderBy(desc(reports.createdAt));
        return rows.map((r) => ({
          id: r.id,
          targetType: r.targetType,
          targetId: r.targetId,
          reporterId: r.reporterId,
          reason: r.reason,
          aiFlag: r.aiFlag,
          status: r.status,
          createdAt: r.createdAt.toISOString(),
        }));
      }),

    // delete = remove the target (photo -> status removed) and resolve;
    // warn = resolve, target untouched; dismiss = mark dismissed.
    resolve: adminProcedure
      .input(
        z.object({
          id: z.string().min(1),
          action: z.enum(['delete', 'warn', 'dismiss']),
        })
      )
      .mutation(async ({ input }) => {
        const db = getDb();
        return await db.transaction(async (tx) => {
          const [report] = await tx
            .select()
            .from(reports)
            .where(eq(reports.id, input.id))
            .for('update');
          if (!report) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Report not found' });
          }

          if (input.action === 'delete' && report.targetType === 'photo') {
            await tx
              .update(photos)
              .set({ status: 'removed' })
              .where(eq(photos.id, report.targetId));
          }

          const status = input.action === 'dismiss' ? 'dismissed' : 'resolved';
          await tx.update(reports).set({ status }).where(eq(reports.id, input.id));
          return { id: input.id, status };
        });
      }),

    // Any signed-in user can file a report; lands in the open queue.
    create: protectedProcedure
      .input(
        z.object({
          targetType: z.enum(reportTargetTypeValues),
          targetId: z.string().min(1),
          reason: z.string().min(1).max(2000),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const db = getDb();
        const id = randomUUID();
        await db.insert(reports).values({
          id,
          targetType: input.targetType,
          targetId: input.targetId,
          reporterId: ctx.user.id,
          reason: input.reason,
          status: 'open',
        });
        return { id, status: 'open' as const };
      }),
  }),

  pins: router({
    queue: adminProcedure.query(async () => {
      const db = getDb();
      const rows = await db
        .select()
        .from(pins)
        .where(eq(pins.status, 'pending'))
        .orderBy(pins.createdAt);
      return rows.map((p) => ({
        id: p.id,
        name: p.name,
        city: p.city,
        type: p.type,
        lat: p.lat,
        lng: p.lng,
        membersOnly: p.membersOnly,
        status: p.status,
        createdAt: p.createdAt.toISOString(),
      }));
    }),

    setStatus: adminProcedure
      .input(z.object({ id: z.string().min(1), status: z.enum(['live', 'rejected']) }))
      .mutation(async ({ input }) => {
        const db = getDb();
        const [pin] = await db.select().from(pins).where(eq(pins.id, input.id));
        if (!pin) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Pin not found' });
        }
        await db.update(pins).set({ status: input.status }).where(eq(pins.id, input.id));
        return { id: input.id, status: input.status };
      }),
  }),

  events: router({
    queue: adminProcedure.query(async () => {
      const db = getDb();
      const rows = await db
        .select()
        .from(events)
        .where(eq(events.status, 'pending'))
        .orderBy(events.createdAt);
      return rows.map((e) => ({
        id: e.id,
        name: e.name,
        city: e.city,
        type: e.type,
        date: e.date.toISOString(),
        status: e.status,
        createdAt: e.createdAt.toISOString(),
      }));
    }),

    setStatus: adminProcedure
      .input(z.object({ id: z.string().min(1), status: z.enum(['live', 'rejected']) }))
      .mutation(async ({ input }) => {
        const db = getDb();
        const [event] = await db.select().from(events).where(eq(events.id, input.id));
        if (!event) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Event not found' });
        }
        await db.update(events).set({ status: input.status }).where(eq(events.id, input.id));
        return { id: input.id, status: input.status };
      }),
  }),

  users: router({
    list: adminProcedure.query(async () => {
      const db = getDb();
      const rows = await db.select().from(users).orderBy(desc(users.createdAt));
      return rows.map((u) => ({
        id: u.id,
        email: u.email,
        nick: u.nick,
        role: u.role,
        walletBalanceCents: u.walletBalanceCents,
        trialEndsAt: u.trialEndsAt?.toISOString() ?? null,
        createdAt: u.createdAt.toISOString(),
      }));
    }),

    setRole: adminProcedure
      .input(z.object({ id: z.string().min(1), role: z.enum(ROLES) }))
      .mutation(async ({ input }) => {
        const db = getDb();
        const [user] = await db.select().from(users).where(eq(users.id, input.id));
        if (!user) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
        }
        await db.update(users).set({ role: input.role }).where(eq(users.id, input.id));
        return { id: input.id, role: input.role };
      }),
  }),

  ranking: router({
    // Nightly-job stub, callable on demand for ops/testing (docs/DECISIONS.md).
    recalculateAll: adminProcedure.mutation(async () => {
      const count = await runNightlyRecalc();
      return { recalculated: count };
    }),

    // Deactivates the current season (its points stay frozen, all-time keeps
    // accumulating regardless) and opens a new one starting now.
    closeSeason: adminProcedure
      .input(z.object({ nextName: z.string().min(1).max(128) }))
      .mutation(async ({ input }) => {
        const season = await closeActiveSeasonAndOpenNext(input.nextName);
        return { id: season.id, name: season.name, startsAt: season.startsAt.toISOString() };
      }),
  }),

  subscriptions: router({
    // invites sent, active trials, paying users, wallet volume, MRR.
    stats: adminProcedure.query(async () => {
      const db = getDb();
      const [invitesSent] = await db.select({ count: sql<number>`COUNT(*)` }).from(users);
      const [trialing] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(subscriptions)
        .where(eq(subscriptions.status, 'trialing'));
      const [active] = await db
        .select({ count: sql<number>`COUNT(*)`, mrrCents: sql<number>`COALESCE(SUM(${subscriptions.priceCents}), 0)` })
        .from(subscriptions)
        .where(eq(subscriptions.status, 'active'));
      const [walletVolume] = await db
        .select({ cents: sql<number>`COALESCE(SUM(${walletTransactions.amountCents}), 0)` })
        .from(walletTransactions)
        .where(eq(walletTransactions.type, 'topup'));

      return {
        activeTrials: Number(trialing.count),
        payingUsers: Number(active.count),
        walletVolumeCents: Number(walletVolume.cents),
        mrrCents: Number(active.mrrCents),
        invitesSent: Number(invitesSent.count),
      };
    }),
  }),

  wallet: router({
    transactions: adminProcedure
      .input(
        z
          .object({ cursor: z.string().datetime().optional(), limit: z.number().int().min(1).max(50).optional() })
          .optional()
      )
      .query(async ({ input }) => {
        const db = getDb();
        const limit = input?.limit ?? 20;
        const conditions = input?.cursor
          ? [sql`${walletTransactions.createdAt} < ${new Date(input.cursor)}`]
          : [];

        const rows = await db
          .select({
            id: walletTransactions.id,
            userId: walletTransactions.userId,
            nick: users.nick,
            amountCents: walletTransactions.amountCents,
            type: walletTransactions.type,
            provider: walletTransactions.provider,
            status: walletTransactions.status,
            createdAt: walletTransactions.createdAt,
          })
          .from(walletTransactions)
          .innerJoin(users, eq(walletTransactions.userId, users.id))
          .where(conditions.length ? conditions[0] : undefined)
          .orderBy(desc(walletTransactions.createdAt))
          .limit(limit + 1);

        const page = rows.slice(0, limit);
        const last = page[page.length - 1];
        return {
          items: page.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
          nextCursor: rows.length > limit && last ? last.createdAt.toISOString() : null,
        };
      }),
  }),

  providers: router({
    list: adminProcedure.query(async () => {
      const db = getDb();
      return db.select().from(paymentProviders);
    }),

    setEnabled: adminProcedure
      .input(z.object({ id: z.enum(paymentProviderIdValues), enabled: z.boolean() }))
      .mutation(async ({ input }) => {
        const db = getDb();
        await db
          .insert(paymentProviders)
          .values({ id: input.id, enabled: input.enabled })
          .onDuplicateKeyUpdate({ set: { enabled: input.enabled } });
        return { id: input.id, enabled: input.enabled };
      }),
  }),

  // Bot control stays a stub (Phase 5) but surfaces accounts flagged by
  // open user reports, if any exist.
  bots: router({
    flaggedAccounts: adminProcedure.query(async () => {
      const db = getDb();
      const rows = await db
        .select({ user: users, reportId: reports.id })
        .from(reports)
        .innerJoin(users, eq(reports.targetId, users.id))
        .where(and(eq(reports.targetType, 'user'), eq(reports.status, 'open')));
      return rows.map((r) => ({
        reportId: r.reportId,
        id: r.user.id,
        nick: r.user.nick,
        email: r.user.email,
        role: r.user.role,
      }));
    }),
  }),
});
