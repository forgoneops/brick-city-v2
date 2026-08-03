import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { publicProcedure, protectedProcedure, router } from '../../trpc.js';
import { getDb } from '../../db/index.js';
import { users, invites, inviteRedemptions } from '../../db/schema.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import { signSessionToken } from '../../lib/jwt.js';
import { eq, sql } from 'drizzle-orm';
import { TRIAL_DAYS, type PublicUser } from '@bcv2/shared';
import { randomUUID } from 'node:crypto';

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
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        nick: z.string().min(2).max(32),
        password: z.string().min(8),
        inviteCode: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();

      return await db.transaction(async (tx) => {
        const [invite] = await tx
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

        await tx
          .update(invites)
          .set({ usedCount: sql`${invites.usedCount} + 1` })
          .where(eq(invites.id, invite.id));

        await tx.insert(inviteRedemptions).values({
          id: randomUUID(),
          inviteId: invite.id,
          userId,
        });

        const [created] = await tx.select().from(users).where(eq(users.id, userId));
        const token = await signSessionToken({ sub: created.id, role: created.role });

        return { token, user: toPublicUser(created) };
      });
    }),

  login: publicProcedure
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
