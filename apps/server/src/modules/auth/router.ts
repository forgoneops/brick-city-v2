import { randomUUID } from 'node:crypto';
import { TRPCError } from '@trpc/server';
import bcrypt from 'bcryptjs';
import { and, eq, lt, or, gt, isNull } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { TRIAL_DAYS, type AuthTokens, type SessionUser } from '@bcm/shared';
import { getDb } from '../../db/index.js';
import { inviteRedemptions, invites, users } from '../../db/schema.js';
import { ACCESS_TOKEN_TTL, env } from '../../env.js';
import { protectedProcedure, publicProcedure, router } from '../../trpc/trpc.js';

const BCRYPT_ROUNDS = 10;

function signAccessToken(user: SessionUser): string {
  return jwt.sign({ sub: user.id, role: user.role }, env.jwtSecret, {
    expiresIn: ACCESS_TOKEN_TTL,
  });
}

function toSessionUser(row: typeof users.$inferSelect): SessionUser {
  return {
    id: row.id,
    email: row.email,
    nick: row.nick,
    role: row.role,
    walletBalanceCents: row.walletBalanceCents,
    trialEndsAt: row.trialEndsAt ? row.trialEndsAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

const registerInput = z.object({
  inviteCode: z.string().min(1),
  nick: z.string().min(3).max(64),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

const loginInput = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authRouter = router({
  /**
   * Registration is INVITE ONLY (Phase 3c): a valid, unexpired invite code
   * with remaining uses is required. Single-use invites are decremented and
   * the redemption is recorded. New accounts get a 7-day full-access trial.
   */
  register: publicProcedure
    .input(registerInput)
    .mutation(async ({ input }): Promise<AuthTokens & { user: SessionUser }> => {
      const db = getDb();
      const now = new Date();

      const inviteRows = await db
        .select()
        .from(invites)
        .where(
          and(
            eq(invites.code, input.inviteCode),
            lt(invites.usedCount, invites.maxUses),
            or(isNull(invites.expiresAt), gt(invites.expiresAt, now)),
          ),
        )
        .limit(1);
      const invite = inviteRows[0];
      if (!invite) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid or expired invite code' });
      }

      const clash = await db
        .select({ id: users.id })
        .from(users)
        .where(or(eq(users.email, input.email), eq(users.nick, input.nick)))
        .limit(1);
      if (clash[0]) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Email or nick already taken' });
      }

      const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
      const trialEndsAt = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
      const userId = randomUUID();

      await db.transaction(async (tx) => {
        await tx.insert(users).values({
          id: userId,
          email: input.email,
          nick: input.nick,
          role: 'user',
          passwordHash,
          trialEndsAt,
        });
        await tx.insert(inviteRedemptions).values({
          id: randomUUID(),
          inviteId: invite.id,
          userId,
        });
        // Single-use decrement: bump usedCount towards maxUses.
        await tx
          .update(invites)
          .set({ usedCount: invite.usedCount + 1 })
          .where(eq(invites.id, invite.id));
      });

      const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      const user = toSessionUser(rows[0]!);
      return { user, accessToken: signAccessToken(user) };
    }),

  login: publicProcedure
    .input(loginInput)
    .mutation(async ({ input }): Promise<AuthTokens & { user: SessionUser }> => {
      const db = getDb();
      const rows = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
      const row = rows[0];
      if (!row || !(await bcrypt.compare(input.password, row.passwordHash))) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid credentials' });
      }
      const user = toSessionUser(row);
      // TODO(phase-2): also issue a refresh token persisted in `sessions`.
      return { user, accessToken: signAccessToken(user) };
    }),

  /** Current authenticated user. */
  me: protectedProcedure.query(({ ctx }): SessionUser => ctx.user),
});
