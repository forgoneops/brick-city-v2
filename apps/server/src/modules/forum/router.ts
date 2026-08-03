import { z } from 'zod';
import { FORUM_CATEGORIES } from '@bcm/shared';
import { publicProcedure, router } from '../../trpc/trpc.js';

/**
 * Forum module — STUB (Phase 3b: threads, replies, forum props, moderation
 * wired into the admin panel).
 * TODO(phase-3b): threads/posts tables, per-category listing, prop counts.
 */
export const forumRouter = router({
  categories: publicProcedure.query(() => FORUM_CATEGORIES),

  /** Placeholder thread list — returns an empty page until Phase 3b. */
  threads: publicProcedure
    .input(z.object({ category: z.enum(FORUM_CATEGORIES) }))
    .query(() => ({ threads: [] as unknown[], nextCursor: null as string | null })),
});
