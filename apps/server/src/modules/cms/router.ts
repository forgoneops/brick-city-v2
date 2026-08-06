import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure, adminProcedure } from '../../trpc.js';
import { getDb } from '../../db/index.js';
import { cmsPages, posts, siteContent } from '../../db/schema.js';
import {
  announcementConfigSchema,
  battleThemesConfigSchema,
  featureFlagsConfigSchema,
  galleryCategoriesConfigSchema,
  getCmsConfig,
  heroConfigSchema,
  invalidateCmsCache,
  localeOverridesConfigSchema,
  navConfigSchema,
  pricingConfigSchema,
  setDomainConfig,
  setPricingConfig,
} from './config.js';

const nullableIsoString = z.string().datetime().nullable();

const setConfigInput = z.discriminatedUnion('key', [
  z.object({ key: z.literal('hero'), value: heroConfigSchema, expectedUpdatedAt: nullableIsoString.optional() }),
  z.object({ key: z.literal('announcement'), value: announcementConfigSchema, expectedUpdatedAt: nullableIsoString.optional() }),
  z.object({ key: z.literal('nav'), value: navConfigSchema, expectedUpdatedAt: nullableIsoString.optional() }),
  z.object({ key: z.literal('galleryCategories'), value: galleryCategoriesConfigSchema, expectedUpdatedAt: nullableIsoString.optional() }),
  z.object({ key: z.literal('battleThemes'), value: battleThemesConfigSchema, expectedUpdatedAt: nullableIsoString.optional() }),
  z.object({ key: z.literal('featureFlags'), value: featureFlagsConfigSchema, expectedUpdatedAt: nullableIsoString.optional() }),
  z.object({ key: z.literal('localeOverrides'), value: localeOverridesConfigSchema, expectedUpdatedAt: nullableIsoString.optional() }),
  z.object({ key: z.literal('pricing'), value: pricingConfigSchema, expectedUpdatedAt: nullableIsoString.optional() }),
]);

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
      // This raw kv escape hatch could in theory hand-edit a cms_* key
      // directly; cheap insurance against a stale typed-config cache.
      invalidateCmsCache();
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
          body: z.string().min(1).max(20_000),
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

  // Typed config layer (hero/announcement/nav/etc) — see modules/cms/config.ts.
  getConfig: publicProcedure.query(async () => {
    return getCmsConfig();
  }),

  setConfig: adminProcedure.input(setConfigInput).mutation(async ({ input }) => {
    if (input.key === 'pricing') {
      await setPricingConfig(input.value, input.expectedUpdatedAt);
    } else {
      await setDomainConfig(input.key, input.value, input.expectedUpdatedAt);
    }
    return getCmsConfig();
  }),

  // Convenience wrapper over setConfig({key:'nav'}) for a drag-reorder UI:
  // takes just the new key order, keeps each item's existing visibility.
  reorderNav: adminProcedure
    .input(z.object({ order: z.array(z.string().min(1)).min(1) }))
    .mutation(async ({ input }) => {
      const current = (await getCmsConfig()).nav;
      const visibility = new Map(current.items.map((i) => [i.key, i.visible]));
      const reordered = input.order.map((key) => ({ key, visible: visibility.get(key) ?? true }));
      await setDomainConfig('nav', { items: reordered }, undefined);
      return getCmsConfig();
    }),

  pages: router({
    // Admin sees drafts too; public only ever reaches bySlug (published-only).
    list: adminProcedure.query(async () => {
      const db = getDb();
      const rows = await db.select().from(cmsPages).orderBy(desc(cmsPages.updatedAt));
      return rows.map((p) => ({ ...p, createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString() }));
    }),

    bySlug: publicProcedure
      .input(z.object({ slug: z.string().min(1) }))
      .query(async ({ input }) => {
        const db = getDb();
        const [row] = await db.select().from(cmsPages).where(eq(cmsPages.slug, input.slug));
        if (!row || !row.published) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Page not found' });
        }
        return { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
      }),

    // Upsert by slug (create if new). Optimistic lock via expectedUpdatedAt,
    // same convention as setConfig — omit on first create.
    upsert: adminProcedure
      .input(
        z.object({
          slug: z
            .string()
            .min(1)
            .max(128)
            .regex(/^[a-z0-9-]+$/, 'lowercase letters, numbers, hyphens only'),
          title: z.string().min(1).max(255),
          body: z.string().min(1).max(20_000),
          published: z.boolean(),
          expectedUpdatedAt: nullableIsoString.optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = getDb();
        const [existing] = await db.select().from(cmsPages).where(eq(cmsPages.slug, input.slug));

        if (input.expectedUpdatedAt !== undefined) {
          const currentUpdatedAt = existing?.updatedAt.toISOString() ?? null;
          if (currentUpdatedAt !== input.expectedUpdatedAt) {
            throw new TRPCError({
              code: 'CONFLICT',
              message: 'This page changed since you loaded it. Reload and retry.',
            });
          }
        }

        await db
          .insert(cmsPages)
          .values({ slug: input.slug, title: input.title, body: input.body, published: input.published })
          .onDuplicateKeyUpdate({
            set: { title: input.title, body: input.body, published: input.published },
          });

        const [saved] = await db.select().from(cmsPages).where(eq(cmsPages.slug, input.slug));
        return { ...saved, createdAt: saved.createdAt.toISOString(), updatedAt: saved.updatedAt.toISOString() };
      }),

    delete: adminProcedure
      .input(z.object({ slug: z.string().min(1) }))
      .mutation(async ({ input }) => {
        const db = getDb();
        await db.delete(cmsPages).where(eq(cmsPages.slug, input.slug));
        return { slug: input.slug };
      }),
  }),
});
