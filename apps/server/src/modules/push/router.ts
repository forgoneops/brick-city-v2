import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { router, publicProcedure, protectedProcedure } from '../../trpc.js';
import { getDb } from '../../db/index.js';
import { pushSubscriptions } from '../../db/schema.js';
import { getVapidPublicKey } from './notify.js';

export const pushRouter = router({
  // Public — the browser needs the VAPID public key before it can subscribe.
  // Returns null when push isn't configured on this deploy (env vars missing),
  // and the UI hides the toggle in that case.
  vapidPublicKey: publicProcedure.query(() => {
    return { key: getVapidPublicKey() };
  }),

  // Upsert by endpoint: the same browser re-subscribing (e.g. after a key
  // rotation or a fresh login on a shared device) just re-attaches the
  // endpoint to the current user instead of erroring on the unique index.
  subscribe: protectedProcedure
    .input(
      z.object({
        endpoint: z.string().url().max(512),
        p256dh: z.string().min(1).max(255),
        auth: z.string().min(1).max(255),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db
        .insert(pushSubscriptions)
        .values({
          id: randomUUID(),
          userId: ctx.user.id,
          endpoint: input.endpoint,
          p256dh: input.p256dh,
          auth: input.auth,
        })
        .onDuplicateKeyUpdate({
          set: { userId: ctx.user.id, p256dh: input.p256dh, auth: input.auth },
        });
      return { ok: true as const };
    }),

  unsubscribe: protectedProcedure
    .input(z.object({ endpoint: z.string().url().max(512) }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db
        .delete(pushSubscriptions)
        .where(and(eq(pushSubscriptions.endpoint, input.endpoint), eq(pushSubscriptions.userId, ctx.user.id)));
      return { ok: true as const };
    }),

  // Lets the profile page show the toggle's current state.
  mySubscription: protectedProcedure
    .input(z.object({ endpoint: z.string().url().max(512) }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const [row] = await db
        .select({ id: pushSubscriptions.id })
        .from(pushSubscriptions)
        .where(and(eq(pushSubscriptions.endpoint, input.endpoint), eq(pushSubscriptions.userId, ctx.user.id)));
      return { subscribed: !!row };
    }),
});
