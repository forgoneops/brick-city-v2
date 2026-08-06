// Cron entry point for automatic ranking season rotation. Safe to invoke on
// every tick (recommended: daily) — rotateSeasonIfDue() only actually closes
// and opens a season once SEASON_CADENCE_DAYS has elapsed, so this is a
// no-op the rest of the time. See docs/deploy.md ("Ranking season cadence")
// and docs/DECISIONS.md for why this exists as a standalone script rather
// than an in-process timer (same single-instance/no-scheduler caveat as the
// nightly recalc stub — cron is the actual scheduler in this app's deploy
// topology).
// Usage: DATABASE_URL=... npm run season:rotate -w @bcv2/server
import { rotateSeasonIfDue } from './modules/ranking/scoring.js';

const result = await rotateSeasonIfDue();
if (result.rotated) {
  console.log(`Season rotated: now "${result.season?.name}" (started ${result.season?.startsAt.toISOString()})`);
} else {
  console.log(`No rotation due yet (active season "${result.season?.name}" started ${result.season?.startsAt.toISOString()})`);
}
process.exit(0);
