import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getDb } from '../../db/index.js';
import { siteContent } from '../../db/schema.js';
import { adminProcedure, publicProcedure, router } from '../../trpc/trpc.js';

/**
 * CMS module — STUB (Phase 4: edit the site from admin — hero texts,
 * announcements, info pages, menu, banners, gallery categories, battle
 * themes, subscription price, feature flags). Phase 0 ships only the
 * key-value content store used by the paywall flag.
 * TODO(phase-4): typed content slots, audit log, preview/draft states.
 */
export const cmsRouter = router({
  /** Public read of a single content key (returns null when unset). */
  getContent: publicProcedure
    .input(z.object({ key: z.string().min(1).max(128) }))
    .query(async ({ input }) => {
      const rows = await getDb()
        .select()
        .from(siteContent)
        .where(eq(siteContent.key, input.key))
        .limit(1);
      return { key: input.key, value: rows[0]?.value ?? null };
    }),

  /** Admin: upsert a content key. */
  setContent: adminProcedure
    .input(z.object({ key: z.string().min(1).max(128), value: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await getDb()
        .insert(siteContent)
        .values({ key: input.key, value: input.value, updatedBy: ctx.user.id })
        .onDuplicateKeyUpdate({ set: { value: input.value, updatedBy: ctx.user.id } });
      return { ok: true as const };
    }),
});
