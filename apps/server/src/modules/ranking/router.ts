import { publicProcedure, router } from '../../trpc.js';

export const rankingRouter = router({
  topUsers: publicProcedure.query(() => {
    // TODO(phase-2): aggregate battle wins, gallery likes, and spot contributions.
    return [] as Array<{
      rank: number;
      userId: string;
      nick: string;
      score: number;
    }>;
  }),

  topCrews: publicProcedure.query(() => {
    // TODO(phase-2): aggregate crew rankings.
    return [] as Array<{
      rank: number;
      crewId: string;
      name: string;
      score: number;
    }>;
  }),
});
