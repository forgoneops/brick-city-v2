import { z } from 'zod';
import { publicProcedure, protectedProcedure, router } from '../../trpc.js';

export const battlesRouter = router({
  list: publicProcedure
    .input(
      z
        .object({
          status: z.enum(['upcoming', 'active', 'closed']).optional(),
        })
        .optional()
    )
    .query(() => {
      // TODO(phase-2): query battles and participant counts.
      return [] as Array<{
        id: string;
        title: string;
        status: string;
        closesAt: string;
      }>;
    }),

  submit: protectedProcedure
    .input(
      z.object({
        battleId: z.string().uuid(),
        imageUrl: z.string().url(),
      })
    )
    .mutation(() => {
      // TODO(phase-2): validate battle is active and store submission.
      return { id: 'todo', status: 'queued' };
    }),
});
