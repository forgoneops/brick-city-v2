# BRICK CITY MASHIN' v2 — repo guidance for Claude Code

## Identity
- Full-stack community portal for graffiti writers / street art fans.
- Monorepo: `apps/web` (React + TS + Tailwind + Vite + i18n en/pl/de + PWA),
  `apps/server` (Hono + tRPC + Drizzle + MySQL), `packages/shared`.
- Only repo for this work: `github.com/forgoneops/brick-city-v2`, branch `main`.
  Legacy `brick-city-mashin` is a read-only archive — never touch it.

## Design system
- Binding spec: `docs/bcm-design-system.md` ("SIDE ALLEY"). No deviations without
  updating the doc first.
- No emojis in UI or code (docs may use a symbol in a callout, e.g. content warnings).
- No new colors outside the Wet Asphalt token set (`--ink`, `--bone`, `--signal`, etc).
- ≤2px border radius, 1px hairline borders, mono micro-labels ("GALLERY", `WAW-044` style).
- The `.bridge-gap` motif and CUTOUTS icon sprite are the recognizable brand marks — reuse
  them, don't invent parallel motifs.

## Product rules
- `FEATURES.battles` (`apps/web/src/config/features.ts`) is `true` — battles launched on explicit
  owner instruction. The CMS feature-flags toggle controls it live.
- Registration is invite-only. New accounts get a 7-day full-access trial
  (`TRIAL_DAYS` in the auth module), then the paywall applies (~25 PLN/month, toggle-able
  from admin).
- Admin seed placeholder: `admin@brickcity.local` / `brickcity123` (dev/seed only, never
  reuse in production config).

## Working rules
- MODIFY, DON'T REGENERATE. Edit existing files in place; never scaffold over working code.
  If a file is genuinely half-finished, rewrite it wholesale rather than patching around
  guesswork — but don't do that to working code just to restyle it.
- English for all code, comments, commits, and docs.
- Workflow is stage-gated per `docs/plan.md`: each phase ends with verification (tsc clean
  in every workspace, `npm run build` clean, E2E smoke where applicable) → commit → push to
  `origin/main` → report API surface and verification output.
- Compact context only at safe checkpoints (after a green verify + commit), and persist any
  decisions worth keeping into `docs/` or inline TODOs first.
- Local dev DB: `docker-compose.yml` under `apps/server` (mysql:8, root/brickcity). Migrate
  with `npm run db:migrate -w @bcv2/server`, seed with `npm run db:seed -w @bcv2/server`.

## Current phase state (update this section as phases land)
- Phase 0 — monorepo skeleton, JWT auth + roles, invite register, wallet stub, paywall flag,
  8 module stubs, i18n, PWA: **done**.
- Phase 1 — SIDE ALLEY design system (tokens, bridge-gap, icons, signature components,
  mystery layer, 404): **done**.
- Phase 2 — core portal on the backend (DB schema/migrations, gallery upload pipeline,
  props, map pins with moderation queue, zine + events publish flow, admin wired to DB,
  reports queue): **done**, frontend wired to the real tRPC API on top of it.
- Phase 3 — ranking (seasons, scoring, leaderboard), forum (categories/threads/replies/
  props, moderation), subscriptions+wallet (mock payment providers, real paywall gate on
  map.submit/forum.createThread+reply/gallery upload): **done**.
- Phase 4 — full site CMS (typed config over site_content kv, admin /admin/cms with 6 tabs,
  public site reads hero/announcement/nav/gallery-categories/locale-overrides/legal from it,
  /pages/:slug for published info pages): **done**.
- Phase 5 — hardening (Turnstile anti-bot + rate limiting on auth/upload/forum, validation
  sweep) + deploy prep (Dockerfile, backup script, .env.production.example, docs/deploy.md):
  **done**. See `docs/deploy.md` for the actual deploy walkthrough and `docs/DECISIONS.md`
  for every non-obvious call made across all phases.
- Post-launch: invites management (MY INVITES + MOD DESK), the battles module (schema,
  create/submit/CRUD, admin battle control, submission via the gallery upload pipeline),
  live chat + DMs, public profiles + follows + badges, NIGHT WALK palette, Web Push for DMs,
  and a first-visit Terms-then-News popup are all **live**. Real Stripe + Przelewy24 adapters
  exist (`modules/subscriptions/providers.ts`) but stay inert until an operator sets their env
  vars *and* flips the admin on/off switch (`docs/deploy.md`, "Real payment providers") — no
  real keys exist yet, PayPal stays mock permanently. The first-visit Terms popup's legal text
  is a **placeholder** (`docs/DECISIONS.md`) awaiting the site owner's real regulamin text and
  explicit sign-off. Remaining ideas in `docs/plan.md`'s "OPEN DECISIONS" (ranking season
  cadence — resolved; payments provider choice — code exists for both, key/switch is a business
  call) are product/business calls, not implementation gaps.
