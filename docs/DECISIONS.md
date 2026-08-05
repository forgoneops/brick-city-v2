# Phase 3 — implementation decisions

Non-trivial calls made while building Ranking / Forum / Subscriptions+Wallet
under the autonomy directive, so they're reviewable after the fact instead of
just disappearing into the diff.

## Ranking

- **All-time bucket uses a sentinel `seasonId`, not `NULL`.** MySQL unique
  indexes treat every `NULL` as distinct, so a nullable `seasonId` would let
  duplicate all-time rows slip past the `(userId, scope, scopeKey, seasonId)`
  unique index. `ALLTIME_SEASON_ID = 'alltime'` is used instead.
- **Seasonal vs all-time is a time-window query, not incremental deltas.**
  `rankingScores` is a materialized cache, but each recalculation re-sums the
  underlying events (props received, battle votes, uploads, check-ins) —
  unbounded for all-time, filtered to `createdAt >= season.startsAt` for the
  active season. This makes "close season -> new season starts at zero while
  all-time keeps its total" fall out for free, with no migration/archival step
  needed on season close.
- **City/category scope buckets use the user's full score, not partial
  attribution.** A user shows up in a city's leaderboard if they have live
  content (photo or pin) in that city, and their score there is their whole
  score — not the fraction of points earned specifically in that city. Precise
  per-city/per-category point attribution would need a per-content-item point
  ledger, which is a bigger lift than this phase calls for. Documented here so
  it's an intentional simplification, not an oversight, if it needs revisiting.
- **Battle votes wired as a schema-only points source.** `battleVotes` exists
  and is summed into scoring, but nothing writes to it yet since the battles
  module stays hidden (`FEATURES.battles = false`). Matches the brief's "wire
  points source anyway."
- **Check-ins are now real** (`map.checkIn` persists to a `checkIns` table)
  since ranking's activity weight needs a real source — this also resolves the
  pre-existing `TODO(phase-3)` on that endpoint. Dedupe is one credited
  check-in per user per pin (not per-day) — simplest reasonable interpretation
  for a v1 feature; revisit if abuse becomes a real concern.
- **Scoring weights** (`apps/server/src/modules/ranking/scoring.ts`):
  props received x1, battle vote x2, upload x3, check-in x1. No spec value was
  given; picked so original content (uploads) outweighs a single prop, and
  kept in one constant object so they're trivial to retune later.
- **Nightly job is a callable stub, not a running cron.** `runNightlyRecalc()`
  exists and is reachable via `admin.ranking.recalculateAll` for ops/manual
  runs and E2E verification; actually scheduling it is Phase 5 (hardening +
  deploy) territory per `docs/plan.md`.

## Schema / migrations

- **One combined migration for all three modules, generated and applied in
  the 3a (ranking) commit**, even though forum/subscriptions tables aren't
  used by any router until the 3b/3c commits land. Drizzle migrations are
  additive and idempotent, so an unused table sitting in the DB ahead of its
  feature is harmless, and this avoids any risk of schema drift between
  commits (each commit after the first migrates cleanly with zero further DB
  changes). The alternative — splitting `schema.ts` itself into three
  sequential edits to get three independent migrations — added editing
  overhead without a real correctness benefit for a repo this size.

## Forum

- **Thread body lives in the first reply, not on the thread row**, matching
  the table shape given in the brief (`forumThreads` has no `body` column) and
  the pre-existing stub's own TODO ("insert thread + opening post").
- **Forum categories are seeded from the existing `FORUM_CATEGORIES` shared
  constant** (general/spots/gear/events/battles/meta) but now live in a real
  `forumCategories` table so they're orderable/extensible from the DB instead
  of a compile-time enum. No admin UI to add/edit categories was requested, so
  that's left as future CMS-phase work.
- **Moderation (pin/lock/delete) is gated by a new `moderatorProcedure`**
  (`protectedProcedure` + `roleGuard('admin', 'moderator')` in `trpc.ts`) and
  surfaced both inline on the thread view and in a new Admin panel section, to
  satisfy "wired into existing admin panel."

## Subscriptions + wallet

- **`walletTransactions` was extended in place**, not replaced — Phase 0 had
  already shipped this table with `(id, userId, amountCents, reason,
  createdAt)`. Added `type`/`provider`/`providerRef`/`status` alongside the
  existing `reason` column rather than dropping it, per "modify, don't
  regenerate."
- **Wallet balance stays on `users.walletBalanceCents`** (Phase 0's existing
  column) rather than a separate `wallets` table — the brief explicitly
  allowed either, and a second table for a single int would just be an extra
  join everywhere.
- **Payment providers are mock-only until real keys exist.** All three
  provider ids (stripe/przelewy24/paypal) resolve to the same in-process
  `MockPaymentProvider`, which completes a checkout synchronously — no actual
  redirect/webhook round trip is needed to credit a wallet in dev/test. A real
  `POST /webhooks/:provider` endpoint still exists and runs the same ledger
  code path, so swapping in a real Stripe/P24 adapter later only means
  replacing the provider implementation, not the call sites. **No real
  provider keys are stored anywhere in the repo** — `paymentProviders.enabled`
  is a bool flag and `keyPlaceholder` is always a literal placeholder string,
  never a secret.
- **`requireActiveAccess` is now real** (reads `subscriptions` + wallet
  balance + the persisted paywall config from `site_content`, auto-debits if
  the wallet can cover the price) but is only wired onto content-creation
  endpoints for this phase — `gallery` upload, `map.submit`, and
  `forum.createThread`/`forum.reply`. Read access (browsing gallery/map/forum)
  stays open. Gating every read endpoint too is a straightforward extension
  using the same `activeAccessProcedure`, but wasn't required by the brief and
  would make manual/E2E testing of the other two modules unnecessarily
  paywall-gated.
- **Paywall config now persists to `site_content`** (`paywall_enabled`,
  `paywall_price_cents` keys), replacing the old compile-time-default stub in
  `subscriptions.getPaywallConfig`/`setPaywallConfig`.
- **Staff bypass added to `evaluateAccess`**: admin/moderator accounts always
  pass, ahead of the trial/subscription/auto-debit checks. Not explicitly
  requested, but without it the seeded admin (and any real moderator) would
  get paywall-blocked out of the portal they're supposed to moderate.
- **Only three endpoints are actually gated this phase**: `map.submit`,
  `forum.createThread`, `forum.reply` (via a new `activeAccessProcedure` in
  `trpc.ts`), plus the raw `POST /upload` route (via a manual `evaluateAccess`
  call, since it's a Hono handler, not a tRPC procedure). Everything else —
  browsing gallery/map/forum, gallery props — stays open regardless of
  paywall state. `gallery.upload` currently has no frontend call site at all
  (Gallery.tsx only browses + props; there's no upload form), so that gate is
  real but unexercised by the UI today — documented as a 402 contract for
  whenever an upload UI gets built.
- **Auto-debit price is read live at debit time**, not the `priceCents`
  frozen on the `subscriptions` row at registration, and gets written back
  onto the row after a successful debit. If admin changes the price mid-cycle,
  already-active subscribers keep their current period at the old price —
  no retroactive re-charge, only the next debit picks up the new price.
