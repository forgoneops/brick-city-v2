import { z } from 'zod';
import { publicProcedure, protectedProcedure, router } from '../../trpc.js';
import { galleryCategoryValues } from '../../db/schema.js';

export const galleryRouter = router({
  list: publicProcedure
    .input(
      z
        .object({
          category: z.enum(galleryCategoryValues).optional(),
        })
        .optional()
    )
    .query(() => {
      // TODO(phase-1): query uploaded pieces with pagination and filters.
      return [] as Array<{
        id: string;
        title: string;
        authorId: string;
        category: string;
        imageUrl: string;
        createdAt: string;
      }>;
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        category: z.enum(galleryCategoryValues),
        imageUrl: z.string().url(),
      })
    )
    .mutation(() => {
      // TODO(phase-1): store piece metadata and wire image upload.
      return { id: 'todo', status: 'queued' };
    }),
});
