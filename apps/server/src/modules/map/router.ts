import { TRPCError } from '@trpc/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { activeAccessProcedure, protectedProcedure, publicProcedure, router, type Context } from '../../trpc.js';
import { getDb } from '../../db/index.js';
import { checkIns, pins, pinTypeValues, users } from '../../db/schema.js';
import { recalculateUserScore } from '../ranking/scoring.js';

// Members see exact coordinates of members-only pins; everyone else gets
// them nulled so the web renders the BlurredPin mystery layer.
async function isMember(ctx: Context): Promise<boolean> {
  if (!ctx.user) return false;
  if (ctx.user.role === 'admin' || ctx.user.role === 'moderator') return true;
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, ctx.user.id));
  if (!user) return false;
  const now = new Date();
  return (user.trialEndsAt !== null && user.trialEndsAt > now) || user.walletBalanceCents > 0;
}

export const mapRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    const db = getDb();
    const member = await isMember(ctx);
    const rows = await db.select().from(pins).where(eq(pins.status, 'live'));
    return rows.map((p) => ({
      id: p.id,
      name: p.name,
      city: p.city,
      type: p.type,
      membersOnly: p.membersOnly,
      lat: p.membersOnly && !member ? null : p.lat,
      lng: p.membersOnly && !member ? null : p.lng,
      createdAt: p.createdAt.toISOString(),
    }));
  }),

  // Content-creation endpoint — gated by paywall access (docs/DECISIONS.md).
  submit: activeAccessProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        city: z.string().max(128).default(''),
        type: z.enum(pinTypeValues),
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        membersOnly: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const id = randomUUID();
      await db.insert(pins).values({
        id,
        authorId: ctx.user.id,
        name: input.name,
        city: input.city,
        type: input.type,
        lat: input.lat,
        lng: input.lng,
        membersOnly: input.membersOnly,
        status: 'pending',
      });
      return { id, status: 'pending' as const };
    }),

  // Geo check-in at a spot — one credited check-in per user per pin
  // (dedupe rationale: docs/DECISIONS.md). Feeds ranking's activity weight.
  checkIn: protectedProcedure
    .input(z.object({ pinId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [pin] = await db
        .select({ id: pins.id })
        .from(pins)
        .where(and(eq(pins.id, input.pinId), eq(pins.status, 'live')));
      if (!pin) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Pin not found' });
      }

      const existing = await db
        .select({ id: checkIns.id })
        .from(checkIns)
        .where(and(eq(checkIns.pinId, input.pinId), eq(checkIns.userId, ctx.user.id)));

      if (existing.length === 0) {
        // createdAt set explicitly (not defaultNow()) — MySQL's bare NOW()
        // used in a DEFAULT expression truncates to whole seconds regardless
        // of the column's fsp, which broke season-boundary comparisons in
        // scoring.ts. See the comment on schema.ts's seasons.startsAt.
        await db.insert(checkIns).values({ id: randomUUID(), pinId: input.pinId, userId: ctx.user.id, createdAt: new Date() });
        await recalculateUserScore(ctx.user.id);
      }

      return { pinId: input.pinId, userId: ctx.user.id, status: 'checked-in' as const };
    }),
});
