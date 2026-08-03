# BRICK CITY MASHIN' v2

Full-stack community portal for graffiti writers and street-art fans.
Design direction: **"SIDE ALLEY"** — see `docs/bcm-design-system.md`.
Roadmap: see `docs/plan.md` (Phase 0 = this skeleton).

## Layout

```
legacy/            v1 portal + standalone admin (reference only, untouched)
docs/              design system, workflow plan, kickoff prompt
assets/            logo-mark.svg (BCM stencil-plate monogram)
apps/web/          React + TypeScript + Tailwind (Vite) frontend
apps/server/       Hono + tRPC + Drizzle ORM + MySQL backend
packages/shared/   shared types/constants (roles, categories, invite types)
```

## Quick start

```bash
npm install                 # install all workspaces
cp apps/server/.env.example apps/server/.env
docker compose -f apps/server/docker-compose.yml up -d   # local MySQL 8
npm run dev                 # shared build + server (tsx watch) + web (vite)
```

## Scripts (repo root)

- `npm run dev` — start server and web in watch mode
- `npm run build` — build shared, server (tsc) and web (vite)
- `npm run typecheck` — `tsc --noEmit` in every workspace

## Rules

- All workflows, prompts, code comments and docs in **English**
- UI copy: i18n from day one — English default, Polish + German locales
- Modular architecture: every feature = isolated module; new features = new module
- Zero emojis in UI — custom SVG icon set only
- No clean-corporate SaaS look anywhere
