# Post-launch — auth.login accepts email or nick

- **Branch is a one-time `z.string().email().safeParse` shape check, not a
  try-email-then-try-nick fallback chain.** If the identifier looks like an
  email, it's looked up by `users.email`; otherwise by the unique
  `users.nick`. A real nick can never accidentally look email-shaped in this
  app (nicks are seeded as plain uppercase handles like `GATEKEEPER`), so
  there's no realistic collision case where the wrong branch fires.
- **Renamed the request field to `identifier`** (was `email`) on both the
  tRPC input and `useAuth().login()`'s parameter — a field literally called
  `email` that sometimes holds a nick would be actively misleading to the
  next person touching this code.
- **Login.tsx's input type changed from `email` to `text`.** The browser's
  built-in `type="email"` validation would reject a plain nick before the
  form even submits.
- **`login_email` i18n key renamed in place to `login_identifier`** (not
  left as a second unused key) — confirmed nothing else referenced it first.

# Post-launch — invite-only registration toggle, logo texture pass

## Registration: admin-togglable invite-only

- **Whether an invite is required is decided by presence, not by a second
  branch on `inviteOnly`.** `auth.register` only rejects up front when
  `inviteOnly && !input.inviteCode`; if a code IS provided, it's always
  validated and redeemed, in both invite-only and open modes. This is what
  makes "open mode still honors a provided code" fall out for free instead
  of needing its own branch — one `if (input.inviteCode)` guards the whole
  lookup/validate/redeem block, and one `if (invite)` guards the
  usedCount-increment/redemption-row block at the end.
- **New `registration` CMS domain defaults to `{ inviteOnly: true }`** — the
  toggle itself ships with zero behavior change until an admin opens it,
  same convention as `announcement.showAsPopup`'s rollout.
- **Frontend sends `undefined`, not `""`, for an omitted code.** The server
  schema is `z.string().min(1).optional()` — an empty string would still
  fail the inner `.min(1)`. `Invite.tsx` sends `code.trim() || undefined`.

## Logo: street-texture pass (2nd revision)

- Same file-integrity discipline as the first replacement: verified via
  Python's `xml.dom.minidom` (no `xmllint` on this box) and a real headless-
  browser screenshot at 375px mobile width, not just the isolated SVG —
  confirmed the added texture (irregular plate edges, spray-mist dots, a
  slightly offset ghost layer under the B, one small drip) stays subtle
  enough at header size (~28px) not to compromise legibility, which was
  the whole reason the previous mark got replaced.

# Post-launch — localize the legal/Terms popup, seed real content

- **Real gap, caught before it shipped wrong**: the `legal` CMS domain landed
  as a single flat `{ text, version }` field — every visitor would have seen
  the same language regardless of their own locale, unlike every other
  user-facing string in this app (which all go through `en/pl/de` i18n or
  `localeOverrides`). Changed to `{ version, pl, en, de }`.
- **Old rows written under the flat shape aren't migrated/backfilled** —
  `readDomain` doesn't run schema validation on read (documented already for
  `announcement.showAsPopup`'s rollout), so a pre-existing `cms_legal` row
  from before this change would come back missing `pl`/`en`/`de` entirely.
  Not a concern for production specifically: no admin session had ever
  actually saved real content there yet (only the untouched placeholder
  default), so there was nothing to migrate — confirmed by checking
  production's actual stored value before writing the real content in this
  same batch, not assumed.
- **Fallback locale is `pl`, not `en`**, when the active site locale's field
  is empty — `pl` is this Service's actual governing-law language (§13 of
  the real text: "obowiązują przepisy prawa polskiego" / Polish law
  applies), and the one field guaranteed to be filled in from day one.
- **Real regulamin/Terms text seeded directly via `setDomainConfig()` inside
  the running container**, not through the HTTP API with an admin session
  token — goes through the exact same Zod validation and cache invalidation
  the admin panel uses, without needing to mint or handle a real credential
  for a one-off content seed.

# Post-launch — battles module, first-visit popups, real payment adapters

## Battles module

- **`battleVotes.battleId` was left without a FK to the new `battles` table.**
  It's an existing column on an existing table; adding a FK there would be an
  unrelated migration hunk mixed into this batch's diff. Voting itself is
  still a future module — nothing writes to `battleVotes` yet either way.
- **`battles.list` is the only list query — no separate admin-only variant.**
  It's a `publicProcedure` with an optional status filter; the admin panel
  calls it with no filter to see everything (including `closed`), so there's
  one query to keep correct instead of two.
- **Battle submission reuses the existing gallery `/upload` HTTP endpoint**
  rather than a parallel upload pipeline — `battles.submit` only ever needs
  the `imageUrl` it returns. Side effect: a battle submission also creates a
  `photos` row (upload's own behavior, unconditional) — treated as
  acceptable/likely-desired (a battle piece is a real piece, reasonable for
  it to also appear in the public gallery), not something this module tries
  to suppress.
- **`battles.submit` is `activeAccessProcedure`** (paywall-gated), matching
  `map.submit`/`forum.createThread` — consistent with "content creation
  endpoints are gated, browsing isn't."
- **Fixed two stale UI artifacts found while touching this area**: `AdminCms.tsx`
  still displayed "(FORCED OFF — see CLAUDE.md)" next to the `battles` feature
  flag, and `App.tsx` had a comment claiming the battles route was
  code-only/unreachable — both predate the battles launch commit and were
  never cleaned up. Removed; no behavior change.
- **Found and fixed during verification, not just written and assumed**: the
  CONFLICT-on-duplicate-submission check initially read `err.code ===
  'ER_DUP_ENTRY'` directly on the caught error, which never matched — a real
  duplicate submit came back as a raw 500, not 409. drizzle-orm wraps the
  actual mysql2 driver error in its own `DrizzleQueryError`, with the
  original (carrying `.code`) attached as `.cause`, not merged onto the
  thrown error itself. Fixed to check `err.cause?.code`; re-verified live
  (duplicate submit now correctly 409s) rather than trusting the fix without
  re-running the failing case.

## First-visit popups (Terms then News)

- **New `Modal` component has no backdrop-click, Escape, or built-in close
  icon** — every instance supplies its own `footer` with explicit action
  button(s). This makes "blocking" the *default* for a modal with no
  dismiss action in its footer (the Terms popup), rather than a flag that
  has to be remembered and threaded through — can't forget to make it
  non-dismissible, there's just no path to dismiss unless you add one.
- **`showAsPopup` extends the existing `announcement` CMS domain** instead of
  a new domain — the popup is explicitly "the same content, shown once as a
  nudge," not independent content, so one source of truth for the text.
- **Re-trigger keys are content-addressed, not a single "seen it" flag**:
  `localStorage['bcm-legal-accepted-version']` stores the accepted
  `legal.version` int; `localStorage['bcm-news-seen-at']` stores the last-seen
  `announcement.updatedAt` ISO string. Editing either later (bumping version,
  or re-saving the announcement) re-surfaces exactly that popup for everyone,
  with no server-side "who's seen what" tracking needed.
- **⚠️ `legal.text` default is a literal placeholder
  (`[PLACEHOLDER — owner to supply final regulamin text]`), shipped
  deliberately** per the brief — do not treat this as real terms text. Every
  visitor currently accepts a placeholder. Needs the site owner's real
  regulamin text and explicit sign-off before this is a real legal gate;
  flagged again in the deploy report.

## Real payment provider adapters (Stripe + Przelewy24), keys deferred

- **Przelewy24 client is `@mrboombastic/node-przelewy24`** (actively
  maintained, TypeScript-native, MIT) rather than a hand-rolled REST client —
  verified for real before depending on it: pulled the actual published
  tarball and read its compiled `.d.ts` (not just the README) to confirm
  `P24.createTransaction`/`verifyNotification`/`verifyTransaction`/
  `getTransaction` and the exact `Order`/`NotificationRequest`/`Verification`
  field shapes, rather than inventing endpoint behavior.
- **Found and fixed a real bug this batch's own premise would otherwise
  have shipped**: `subscriptions.topUp` unconditionally called
  `creditWallet()` right after `createCheckout()` for every provider,
  mock or real. That's correct for the mock (nothing to wait for) but is a
  genuine over-crediting bug for a real provider — a Stripe/P24 checkout
  session existing means nothing about payment has happened yet. Fixed by
  having `createCheckout()` return an optional `redirectUrl`; when present,
  `topUp` returns it to the caller instead of crediting, and crediting only
  ever happens from the webhook path once the provider actually confirms
  funds moved. Since neither real provider has keys or an enabled switch
  yet, this path is unreachable today — but "code-ready" has to mean
  actually safe the moment it's switched on, not just present.
- **`userId` round-trips through the webhook two different ways**, matched
  to what each provider actually supports: Stripe Checkout Sessions have a
  real `metadata` field, so `{ userId }` goes there directly. P24's
  `Order`/`NotificationRequest` have no free-form metadata field at all —
  `sessionId` is entirely ours to choose, so the userId is encoded into it
  (`topup_<userId>_<uuid>`) and parsed back out on the webhook. No new DB
  table for a pending-checkout mapping either way.
- **P24's `Order.email` is required but `createCheckout()`'s params aren't**
  (matching the existing `PaymentProvider` interface, unchanged) — the P24
  adapter looks the user's email up from `users` by `userId` internally
  rather than widening the shared interface for one provider's requirement.
- **`returnUrl` is a new optional client-supplied field on `topUp`**, not a
  new env var — Stripe/P24 both need an absolute success/return URL, and the
  brief's env var list is closed to exactly six vars. The browser is the
  only party that reliably knows its own origin, so it's threaded through
  from the client at call time instead; the currently-reachable mock path
  ignores it entirely, so this is a no-op change for anything live today.
- **PayPal's env-var placeholders were removed, not migrated** — the old
  `.env.production.example` had commented-out `PAYPAL_CLIENT_ID`/
  `PAYPAL_CLIENT_SECRET` stubs from Phase 3c. Since PayPal has no real
  adapter and stays mock permanently by explicit instruction, keeping
  placeholders for env vars nothing will ever read would be actively
  misleading.
- **Old `PRZELEWY24_MERCHANT_ID`/`PRZELEWY24_API_KEY` placeholder names were
  replaced with `P24_MERCHANT_ID`/`P24_POS_ID`/`P24_CRC`/`P24_API_KEY`**
  (per the brief's exact env var list) — the old names were never read by
  any code, so this is a pure rename, not a breaking change to a working
  config.
- **Frontend redirect handling is explicitly not part of this batch.**
  `Profile.tsx`'s top-up flow still assumes the mock's synchronous
  `{walletBalanceCents}` response; it doesn't yet branch on a `redirectUrl`
  response. Documented in `docs/deploy.md`'s switch-over procedure as
  follow-up work for whenever a provider is actually about to go live —
  building a real payment redirect UI against providers with no keys yet
  would be speculative work with nothing real to test it against.

# Post-launch — ranking season cadence

- **Resolved the "ranking season cadence" open item from `docs/plan.md`:
  monthly (`SEASON_CADENCE_DAYS`, env-overridable, default 30)** — the value
  already implied everywhere else in the app (subscription billing period,
  CMS copy), so it needs no new product decision to pick.
- **Rotation is a cron-driven script (`apps/server/src/rotateSeason.ts`,
  `npm run season:rotate -w @bcv2/server`), not an in-process timer** — same
  single-instance/no-scheduler reasoning as the Phase 3 nightly recalc stub;
  cron is the actual scheduler in this app's deploy topology (see
  `docs/deploy.md`). `rotateSeasonIfDue()` only actually closes/opens a
  season once the active one has run its full cadence, so invoking it on
  every tick (recommended: daily) is safe and idempotent.
- **Also exposed as `admin.ranking.rotateSeasonIfDue`** (on-demand check/force
  from the admin UI/API) alongside the cron script, both calling the same
  function — manual `admin.ranking.closeSeason` still exists for an
  off-cycle reset with an arbitrary name.

# Phase 3 — implementation decisions

Non-trivial calls made while building Ranking / Forum / Subscriptions+Wallet
under the autonomy directive, so they're reviewable after the fact instead of
just disappearing into the diff.

# Phase 5 — implementation decisions

## Hardening

- **Turnstile is real-but-mock, same pattern as Phase 3c's payment
  providers.** `lib/turnstile.ts`'s `verifyTurnstile()` is a no-op (always
  passes) until `TURNSTILE_SECRET_KEY` is set in the environment — genuinely
  impossible to exercise against the real Cloudflare API without a real site
  registered there, so it's stubbed per the autonomy directive rather than
  blocking on it. Wired onto `auth.register` only (the actual bot target —
  invite-code brute forcing / spam account creation), not on every
  authenticated action; a Turnstile widget on every forum reply would be
  bad UX for no real anti-abuse benefit once someone already has an account.
- **Rate limiting is in-process, fixed-window, keyed by user id (if
  authenticated) or IP.** Same single-instance caveat as the CMS config
  cache — correct for this app's actual deploy topology (see
  `docs/deploy.md`), would need a shared store (Redis) behind a load
  balancer. Applied to: `auth.login` (10/min/IP), `auth.register` (5/min/IP),
  `POST /upload` (10/min/user-or-IP), `forum.createThread` (10/min/user),
  `forum.reply` (20/min/user) — the abuse-prone surfaces named in the brief,
  not blanket-applied to read endpoints (browsing gallery/map/forum/ranking
  isn't a meaningful abuse vector and rate-limiting it would only degrade
  legitimate use).
- **Validation sweep found one real gap**: `localeOverridesConfigSchema` had
  no length caps at all (an admin session could write an arbitrarily large
  blob into `site_content`) — fixed with sane caps (8-char locale keys,
  128-char override keys, 2000-char values). Everything else audited
  (`dangerouslySetInnerHTML`, raw SQL string interpolation, `eval`/`Function`
  construction) came back clean — grepped zero hits across both apps, not
  just spot-checked. Added max-length caps to the two remaining unbounded
  admin-only free-text fields (`cms.posts.create`/`cms.pages.upsert` body,
  20000 chars) as defense-in-depth even though those are admin-gated, not
  public-facing.

## Deploy prep

- **Dockerfile bug found and fixed by actually building and running the
  image, not just writing it.** The first version only copied `dist/` into
  the runtime stage; `drizzle-kit migrate` (run on container boot, before
  `node dist/index.js`) crashed with `Cannot find module './src/env.js'`
  because `drizzle.config.ts` reads `./src/env.js` and `./src/db/schema.ts`
  directly via drizzle-kit's own TS loader — independent of the tsc build
  output, so `dist/` alone isn't enough. Fixed by also copying `apps/server/
  src` into the runtime image. Verified end to end: built the image,
  ran it against the real docker-compose mysql (`--network host`), confirmed
  the migrate-then-start boot sequence and a live `cms.getConfig` response
  matching the DB state from earlier in this session's testing.

- **Cross-origin asset URLs are a known, documented limitation, not fixed
  this phase.** `storage.url(key)` returns a relative `/uploads/...` path
  (`lib/storage.ts`), which only resolves correctly when the frontend and
  backend share an origin (reverse-proxied together) or when the frontend
  is configured to prefix API-origin URLs. `docs/deploy.md` recommends the
  same-origin reverse-proxy topology as the default specifically to sidestep
  this — the alternative (rewriting `storage.url()` to emit absolute URLs)
  is real work that only matters once someone actually deploys frontend and
  backend to different domains with local disk storage, which the
  recommended topology avoids needing in the first place.
- **`VITE_API_BASE_URL` added to the tRPC client** (`lib/trpc.ts`), empty
  string default (today's same-origin relative `/trpc` behavior, unchanged)
  so a cross-origin frontend/backend split remains possible without a code
  change, just an env var — but see the note above about `/uploads` still
  needing same-origin (or a real object-storage driver) in that topology.

# Phase 4 — implementation decisions

## Bug found and fixed: /events rendered a stub, not the real page

`App.tsx` imports `Events` from `pages/Events.js`, which was still the
Phase-0 `ModulePage` stub. The real, working implementation (fetches
`events.list`, renders a live list) existed as a *second* export named
`Events` inside `pages/News.tsx`, unreferenced by anything. Net effect: the
`/events` route rendered an empty "EVENTS / NEXT BURN" placeholder in
production despite the backend and a correct component both existing. Found
while auditing routing/nav for Phase 4's nav-config work. Fixed by moving the
real implementation into `Events.tsx` and trimming the now-dead `EventItem`
type out of `News.tsx`; no behavior intentionally changed.

## CMS backbone

- **Config domains are JSON blobs in the existing `site_content` kv table**,
  not new typed tables — `hero`, `announcement`, `nav`, `galleryCategories`,
  `battleThemes`, `featureFlags`, `localeOverrides` each get one row keyed
  `cms_<domain>`, parsed/validated through a zod schema in
  `modules/cms/config.ts`. Info pages are the one exception: they get a real
  `cmsPages` table, since per-slug CRUD and per-page optimistic locking don't
  fit one shared blob cleanly.
- **`subscriptionPriceCents` "moved" without duplicating storage.** The CMS
  pricing tab's `setConfig({key:'pricing'})` delegates straight to
  `subscriptions/access.ts`'s existing `getPersistedPaywallConfig`/
  `setPersistedPaywallConfig` (built in Phase 3c) rather than adding a second
  `cms_pricing` row that could drift out of sync with what `evaluateAccess`
  actually reads.
- **Optimistic locking is a plain `expectedUpdatedAt` string compare**, not a
  version counter: the client passes back the `updatedAt` it last read for
  that domain (or omits it entirely to skip the check, e.g. `reorderNav`'s
  read-modify-write). Good enough for a single-admin-at-a-time CMS; a version
  counter would only matter under real concurrent-editor contention, which
  this product doesn't have.
- **`battles` is force-clamped to `false` in the merged `featureFlags`
  output**, regardless of what's stored in the `cms_feature_flags` row. The
  admin UI's toggle is fully real (persists, round-trips) — battles is
  included specifically as the flip's worked example — but the *effective*
  value served to `getConfig` always wins false, per the standing CLAUDE.md
  rule. Any other future flag added to the map is NOT special-cased and
  behaves as a normal CMS-driven toggle.
- **The "new nav entry" for Site CMS lives inside the Admin page, not the
  public sidebar.** `Layout.tsx`'s sidebar nav has no concept of role-gating
  today (it renders the same items to every visitor) and `/admin` itself was
  already reached by direct URL only, not a sidebar link. Adding "Site CMS"
  to the public nav would show an admin-only link to every regular visitor.
  Instead it's a prominent gate-icon link at the top of `Admin.tsx` pointing
  to the new `/admin/cms` route — discoverable from the admin surface,
  invisible to everyone else.
- **In-process cache, invalidated on every write.** `getCmsConfig()` caches
  in a module-level variable; every `setConfig`/`reorderNav`/`pages.*`
  mutation (and the raw `cms.setContent` escape hatch) calls
  `invalidateCmsCache()`. Correct for this single-instance deploy; a
  multi-instance deploy would need a real cache-invalidation bus, which is
  Phase 5/production-topology territory, not this phase's.

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
- **Timestamp precision bug found and fixed during E2E verification**: season
  close + an immediate same-second event could silently drop that event from
  the new season. `seasons.startsAt`/`endsAt` and every `createdAt` column
  scoring compares against now use `timestamp(fsp: 3)`, and the app sets
  `createdAt` explicitly at every scoring-relevant insert instead of relying
  on MySQL's `defaultNow()` — its bare `NOW()` truncates to whole seconds
  regardless of the column's declared precision. Full root-cause writeup is
  in the fix commit message.

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
