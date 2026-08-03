import { z } from 'zod';
import { publicProcedure, protectedProcedure, router } from '../../trpc.js';
import { forumCategoryValues } from '../../db/schema.js';

export const forumRouter = router({
  listThreads: publicProcedure
    .input(
      z
        .object({
          category: z.enum(forumCategoryValues).optional(),
        })
        .optional()
    )
    .query(() => {
      // TODO(phase-1): query threads with last-post ordering.
      return [] as Array<{
        id: string;
        title: string;
        category: string;
        authorId: string;
        replyCount: number;
        createdAt: string;
      }>;
    }),

  createThread: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        category: z.enum(forumCategoryValues),
        body: z.string().min(1),
      })
    )
    .mutation(() => {
      // TODO(phase-1): insert thread + opening post.
      return { id: 'todo', status: 'queued' };
    }),
});
