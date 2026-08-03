# Brick City Mashin' — v2

Community portal for graffiti writers. Monorepo: React PWA frontend + Hono/tRPC backend + MySQL.

## Layout

```
apps/web          React 19 + Vite + Tailwind v3 PWA (i18n: en/pl/de)
apps/server       Hono + tRPC + Drizzle (MySQL) API
packages/shared   Shared types and constants (roles, categories, paywall)
legacy/           v1 portal and standalone admin (reference only)
docs/             Design system, plan, phase prompts
assets/           Logo and brand assets
```

## Quick start

```bash
npm install
cp apps/server/.env.example apps/server/.env
docker compose -f apps/server/docker-compose.yml up -d   # MySQL 8
npm run dev        # server + web
```

## Scripts (order enforced: shared -> server -> web)

- `npm run dev` — run server (tsx watch) and web (vite) together
- `npm run build` — build all workspaces
- `npm run typecheck` — `tsc --noEmit` across all workspaces

## Notes

- Registration is invite-only. Trial: 7 days. Paywall default ON, 25 PLN (range 20-30).
- No emojis in UI. Design tokens live in `docs/bcm-design-system.md`.
