import { TRPCError } from '@trpc/server';
import { and, desc, eq, lt, sql } from 'drizzle-orm';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { GALLERY_CATEGORIES } from '@bcv2/shared';
import { publicProcedure, protectedProcedure, router } from '../../trpc.js';
import { getDb } from '../../db/index.js';
import { comments, galleryCategoryValues, photos, props, users } from '../../db/schema.js';
import { recalculateUserScore } from '../ranking/scoring.js';

const PAGE_SIZE = 12;

function serializePhoto(row: {
  photos: typeof photos.$inferSelect;
  users: { nick: string } | null;
}) {
  const p = row.photos;
  return {
    id: p.id,
    title: p.title,
    category: p.category,
    city: p.city,
    imageUrl: p.imageUrl,
    thumbUrl: p.thumbUrl,
    propsCount: p.propsCount,
    status: p.status,
    authorNick: row.users?.nick ?? null,
    createdAt: p.createdAt.toISOString(),
  };
}

export const galleryRouter = router({
  // Cursor pagination: cursor = createdAt ISO of the last item from the
  // previous page; returns nextCursor when more pages exist.
  list: publicProcedure
    .input(
      z
        .object({
          category: z.enum(galleryCategoryValues).optional(),
          cursor: z.string().datetime().optional(),
          limit: z.number().int().min(1).max(50).optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = getDb();
      const limit = input?.limit ?? PAGE_SIZE;

      const conditions = [eq(photos.status, 'live')];
      if (input?.category) {
        conditions.push(
          eq(photos.category, input.category as (typeof GALLERY_CATEGORIES)[number])
        );
      }
      if (input?.cursor) {
        conditions.push(lt(photos.createdAt, new Date(input.cursor)));
      }

      const rows = await db
        .select()
        .from(photos)
        .leftJoin(users, eq(photos.authorId, users.id))
        .where(and(...conditions))
        .orderBy(desc(photos.createdAt))
        .limit(limit + 1);

      const page = rows.slice(0, limit);
      const last = page[page.length - 1];
      return {
        items: page.map(serializePhoto),
        nextCursor:
          rows.length > limit && last ? last.photos.createdAt.toISOString() : null,
      };
    }),

  byId: publicProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ input }) => {
      const db = getDb();
      const [row] = await db
        .select()
        .from(photos)
        .leftJoin(users, eq(photos.authorId, users.id))
        .where(and(eq(photos.id, input.id), eq(photos.status, 'live')));
      if (!row) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Photo not found' });
      }

      const commentRows = await db
        .select({
          id: comments.id,
          body: comments.body,
          createdAt: comments.createdAt,
          authorNick: users.nick,
        })
        .from(comments)
        .innerJoin(users, eq(comments.authorId, users.id))
        .where(eq(comments.photoId, input.id))
        .orderBy(comments.createdAt);

      return {
        ...serializePhoto(row),
        comments: commentRows.map((c) => ({
          ...c,
          createdAt: c.createdAt.toISOString(),
        })),
      };
    }),

  addComment: protectedProcedure
    .input(z.object({ photoId: z.string().min(1), body: z.string().min(1).max(2000) }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [photo] = await db
        .select({ id: photos.id })
        .from(photos)
        .where(and(eq(photos.id, input.photoId), eq(photos.status, 'live')));
      if (!photo) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Photo not found' });
      }
      const id = randomUUID();
      await db.insert(comments).values({
        id,
        photoId: input.photoId,
        authorId: ctx.user.id,
        body: input.body,
      });
      return { id };
    }),

  props: router({
    // One prop per user per photo; toggling keeps props_count in sync.
    toggle: protectedProcedure
      .input(z.object({ photoId: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const db = getDb();
        const result = await db.transaction(async (tx) => {
          const [photo] = await tx
            .select({ id: photos.id, status: photos.status, authorId: photos.authorId })
            .from(photos)
            .where(eq(photos.id, input.photoId))
            .for('update');
          if (!photo || photo.status !== 'live') {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Photo not found' });
          }

          const existing = await tx
            .select({ id: props.id })
            .from(props)
            .where(and(eq(props.photoId, input.photoId), eq(props.userId, ctx.user.id)));

          let active: boolean;
          if (existing.length > 0) {
            await tx.delete(props).where(eq(props.id, existing[0].id));
            await tx
              .update(photos)
              .set({ propsCount: sql`GREATEST(${photos.propsCount} - 1, 0)` })
              .where(eq(photos.id, input.photoId));
            active = false;
          } else {
            await tx.insert(props).values({
              id: randomUUID(),
              photoId: input.photoId,
              userId: ctx.user.id,
            });
            await tx
              .update(photos)
              .set({ propsCount: sql`${photos.propsCount} + 1` })
              .where(eq(photos.id, input.photoId));
            active = true;
          }

          const [updated] = await tx
            .select({ propsCount: photos.propsCount })
            .from(photos)
            .where(eq(photos.id, input.photoId));
          return { active, propsCount: updated.propsCount, authorId: photo.authorId };
        });

        if (result.authorId) {
          await recalculateUserScore(result.authorId);
        }
        return { active: result.active, propsCount: result.propsCount };
      }),
  }),
});
