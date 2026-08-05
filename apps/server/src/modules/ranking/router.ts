import { z } from 'zod';
import { and, desc, eq } from 'drizzle-orm';
import { publicProcedure, protectedProcedure, router } from '../../trpc.js';
import { getDb } from '../../db/index.js';
import { ALLTIME_SEASON_ID, rankingScopeValues, rankingScores, users } from '../../db/schema.js';
import { getActiveSeason, scopeKeysFor } from './scoring.js';

const seasonInput = z.union([z.literal('current'), z.literal('alltime'), z.string()]);

async function resolveSeasonId(input: string): Promise<string | null> {
  if (input === 'alltime') return ALLTIME_SEASON_ID;
  if (input === 'current') {
    const active = await getActiveSeason();
    return active?.id ?? null;
  }
  return input;
}

const LEADERBOARD_LIMIT = 50;

export const rankingRouter = router({
  leaderboard: publicProcedure
    .input(
      z
        .object({
          scope: z.enum(rankingScopeValues).default('global'),
          scopeKey: z.string().optional(),
          season: seasonInput.default('current'),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = getDb();
      const seasonId = await resolveSeasonId(input?.season ?? 'current');
      if (!seasonId) {
        return { seasonId: null, rows: [] };
      }
      const scope = input?.scope ?? 'global';
      const scopeKey = input?.scopeKey ?? '';

      const rows = await db
        .select({
          userId: rankingScores.userId,
          nick: users.nick,
          points: rankingScores.points,
        })
        .from(rankingScores)
        .innerJoin(users, eq(rankingScores.userId, users.id))
        .where(
          and(
            eq(rankingScores.scope, scope),
            eq(rankingScores.scopeKey, scopeKey),
            eq(rankingScores.seasonId, seasonId)
          )
        )
        .orderBy(desc(rankingScores.points))
        .limit(LEADERBOARD_LIMIT);

      return {
        seasonId,
        rows: rows.map((r, i) => ({ position: i + 1, userId: r.userId, nick: r.nick, points: r.points })),
      };
    }),

  myPosition: protectedProcedure
    .input(
      z
        .object({
          scope: z.enum(rankingScopeValues).default('global'),
          scopeKey: z.string().optional(),
          season: seasonInput.default('current'),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const seasonId = await resolveSeasonId(input?.season ?? 'current');
      if (!seasonId) return null;
      const scope = input?.scope ?? 'global';
      const scopeKey = input?.scopeKey ?? '';

      const rows = await db
        .select({ userId: rankingScores.userId, points: rankingScores.points })
        .from(rankingScores)
        .where(
          and(
            eq(rankingScores.scope, scope),
            eq(rankingScores.scopeKey, scopeKey),
            eq(rankingScores.seasonId, seasonId)
          )
        )
        .orderBy(desc(rankingScores.points));

      const index = rows.findIndex((r) => r.userId === ctx.user.id);
      if (index === -1) return null;
      return { position: index + 1, points: rows[index].points };
    }),

  scopeKeys: publicProcedure
    .input(
      z
        .object({ scope: z.enum(rankingScopeValues).default('global'), season: seasonInput.default('current') })
        .optional()
    )
    .query(async ({ input }) => {
      const seasonId = await resolveSeasonId(input?.season ?? 'current');
      if (!seasonId) return [];
      return scopeKeysFor(input?.scope ?? 'global', seasonId);
    }),

  activeSeason: publicProcedure.query(async () => {
    const season = await getActiveSeason();
    if (!season) return null;
    return {
      id: season.id,
      name: season.name,
      startsAt: season.startsAt.toISOString(),
      endsAt: season.endsAt?.toISOString() ?? null,
    };
  }),
});
