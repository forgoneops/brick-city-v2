# KIMI CLI PROMPT — Phase 0: repo reorganization + full-stack skeleton + push

Execute exactly this, in order. All code comments and docs in English. No emojis anywhere in UI.

## 1. REPO REORGANIZATION + GIT INIT
Create `brick-city-v2/` and reorganize existing material:
```
brick-city-v2/
  legacy/            # move v1 portal -> legacy/index.html, standalone admin -> legacy/admin.html
  docs/              # bcm-design-system.md, plan.md, brick-city-v2-kimi-cli-prompt.md
  assets/            # logo-mark.svg
  apps/web/          # React frontend (below)
  apps/server/       # Hono backend (below)
  packages/shared/   # shared types/constants: roles[user,moderator,admin], gallery+forum categories, invite types, paywall/trial constants (TRIAL_DAYS=7, DEFAULT_PRICE_PLN=25, range 20-30, PAYWALL_DEFAULT_ON=true)
  package.json       # npm workspaces root; scripts: dev, build, typecheck (enforce order: shared -> server -> web)
  README.md, .gitignore (node_modules, dist, .env)
```
`git init`, commit: "Phase 0: monorepo skeleton (web + server) + legacy/docs".

## 2. APPS/SERVER (Hono + tRPC + Drizzle + MySQL)
- TypeScript, Hono server, tRPC router at /trpc, GET /health -> {"ok":true}
- Drizzle mysql-core schema: users(id,email,nick,role,walletBalanceCents,trialEndsAt,passwordHash,createdAt), invites(id,code,createdBy,maxUses,usedCount,expiresAt), inviteRedemptions, sessions, siteContent(kv), walletTransactions(ledger)
- DATABASE_URL env + .env.example + docker-compose.yml (mysql:8)
- AUTH (JWT, bcryptjs): register = INVITE ONLY (validate code, single-use decrement, record redemption, trialEndsAt = now+7d), login, me. Guards: requireAuth, roleGuard, adminProcedure; stub requireActiveAccess checking paywall flag
- MODULE STUBS — one router file each, 1-2 placeholder procedures + TODO, wired into root router: gallery, map, forum, ranking, battles, subscriptions (balance, topUp stub with atomic ledger+balance update, paywallStatus, admin get/setPaywallConfig), cms (kv get/set, admin write)

## 3. APPS/WEB (Vite + React + TS + Tailwind v3)
- i18n day one: custom lightweight provider + useT(), locales en/pl/de JSON, EN default
- PWA: manifest.webmanifest (name "Brick City Mashin'", theme #0c0c0d), logo-mark.svg icons, service worker stub
- react-router pages (skeletons with title + module note): Home, Gallery, Map, News, Events, Battles, Forum, Ranking, Profile, Login, Invite(register), Admin
- tRPC client -> /trpc, auth token from localStorage
- Base theme from docs/bcm-design-system.md tokens: --ink:#0c0c0d --asphalt:#131315 --concrete:#1b1b1e --fog:#26262a --bone:#e6e2d8 --smoke:#7a766c --signal:#d4ff3f --blood:#8f2d23 --rust:#b0552f; font stack 'Dusk Till Dawn','Big Shoulders Stencil','Grenze Gotisch','Oswald',sans-serif; radius <=2px, 1px hairline borders, no card shadows; inline SVG Icon component only

## 4. VERIFY (must be green before push)
- npm install (workspaces) — if FS forbids symlinks, build on a symlink-capable copy and copy back package-lock.json
- npx tsc --noEmit clean in apps/server AND apps/web
- npm run build in server (tsc) and web (vite) — both pass
- Smoke test built server: GET /health ok; GET /trpc/subscriptions.paywallStatus -> {"paywallEnabled":true}
- Fix until green. Commit: "Phase 0 verified: tsc clean, builds pass"

## 5. PUSH (only after verification is green)
Remote already exists — DO NOT create it:
```
git remote add origin https://github.com/forgoneops/brick-city-v2.git
git branch -M main
git push -u origin main
```
Report: file tree (2 levels), verification outputs, commit hashes, repo URL.
