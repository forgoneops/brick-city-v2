import { z } from 'zod';
import { publicProcedure, router } from '../../trpc/trpc.js';

/**
 * Ranking module — STUB (Phase 3a: vote-based writer leaderboard from props +
 * battle votes + activity; global / per city / per category; seasonal reset
 * or all-time configurable from admin).
 * TODO(phase-3a): score aggregation pipeline + seasons table.
 */
export const rankingRouter = router({
  /** Placeholder leaderboard — returns nothing until Phase 3a. */
  leaderboard: publicProcedure
    .input(
      z
        .object({
          scope: z.enum(['global', 'city', 'category']).default('global'),
          season: z.string().optional(),
        })
        .optional(),
    )
    .query(() => ({ entries: [] as unknown[], season: null as string | null })),

  currentSeason: publicProcedure.query(() => ({ season: null as string | null })),
});
