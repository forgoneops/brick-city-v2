import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure, adminProcedure } from '../../trpc.js';
import { getDb } from '../../db/index.js';
import { posts, siteContent } from '../../db/schema.js';

function serializePost(p: typeof posts.$inferSelect) {
  return {
    id: p.id,
    title: p.title,
    category: p.category,
    body: p.body,
    status: p.status,
    publishedAt: p.publishedAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
  };
}

export const cmsRouter = router({
  getContent: publicProcedure
    .input(
      z.object({
        key: z.string().min(1),
      })
    )
    .query(async ({ input }) => {
      const db = getDb();
      const [row] = await db.select().from(siteContent).where(eq(siteContent.key, input.key));
      return row?.value ?? null;
    }),

  setContent: adminProcedure
    .input(
      z.object({
        key: z.string().min(1),
        value: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .insert(siteContent)
        .values({ key: input.key, value: input.value })
        .onDuplicateKeyUpdate({ set: { value: input.value } });
      return { key: input.key };
    }),

  posts: router({
    // Public zine feed: published posts only.
    listPublished: publicProcedure.query(async () => {
      const db = getDb();
      const rows = await db
        .select()
        .from(posts)
        .where(eq(posts.status, 'published'))
        .orderBy(desc(posts.publishedAt));
      return rows.map(serializePost);
    }),

    // Admin: full list including drafts.
    listAll: adminProcedure.query(async () => {
      const db = getDb();
      const rows = await db.select().from(posts).orderBy(desc(posts.createdAt));
      return rows.map(serializePost);
    }),

    create: adminProcedure
      .input(
        z.object({
          title: z.string().min(1).max(255),
          category: z.string().min(1).max(64).default('dispatch'),
          body: z.string().min(1),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const db = getDb();
        const id = randomUUID();
        await db.insert(posts).values({
          id,
          authorId: ctx.user.id,
          title: input.title,
          category: input.category,
          body: input.body,
          status: 'draft',
        });
        return { id, status: 'draft' as const };
      }),

    publish: adminProcedure
      .input(z.object({ id: z.string().min(1) }))
      .mutation(async ({ input }) => {
        const db = getDb();
        const [post] = await db.select().from(posts).where(eq(posts.id, input.id));
        if (!post) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Post not found' });
        }
        await db
          .update(posts)
          .set({ status: 'published', publishedAt: new Date() })
          .where(eq(posts.id, input.id));
        return { id: input.id, status: 'published' as const };
      }),

    unpublish: adminProcedure
      .input(z.object({ id: z.string().min(1) }))
      .mutation(async ({ input }) => {
        const db = getDb();
        await db
          .update(posts)
          .set({ status: 'draft', publishedAt: null })
          .where(eq(posts.id, input.id));
        return { id: input.id, status: 'draft' as const };
      }),
  }),
});
