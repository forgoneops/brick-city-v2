import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { publicProcedure, protectedProcedure, rateLimited, router } from '../../trpc.js';
import { getDb } from '../../db/index.js';
import { users, invites, inviteRedemptions, subscriptions } from '../../db/schema.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import { signSessionToken } from '../../lib/jwt.js';
import { verifyTurnstile } from '../../lib/turnstile.js';
import { getCmsConfig } from '../cms/config.js';
import { eq, sql } from 'drizzle-orm';
import { DEFAULT_PRICE_PLN, TRIAL_DAYS, type PublicUser } from '@bcv2/shared';
import { randomUUID } from 'node:crypto';

// Bot/abuse hardening (Phase 5): both endpoints are the most abuse-prone in
// the app (credential stuffing, invite-code brute-forcing, spam accounts).
const registerLimited = publicProcedure.use(rateLimited('auth.register', { windowMs: 60_000, max: 5 }));
const loginLimited = publicProcedure.use(rateLimited('auth.login', { windowMs: 60_000, max: 10 }));

function toPublicUser(user: typeof users.$inferSelect): PublicUser {
  return {
    id: user.id,
    email: user.email,
    nick: user.nick,
    role: user.role,
    walletBalanceCents: user.walletBalanceCents,
    trialEndsAt: user.trialEndsAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}

export const authRouter = router({
  register: registerLimited
    .input(
      z.object({
        email: z.string().email(),
        nick: z.string().min(2).max(32),
        password: z.string().min(8),
        inviteCode: z.string().min(1).optional(),
        turnstileToken: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const humanVerified = await verifyTurnstile(input.turnstileToken);
      if (!humanVerified) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Bot check failed' });
      }

      // inviteOnly defaults to true (see modules/cms/config.ts) — an admin
      // can open registration from the CMS without a code change. Providing
      // a code is still honored (validated + redeemed) even when open, so
      // referral/invite-count tracking keeps working either way.
      const { inviteOnly } = (await getCmsConfig()).registration;
      if (inviteOnly && !input.inviteCode) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invite code required' });
      }

      const db = getDb();

      return await db.transaction(async (tx) => {
        let invite: typeof invites.$inferSelect | undefined;
        if (input.inviteCode) {
          [invite] = await tx
            .select()
            .from(invites)
            .where(eq(invites.code, input.inviteCode))
            .for('update');

          if (!invite) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid invite code' });
          }
          if (invite.usedCount >= invite.maxUses) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invite code exhausted' });
          }
          if (invite.expiresAt && invite.expiresAt < new Date()) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invite code expired' });
          }
        }

        const existing = await tx
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, input.email));
        if (existing.length > 0) {
          throw new TRPCError({ code: 'CONFLICT', message: 'Email already registered' });
        }

        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

        const userId = randomUUID();
        const passwordHash = await hashPassword(input.password);

        await tx.insert(users).values({
          id: userId,
          email: input.email,
          nick: input.nick,
          role: 'user',
          passwordHash,
          trialEndsAt,
        });

        await tx.insert(subscriptions).values({
          id: randomUUID(),
          userId,
          status: 'trialing',
          trialEndsAt,
          priceCents: DEFAULT_PRICE_PLN * 100,
        });

        if (invite) {
          await tx
            .update(invites)
            .set({ usedCount: sql`${invites.usedCount} + 1` })
            .where(eq(invites.id, invite.id));

          await tx.insert(inviteRedemptions).values({
            id: randomUUID(),
            inviteId: invite.id,
            userId,
          });
        }

        const [created] = await tx.select().from(users).where(eq(users.id, userId));
        const token = await signSessionToken({ sub: created.id, role: created.role });

        return { token, user: toPublicUser(created) };
      });
    }),

  login: loginLimited
    .input(
      z.object({
        email: z.string().email(),
        password: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const [user] = await db.select().from(users).where(eq(users.email, input.email));
      if (!user) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid credentials' });
      }
      const valid = await verifyPassword(input.password, user.passwordHash);
      if (!valid) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid credentials' });
      }
      const token = await signSessionToken({ sub: user.id, role: user.role });
      return { token, user: toPublicUser(user) };
    }),

  me: protectedProcedure.query(async ({ ctx }) => {
    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.id, ctx.user.id));
    if (!user) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not found' });
    }
    return toPublicUser(user);
  }),
});
