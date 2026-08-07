import { z } from 'zod';
import { and, desc, eq, lt } from 'drizzle-orm';
import { router, publicProcedure, protectedProcedure, adminProcedure } from '../../trpc.js';
import { MAX_PRICE_PLN, MIN_PRICE_PLN } from '@bcv2/shared';
import { getDb } from '../../db/index.js';
import { paymentProviderIdValues, subscriptions, users, walletTransactions } from '../../db/schema.js';
import { getPersistedPaywallConfig, setPersistedPaywallConfig } from './access.js';
import { creditWallet } from './ledger.js';
import { getProvider, isProviderEnabled, listEnabledProviderIds } from './providers.js';
import { TRPCError } from '@trpc/server';

const PAGE_SIZE = 20;

export const subscriptionsRouter = router({
  balance: protectedProcedure.query(async ({ ctx }) => {
    const db = getDb();
    const [user] = await db
      .select({ walletBalanceCents: users.walletBalanceCents })
      .from(users)
      .where(eq(users.id, ctx.user.id));
    return { walletBalanceCents: user?.walletBalanceCents ?? 0 };
  }),

  myStatus: protectedProcedure.query(async ({ ctx }) => {
    const db = getDb();
    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, ctx.user.id));
    if (!sub) return null;
    return {
      status: sub.status,
      trialEndsAt: sub.trialEndsAt?.toISOString() ?? null,
      currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
      priceCents: sub.priceCents,
    };
  }),

  // Top-up: provider stub checkout -> mock completes synchronously -> credit
  // the wallet ledger. A real /webhooks/:provider route runs the same
  // creditWallet() path for when real provider keys land (docs/DECISIONS.md).
  topUp: protectedProcedure
    .input(
      z.object({
        amountCents: z.number().int().positive(),
        provider: z.enum(paymentProviderIdValues),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // The admin panel's provider switch is authoritative: a disabled
      // provider rejects top-ups here, not just hides in the UI.
      if (!(await isProviderEnabled(input.provider))) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'provider-disabled' });
      }
      const checkout = await getProvider(input.provider).createCheckout({
        userId: ctx.user.id,
        amountCents: input.amountCents,
      });
      return creditWallet({
        userId: ctx.user.id,
        amountCents: checkout.amountCents,
        type: 'topup',
        provider: input.provider,
        providerRef: checkout.providerRef,
        reason: 'top-up',
      });
    }),

  transactions: protectedProcedure
    .input(
      z
        .object({ cursor: z.string().datetime().optional(), limit: z.number().int().min(1).max(50).optional() })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const limit = input?.limit ?? PAGE_SIZE;
      const conditions = [eq(walletTransactions.userId, ctx.user.id)];
      if (input?.cursor) {
        conditions.push(lt(walletTransactions.createdAt, new Date(input.cursor)));
      }

      const rows = await db
        .select()
        .from(walletTransactions)
        .where(and(...conditions))
        .orderBy(desc(walletTransactions.createdAt))
        .limit(limit + 1);

      const page = rows.slice(0, limit);
      const last = page[page.length - 1];
      return {
        items: page.map((r) => ({
          id: r.id,
          amountCents: r.amountCents,
          type: r.type,
          reason: r.reason,
          provider: r.provider,
          status: r.status,
          createdAt: r.createdAt.toISOString(),
        })),
        nextCursor: rows.length > limit && last ? last.createdAt.toISOString() : null,
      };
    }),

  // Public so pre-login pages can show pricing; reads the same persisted
  // config that evaluateAccess() enforces, so the two never disagree.
  paywallStatus: publicProcedure.query(async () => {
    const config = await getPersistedPaywallConfig();
    return { paywallEnabled: config.paywallEnabled };
  }),

  // Which providers the wallet UI may offer for top-ups. Public (no secrets
  // — just ids), mirrors the admin panel's on/off switches.
  enabledProviders: publicProcedure.query(async () => {
    return { providers: await listEnabledProviderIds() };
  }),

  getPaywallConfig: adminProcedure.query(async () => {
    return getPersistedPaywallConfig();
  }),

  setPaywallConfig: adminProcedure
    .input(
      z.object({
        paywallEnabled: z.boolean(),
        pricePln: z.number().int().min(MIN_PRICE_PLN).max(MAX_PRICE_PLN),
      })
    )
    .mutation(async ({ input }) => {
      await setPersistedPaywallConfig(input);
      return input;
    }),
});
