# Deploy — Brick City Mashin' v2

Recommended topology: **frontend and backend on the same origin**, behind a
single reverse proxy (nginx/Caddy) doing TLS termination. This is the
default assumed everywhere below — it's simpler than a cross-origin split
and sidesteps a real limitation: `apps/server/src/lib/storage.ts`'s local
storage driver returns relative `/uploads/...` URLs, which only resolve
correctly when uploaded images are served from the same origin as the page
that renders them. A cross-origin split (e.g. frontend on Vercel, backend on
a separate VPS domain) is possible — `VITE_API_BASE_URL` exists for exactly
this — but uploaded images won't load unless you also either (a) proxy
`/uploads` through the frontend host to the backend, or (b) swap in a real
object-storage `StorageDriver` (S3-compatible; the interface in
`lib/storage.ts` is already shaped for this, just needs an adapter) that
returns absolute URLs. See `docs/DECISIONS.md` ("Deploy prep").

## 1. Managed MySQL

Any managed MySQL 8.x works (PlanetScale, AWS RDS, DigitalOcean Managed
Databases, etc). You need:
- A connection string in `mysql://user:password@host:port/dbname` form.
- TLS enabled (check your provider's exact `DATABASE_URL` query-param or
  connection-option convention for requiring it — they differ).
- Nothing else pre-provisioned — `npm run db:migrate -w @bcv2/server` (or the
  Dockerfile's boot sequence, see below) creates the schema from
  `apps/server/drizzle/*.sql`.

Run the initial migration once the DB exists and `DATABASE_URL` is set:
```
npm run db:migrate -w @bcv2/server
```
Do **not** run `npm run db:seed` against production — that script creates
demo accounts with a known password (`brickcity123`). It's Phase 2-5
verification tooling, not a production bootstrap step.

## 2. Backend (VPS)

### Option A — Docker (recommended)

Build from the **monorepo root** (the Dockerfile needs the root
package.json/lockfile for the npm workspaces install):
```
docker build -f apps/server/Dockerfile -t bcv2-server .
```

Run it, pointing at your managed MySQL and mounting a volume for uploads
(local storage driver writes to `/app/apps/server/uploads` inside the
container — this volume is the only durable copy of uploaded images unless
you switch to an object-storage driver):
```
docker run -d --name bcv2-server \
  -p 3001:3001 \
  -e DATABASE_URL="mysql://user:pass@your-db-host:3306/brickcity" \
  -e JWT_SECRET="$(openssl rand -base64 48)" \
  -e TURNSTILE_SECRET_KEY="..." \
  -v /var/lib/brickcity/uploads:/app/apps/server/uploads \
  --restart unless-stopped \
  bcv2-server
```
The container's `CMD` runs `drizzle-kit migrate` before starting the
server on every boot — safe to leave in place (already-applied migrations
are skipped), so a plain `docker restart` after a deploy also picks up any
new migrations without a separate step.

This was verified by actually building and running the image against a
real MySQL instance during Phase 5 (not just written and assumed) — see
`docs/DECISIONS.md` for the one real bug that surfaced doing that (a
missing `src/` directory in the runtime image that `drizzle-kit migrate`
needs at boot) and how it was fixed.

### Option B — systemd, no Docker

```
npm ci
npm run build -w @bcv2/shared
npm run build -w @bcv2/server
```
Then a systemd unit running `node apps/server/dist/index.js` from the repo
root, with `DATABASE_URL`/`JWT_SECRET`/etc. in an `EnvironmentFile=`
pointing at a `.env` created from `apps/server/.env.production.example`.
Run `npm run db:migrate -w @bcv2/server` manually before each deploy (no
automatic on-boot migration in this path, unlike the Docker `CMD`).

### Reverse proxy

Point nginx/Caddy at `localhost:3001` for `/trpc/*`, `/upload`, `/uploads/*`,
and `/webhooks/*` (see `apps/server/src/index.ts` for the exact route list),
and at the built frontend's static files (or the Vercel/Pages deployment,
if using that instead of self-hosting the frontend too) for everything else.
This is what makes the same-origin topology work.

## 3. Frontend (Vercel / Cloudflare Pages)

```
npm run build -w @bcv2/web
```
Deploy `apps/web/dist` as a static site. Build command for the platform's
dashboard: `npm run build -w @bcv2/web` (run from repo root — needs the
workspace install). Output directory: `apps/web/dist`.

Env vars (see `apps/web/.env.production.example`):
- `VITE_API_BASE_URL` — leave empty for the recommended same-origin setup
  (the platform's rewrite/proxy rules route `/trpc` etc. to the backend).
  Set to the backend's full origin only for a genuinely cross-origin split,
  understanding the `/uploads` caveat above.
- `VITE_TURNSTILE_SITE_KEY` — the public Turnstile site key (safe to expose;
  pair with `TURNSTILE_SECRET_KEY` on the backend). Leave empty to keep
  registration's bot-check widget disabled.

## 4. Backups

`apps/server/scripts/backup.sh` — `mysqldump` (schema + data, `--single-
transaction` so it doesn't lock a live database) piped to gzip, timestamped,
with retention pruning. Reads `DATABASE_URL` from the environment (same
variable the app uses, so it can't drift out of sync with what's actually
being backed up).

```
DATABASE_URL=... BACKUP_DIR=/var/backups/brickcity RETENTION_DAYS=14 \
  ./apps/server/scripts/backup.sh
```

Cron example (daily at 03:00 UTC):
```
0 3 * * * DATABASE_URL=... BACKUP_DIR=/var/backups/brickcity RETENTION_DAYS=14 \
  /path/to/apps/server/scripts/backup.sh >> /var/log/brickcity-backup.log 2>&1
```

Verified during Phase 5 by running the exact `mysqldump` invocation the
script constructs against the real database (produced a valid dump) and
independently checking its `DATABASE_URL` parsing logic — the sandbox this
was built in doesn't have a `mysqldump` client installed to run the script
file verbatim end-to-end; see `docs/DECISIONS.md` for what was and wasn't
directly exercised.

## 5. Ranking season cadence

Season rotation is cron-driven, same shape as the backup job above —
`npm run season:rotate -w @bcv2/server` (`apps/server/src/rotateSeason.ts`)
calls `rotateSeasonIfDue()`, which only actually closes the active season
and opens the next one once it's run for `SEASON_CADENCE_DAYS` (env var,
default `30`) — safe to run on every tick, a no-op until a season is
actually due. Manual override (`admin.ranking.closeSeason`) still exists in
the admin panel for an off-cycle reset.

Cron example (daily at 04:00 UTC, checked well after the 03:00 backup):
```
0 4 * * * cd /path/to/repo && DATABASE_URL=... npm run season:rotate -w @bcv2/server >> /var/log/brickcity-season.log 2>&1
```

## 6. Legacy v1

`legacy/` (`index.html`, `admin.html`) is the frozen single-file v1 site —
untouched, not part of this app's build or deploy pipeline. Serve it at a
separate URL or subdomain (e.g. `legacy.yourdomain.com` or `/legacy/` on a
static host) if you want it to stay reachable during the v2 rollout; it
needs no backend, no env vars, no build step — just serve the two files
as-is. Don't fold it into the v2 nginx/Caddy config's main routes, to avoid
any path collision with v2's own routing.

## 7. Anti-bot / rate limiting

Both are real integrations, not fully mocked — see `docs/DECISIONS.md`
("Phase 5 — Hardening"):
- **Turnstile** (`TURNSTILE_SECRET_KEY` / `VITE_TURNSTILE_SITE_KEY`):
  disabled (no-op) until both are set. Get keys from the Cloudflare
  dashboard's Turnstile product.
- **Rate limiting**: always on, no configuration needed — in-process,
  per-instance. If you ever run more than one backend instance behind a
  load balancer, the limits become per-instance (e.g. a "10/min" limit
  becomes "10/min per instance" in aggregate) rather than global; a shared
  store (Redis) would be needed to make it a true global limit across
  instances. Not needed for a single-VPS deploy.

## 8. Real payment providers (Stripe / Przelewy24 switch-over)

`modules/subscriptions/providers.ts` has real Stripe and Przelewy24 adapters
sitting behind `getProvider()`'s fail-closed check: each id only resolves to
its real adapter once **every** one of its env vars is set, otherwise it's
`MockPaymentProvider` — same as Turnstile's disabled-until-configured pattern
above. PayPal has no real adapter and stays mock permanently (see
`docs/DECISIONS.md`).

To go live with a provider:

1. **Set the env vars** in `.env` (see `.env.production.example` for the
   full list) — either all of a provider's vars or none, there's no partial
   state:
   - Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
   - Przelewy24: `P24_MERCHANT_ID`, `P24_POS_ID`, `P24_CRC`, `P24_API_KEY`
2. **Register the webhook endpoint** with the provider, pointing at
   `https://yourdomain.com/webhooks/<provider>`:
   - Stripe: Dashboard → Developers → Webhooks → Add endpoint, subscribe to
     `checkout.session.completed`. The endpoint's signing secret is
     `STRIPE_WEBHOOK_SECRET` above.
   - Przelewy24: no dashboard registration needed — `urlStatus` is set
     per-transaction by `createCheckout()` itself, derived from the
     `returnUrl` the client passes to `subscriptions.topUp`. Same-origin
     deploy topology (§2 above) is what makes that origin correct.
3. **Restart the server** (`docker compose up -d --build` picks up new env
   vars) so `getProvider()` re-evaluates with the new vars present.
4. **Flip the switch** in the admin panel (Admin → payment providers,
   `admin.providers.setEnabled`) — this is deliberately a separate step from
   having valid keys, so a key can be configured and tested (e.g. via
   `admin.providers.list`/`subscriptions.enabledProviders`, or a manual
   `getProvider('stripe').createCheckout(...)` smoke test) before it's
   actually reachable by real users.

Unlike the mock flow (which credits the wallet the instant a checkout is
"created"), a real checkout returns a `redirectUrl` the browser must actually
complete payment on — `subscriptions.topUp` does **not** credit the wallet in
that case; crediting happens later when the provider's webhook fires and
confirms funds actually moved. The current wallet UI (`Profile.tsx`) doesn't
yet handle a `redirectUrl` response (it was built against the mock's
synchronous behavior) — wiring that redirect is frontend follow-up work for
whenever a provider actually goes live, not done as part of adding the
adapters themselves.
