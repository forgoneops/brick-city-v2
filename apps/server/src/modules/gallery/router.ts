import { z } from 'zod';
import { GALLERY_CATEGORIES } from '@bcm/shared';
import { publicProcedure, router } from '../../trpc/trpc.js';

/**
 * Gallery module — STUB (Phase 2: server uploads, image storage, props).
 * TODO(phase-2): pieces table, upload pipeline, wanted-poster metadata strip.
 */
export const galleryRouter = router({
  /** Placeholder feed — returns an empty page until Phase 2. */
  feed: publicProcedure
    .input(
      z
        .object({
          category: z.enum(GALLERY_CATEGORIES).optional(),
          cursor: z.string().optional(),
        })
        .optional(),
    )
    .query(() => ({ items: [] as unknown[], nextCursor: null as string | null })),

  categories: publicProcedure.query(() => GALLERY_CATEGORIES),
});
