import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { and, desc, eq, gt, isNull, or, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { adminProcedure, protectedProcedure, rateLimited, router } from '../../trpc.js';
import { getDb } from '../../db/index.js';
import { invites, users } from '../../db/schema.js';

// How many *active* codes a regular writer may hold at once (active = has
// remaining uses and isn't expired). Staff bypass the quota.
const USER_INVITE_QUOTA = 3;

// Graffiti-flavoured codes in the seed's WAW-044 style: 3 letters, dash,
// 3 digits. Letters are picked from a set without easily-confused chars.
const CODE_LETTERS = 'BCDFGHKMNPRSTVWXZ';

function generateCode(): string {
  let letters = '';
  for (let i = 0; i < 3; i++) {
    letters += CODE_LETTERS[Math.floor(Math.random() * CODE_LETTERS.length)];
  }
  const digits = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  return `${letters}-${digits}`;
}

async function insertUniqueInvite(values: {
  createdBy: string;
  maxUses: number;
  expiresAt: Date | null;
}): Promise<{ id: string; code: string }> {
  const db = getDb();
  // Retry a few times on the (rare) unique-code collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const id = randomUUID();
    const code = generateCode();
    try {
      await db.insert(invites).values({ id, code, ...values });
      return { id, code };
    } catch (err) {
      // Duplicate code — roll again; any other error bubbles up.
      if (attempt === 4) throw err;
    }
  }
  throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Could not generate invite code' });
}

const inviteRow = {
  id: invites.id,
  code: invites.code,
  maxUses: invites.maxUses,
  usedCount: invites.usedCount,
  expiresAt: invites.expiresAt,
  createdAt: invites.createdAt,
};

export const invitesRouter = router({
  // Logged-in writer: my codes + how many more I can mint.
  mine: protectedProcedure.query(async ({ ctx }) => {
    const db = getDb();
    const rows = await db
      .select(inviteRow)
      .from(invites)
      .where(eq(invites.createdBy, ctx.user.id))
      .orderBy(desc(invites.createdAt));

    const now = new Date();
    const activeCount = rows.filter(
      (r) => r.usedCount < r.maxUses && (!r.expiresAt || r.expiresAt > now)
    ).length;
    const isStaff = ctx.user.role === 'admin' || ctx.user.role === 'moderator';

    return {
      items: rows,
      quota: isStaff ? null : USER_INVITE_QUOTA,
      activeCount,
    };
  }),

  // Mint a code for myself, respecting the active-code quota.
  create: protectedProcedure
    .use(rateLimited('invites.create', { windowMs: 60_000, max: 10 }))
    .input(z.object({ maxUses: z.number().int().min(1).max(10).default(1) }).optional())
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const isStaff = ctx.user.role === 'admin' || ctx.user.role === 'moderator';

      if (!isStaff) {
        const now = new Date();
        const [active] = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(invites)
          .where(
            and(
              eq(invites.createdBy, ctx.user.id),
              sql`${invites.usedCount} < ${invites.maxUses}`,
              or(isNull(invites.expiresAt), gt(invites.expiresAt, now))
            )
          );
        if (Number(active.count) >= USER_INVITE_QUOTA) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: `Invite quota reached (${USER_INVITE_QUOTA} active codes)`,
          });
        }
      }

      const created = await insertUniqueInvite({
        createdBy: ctx.user.id,
        maxUses: input?.maxUses ?? 1,
        expiresAt: null,
      });
      return created;
    }),

  // MOD DESK: every code in the system, with the creator's nick.
  listAll: adminProcedure.query(async () => {
    const db = getDb();
    const rows = await db
      .select({ ...inviteRow, creatorNick: users.nick })
      .from(invites)
      .innerJoin(users, eq(invites.createdBy, users.id))
      .orderBy(desc(invites.createdAt))
      .limit(200);
    return rows;
  }),

  // MOD DESK: mint a code with custom uses / optional expiry (days).
  adminCreate: adminProcedure
    .input(
      z.object({
        maxUses: z.number().int().min(1).max(100).default(1),
        expiresInDays: z.number().int().min(1).max(365).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const expiresAt = input.expiresInDays
        ? new Date(Date.now() + input.expiresInDays * 86_400_000)
        : null;
      return insertUniqueInvite({
        createdBy: ctx.user.id,
        maxUses: input.maxUses,
        expiresAt,
      });
    }),

  // MOD DESK: kill a code without deleting its history — clamp maxUses to
  // usedCount so it reads as exhausted and can't be redeemed any more.
  revoke: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    const db = getDb();
    const [invite] = await db.select().from(invites).where(eq(invites.id, input.id)).limit(1);
    if (!invite) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Invite not found' });
    }
    await db
      .update(invites)
      .set({ maxUses: invite.usedCount })
      .where(eq(invites.id, input.id));
    return { ok: true };
  }),
});
