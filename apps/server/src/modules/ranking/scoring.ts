import { randomUUID } from 'node:crypto';
import { and, eq, gte, sql } from 'drizzle-orm';
import { getDb } from '../../db/index.js';
import {
  ALLTIME_SEASON_ID,
  battleVotes,
  checkIns,
  photos,
  pins,
  props,
  rankingScores,
  seasons,
  type Season,
} from '../../db/schema.js';

// See docs/DECISIONS.md ("Ranking") for the rationale behind every choice
// on this page — the sentinel all-time season id, the time-window (not
// incremental) recomputation, and the city/category scope simplification.
const WEIGHTS = {
  PROPS_RECEIVED: 1,
  BATTLE_VOTE: 2,
  UPLOAD: 3,
  CHECK_IN: 1,
};

async function getActiveSeason(): Promise<Season | null> {
  const db = getDb();
  const [row] = await db.select().from(seasons).where(eq(seasons.isActive, true));
  return row ?? null;
}

async function computeUserPoints(userId: string, since: Date | null): Promise<number> {
  const db = getDb();

  const propsConditions = [eq(photos.authorId, userId), eq(photos.status, 'live')];
  if (since) propsConditions.push(gte(props.createdAt, since));
  const [propsRow] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(props)
    .innerJoin(photos, eq(props.photoId, photos.id))
    .where(and(...propsConditions));

  const voteConditions = [eq(battleVotes.submissionUserId, userId)];
  if (since) voteConditions.push(gte(battleVotes.createdAt, since));
  const [votesRow] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(battleVotes)
    .where(and(...voteConditions));

  const uploadConditions = [eq(photos.authorId, userId), eq(photos.status, 'live')];
  if (since) uploadConditions.push(gte(photos.createdAt, since));
  const [uploadsRow] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(photos)
    .where(and(...uploadConditions));

  const checkInConditions = [eq(checkIns.userId, userId)];
  if (since) checkInConditions.push(gte(checkIns.createdAt, since));
  const [checkInsRow] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(checkIns)
    .where(and(...checkInConditions));

  return (
    Number(propsRow.count) * WEIGHTS.PROPS_RECEIVED +
    Number(votesRow.count) * WEIGHTS.BATTLE_VOTE +
    Number(uploadsRow.count) * WEIGHTS.UPLOAD +
    Number(checkInsRow.count) * WEIGHTS.CHECK_IN
  );
}

async function footprintForUser(userId: string): Promise<{ cities: string[]; categories: string[] }> {
  const db = getDb();
  const cityRows = await db
    .selectDistinct({ city: photos.city })
    .from(photos)
    .where(and(eq(photos.authorId, userId), eq(photos.status, 'live')));
  const pinCityRows = await db
    .selectDistinct({ city: pins.city })
    .from(pins)
    .where(and(eq(pins.authorId, userId), eq(pins.status, 'live')));
  const categoryRows = await db
    .selectDistinct({ category: photos.category })
    .from(photos)
    .where(and(eq(photos.authorId, userId), eq(photos.status, 'live')));

  const cities = new Set<string>();
  for (const row of [...cityRows, ...pinCityRows]) {
    if (row.city) cities.add(row.city);
  }
  const categories = new Set<string>();
  for (const row of categoryRows) {
    if (row.category) categories.add(row.category);
  }

  return { cities: [...cities], categories: [...categories] };
}

type Tx = Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0];

async function upsertScore(
  tx: Tx,
  userId: string,
  scope: 'global' | 'city' | 'category',
  scopeKey: string,
  seasonId: string,
  points: number
) {
  await tx
    .insert(rankingScores)
    .values({ id: randomUUID(), userId, scope, scopeKey, seasonId, points })
    .onDuplicateKeyUpdate({ set: { points } });
}

// Recalculates every (scope, scopeKey) bucket a user appears in, for both the
// active season (if any) and the all-time bucket. Called after any event
// that can move a user's score (props received, upload, check-in). The
// bucket writes run in one transaction so a mid-loop failure can't leave a
// user's global score out of sync with their city/category buckets.
export async function recalculateUserScore(userId: string): Promise<void> {
  const db = getDb();
  const activeSeason = await getActiveSeason();
  const allTimePoints = await computeUserPoints(userId, null);
  const seasonPoints = activeSeason
    ? await computeUserPoints(userId, activeSeason.startsAt)
    : allTimePoints;
  const { cities, categories } = await footprintForUser(userId);

  const buckets: Array<{ scope: 'global' | 'city' | 'category'; scopeKey: string }> = [
    { scope: 'global', scopeKey: '' },
    ...cities.map((city) => ({ scope: 'city' as const, scopeKey: city })),
    ...categories.map((category) => ({ scope: 'category' as const, scopeKey: category })),
  ];

  await db.transaction(async (tx) => {
    for (const bucket of buckets) {
      await upsertScore(tx, userId, bucket.scope, bucket.scopeKey, ALLTIME_SEASON_ID, allTimePoints);
      if (activeSeason) {
        await upsertScore(tx, userId, bucket.scope, bucket.scopeKey, activeSeason.id, seasonPoints);
      }
    }
  });
}

// Nightly-job stub: full recompute for every user with any live footprint.
// Not wired to an actual scheduler here (Phase 5 territory) but callable
// directly for ops/testing via admin.ranking.recalculateAll.
export async function runNightlyRecalc(): Promise<number> {
  const db = getDb();
  const photoAuthors = await db
    .selectDistinct({ userId: photos.authorId })
    .from(photos)
    .where(eq(photos.status, 'live'));
  const pinAuthors = await db
    .selectDistinct({ userId: pins.authorId })
    .from(pins)
    .where(eq(pins.status, 'live'));

  const userIds = new Set<string>();
  for (const row of [...photoAuthors, ...pinAuthors]) {
    if (row.userId) userIds.add(row.userId);
  }

  for (const userId of userIds) {
    await recalculateUserScore(userId);
  }
  return userIds.size;
}

// Season close: archive-by-construction (all-time already reflects every
// event ever, unbounded) — closing just deactivates the current season and
// opens a fresh one. New season starts every user's seasonal bucket at zero
// the next time their score is recalculated.
export async function closeActiveSeasonAndOpenNext(nextName: string): Promise<Season> {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(seasons).where(eq(seasons.isActive, true));
    if (current) {
      await tx
        .update(seasons)
        .set({ isActive: false, endsAt: new Date() })
        .where(eq(seasons.id, current.id));
    }
    const next: Season = {
      id: randomUUID(),
      name: nextName,
      startsAt: new Date(),
      endsAt: null,
      isActive: true,
      createdAt: new Date(),
    };
    await tx.insert(seasons).values(next);
    return next;
  });
}

export async function scopeKeysFor(scope: 'global' | 'city' | 'category', seasonId: string) {
  const db = getDb();
  const rows = await db
    .selectDistinct({ scopeKey: rankingScores.scopeKey })
    .from(rankingScores)
    .where(and(eq(rankingScores.scope, scope), eq(rankingScores.seasonId, seasonId)));
  return rows.map((r) => r.scopeKey).filter(Boolean);
}

export { getActiveSeason };
