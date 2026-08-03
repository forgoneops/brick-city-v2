import { z } from 'zod';
import { eq, sql } from 'drizzle-orm';
import { router, publicProcedure, protectedProcedure, adminProcedure } from '../../trpc.js';
import {
  DEFAULT_PRICE_PLN,
  MAX_PRICE_PLN,
  MIN_PRICE_PLN,
  PAYWALL_DEFAULT_ON,
  type PaywallConfig,
} from '@bcv2/shared';
import { getDb } from '../../db/index.js';
import { users, walletTransactions } from '../../db/schema.js';
import { randomUUID } from 'node:crypto';

export const subscriptionsRouter = router({
  balance: protectedProcedure.query(async ({ ctx }) => {
    const db = getDb();
    const [user] = await db
      .select({ walletBalanceCents: users.walletBalanceCents })
      .from(users)
      .where(eq(users.id, ctx.user.id));
    return { walletBalanceCents: user?.walletBalanceCents ?? 0 };
  }),

  topUp: protectedProcedure
    .input(
      z.object({
        amountCents: z.number().int().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();

      return await db.transaction(async (tx) => {
        await tx.insert(walletTransactions).values({
          id: randomUUID(),
          userId: ctx.user.id,
          amountCents: input.amountCents,
          reason: 'top-up',
        });

        await tx
          .update(users)
          .set({
            walletBalanceCents: sql`${users.walletBalanceCents} + ${input.amountCents}`,
          })
          .where(eq(users.id, ctx.user.id));

        const [updated] = await tx
          .select({ walletBalanceCents: users.walletBalanceCents })
          .from(users)
          .where(eq(users.id, ctx.user.id));

        return { walletBalanceCents: updated?.walletBalanceCents ?? 0 };
      });
    }),

  paywallStatus: publicProcedure.query(() => {
    // Phase 0 stub: returns compile-time default. Does not require MySQL.
    return { paywallEnabled: PAYWALL_DEFAULT_ON };
  }),

  getPaywallConfig: adminProcedure.query(() => {
    // TODO(phase-1): read persisted config from site_content.
    const config: PaywallConfig = {
      paywallEnabled: PAYWALL_DEFAULT_ON,
      pricePln: DEFAULT_PRICE_PLN,
    };
    return config;
  }),

  setPaywallConfig: adminProcedure
    .input(
      z.object({
        paywallEnabled: z.boolean(),
        pricePln: z.number().int().min(MIN_PRICE_PLN).max(MAX_PRICE_PLN),
      })
    )
    .mutation(({ input }) => {
      // TODO(phase-1): persist input to site_content kv store.
      const config: PaywallConfig = {
        paywallEnabled: input.paywallEnabled,
        pricePln: input.pricePln,
      };
      return config;
    }),
});
