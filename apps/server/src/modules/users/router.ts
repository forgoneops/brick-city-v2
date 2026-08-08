import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { and, desc, eq, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { GALLERY_CATEGORIES } from '@bcv2/shared';
import { protectedProcedure, publicProcedure, router } from '../../trpc.js';
import { getDb } from '../../db/index.js';
import { battleVotes, follows, photos, users } from '../../db/schema.js';
import { toPublicUser } from '../auth/router.js';

// Relative (/uploads/...) or absolute (https://...) — the upload pipeline
// (modules/gallery/upload.ts) only ever returns one of these two shapes via
// storage.url(), never a bare filename or a javascript: scheme.
const avatarUrlShape = /^(\/|https?:\/\/)/;

// Public writer profiles (/u/:nick) + the follow graph. Nicks are the public
// handle everywhere in the UI, so the profile lookup keys on nick, not id.

// Badges are derived at read time from real activity — no badge table to
// administer. Keys are stable strings the web app maps to i18n labels.
async function deriveBadges(userId: string, role: string, createdAt: Date): Promise<string[]> {
  const db = getDb();
  const badges: string[] = [];

  const [photoCount] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(photos)
    .where(and(eq(photos.authorId, userId), eq(photos.status, 'live')));
  const [propsSum] = await db
    .select({ total: sql<number>`COALESCE(SUM(${photos.propsCount}), 0)` })
    .from(photos)
    .where(eq(photos.authorId, userId));
  const [battleRow] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(battleVotes)
    .where(eq(battleVotes.submissionUserId, userId));

  if (Date.now() - createdAt.getTime() > 365 * 86_400_000) badges.push('og');
  if (Number(photoCount.count) >= 1) badges.push('first_paint');
  if (Number(photoCount.count) >= 25) badges.push('prolific');
  if (Number(propsSum.total) >= 100) badges.push('props_magnet');
  if (Number(battleRow.count) > 0) badges.push('battler');
  if (role !== 'user') badges.push('crew');
  return badges;
}

export const usersRouter = router({
  publicProfile: publicProcedure
    .input(z.object({ nick: z.string().min(1).max(64) }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const [user] = await db
        .select({
          id: users.id,
          nick: users.nick,
          role: users.role,
          createdAt: users.createdAt,
          avatarUrl: users.avatarUrl,
          bio: users.bio,
          location: users.location,
          style: users.style,
        })
        .from(users)
        .where(eq(users.nick, input.nick))
        .limit(1);
      if (!user) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Writer not found' });
      }

      const [followers] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(follows)
        .where(eq(follows.followedId, user.id));
      const [following] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(follows)
        .where(eq(follows.followerId, user.id));
      const [photoCount] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(photos)
        .where(and(eq(photos.authorId, user.id), eq(photos.status, 'live')));

      const recentPhotos = await db
        .select({
          id: photos.id,
          title: photos.title,
          thumbUrl: photos.thumbUrl,
          propsCount: photos.propsCount,
          createdAt: photos.createdAt,
        })
        .from(photos)
        .where(and(eq(photos.authorId, user.id), eq(photos.status, 'live')))
        .orderBy(desc(photos.createdAt))
        .limit(12);

      let isFollowedByMe = false;
      if (ctx.user && ctx.user.id !== user.id) {
        const [row] = await db
          .select({ id: follows.id })
          .from(follows)
          .where(and(eq(follows.followerId, ctx.user.id), eq(follows.followedId, user.id)))
          .limit(1);
        isFollowedByMe = Boolean(row);
      }

      return {
        user: {
          nick: user.nick,
          role: user.role,
          createdAt: user.createdAt.toISOString(),
          avatarUrl: user.avatarUrl ?? null,
          bio: user.bio ?? null,
          location: user.location ?? null,
          style: user.style ?? null,
        },
        stats: {
          followers: Number(followers.count),
          following: Number(following.count),
          photos: Number(photoCount.count),
        },
        badges: await deriveBadges(user.id, user.role, user.createdAt),
        recentPhotos: recentPhotos.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() })),
        isFollowedByMe,
        isMe: ctx.user?.id === user.id,
      };
    }),

  toggleFollow: protectedProcedure
    .input(z.object({ nick: z.string().min(1).max(64) }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [target] = await db.select({ id: users.id }).from(users).where(eq(users.nick, input.nick)).limit(1);
      if (!target) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Writer not found' });
      }
      if (target.id === ctx.user.id) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot follow yourself' });
      }

      const [existing] = await db
        .select({ id: follows.id })
        .from(follows)
        .where(and(eq(follows.followerId, ctx.user.id), eq(follows.followedId, target.id)))
        .limit(1);

      if (existing) {
        await db.delete(follows).where(eq(follows.id, existing.id));
        return { following: false };
      }
      await db.insert(follows).values({ id: randomUUID(), followerId: ctx.user.id, followedId: target.id });
      return { following: true };
    }),

  // Every field is optional/nullable independently so a partial save (e.g.
  // just the avatar right after upload) doesn't require re-sending the rest
  // of the form. `null` clears a field; `undefined`/omitted leaves it alone.
  updateProfile: protectedProcedure
    .input(
      z.object({
        bio: z.string().max(500).nullable().optional(),
        location: z.string().max(120).nullable().optional(),
        style: z.enum(GALLERY_CATEGORIES).nullable().optional(),
        avatarUrl: z.string().max(2048).regex(avatarUrlShape, 'Invalid avatar URL').nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const updates: Partial<typeof users.$inferInsert> = {};
      if (input.bio !== undefined) updates.bio = input.bio;
      if (input.location !== undefined) updates.location = input.location;
      if (input.style !== undefined) updates.style = input.style;
      if (input.avatarUrl !== undefined) updates.avatarUrl = input.avatarUrl;

      if (Object.keys(updates).length > 0) {
        await db.update(users).set(updates).where(eq(users.id, ctx.user.id));
      }

      const [updated] = await db.select().from(users).where(eq(users.id, ctx.user.id));
      return toPublicUser(updated);
    }),
});
