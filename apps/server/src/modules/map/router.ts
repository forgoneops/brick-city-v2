import { z } from 'zod';
import { publicProcedure, protectedProcedure, router } from '../../trpc.js';

export const mapRouter = router({
  listSpots: publicProcedure
    .input(
      z
        .object({
          lat: z.number(),
          lng: z.number(),
          radiusKm: z.number().optional(),
        })
        .optional()
    )
    .query(() => {
      // TODO(phase-2): query geo spots, blur coordinates for non-paying users.
      return [] as Array<{
        id: string;
        label: string;
        isMembersOnly: boolean;
        coordinates: { lat: number; lng: number } | null;
      }>;
    }),

  addSpot: protectedProcedure
    .input(
      z.object({
        label: z.string().min(1),
        lat: z.number(),
        lng: z.number(),
        membersOnly: z.boolean().default(false),
      })
    )
    .mutation(() => {
      // TODO(phase-2): insert spot after moderator review.
      return { id: 'todo', status: 'pending' };
    }),
});
