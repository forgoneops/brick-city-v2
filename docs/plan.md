# BRICK CITY MASHIN' — WORKFLOW v2.0 (full-stack)

## CONTEXT
- v1.0 (single-file, localStorage) stays as **LEGACY** — untouched, serves as reference
- v2.0 = full frontend + backend, new design, architecture ready for future features
- Repo: github.com/forgoneops/brick-city-mashin
- **Rule: workflows and prompts always in English**

---

## PHASE 0 — Architecture foundation
**Goal: full-stack skeleton ready for all future features**
- Stack: React + TypeScript + Tailwind (frontend) / Hono + tRPC + Drizzle ORM + MySQL (backend)
- Modular structure: each feature = independent module (gallery, map, forum, ranking, battles, subscriptions, cms) — adding a new one = new module, no touching the rest
- Auth: accounts + roles (user / moderator / admin), JWT, **invite system**
- API stub endpoints for future features
- PWA: manifest, service worker, push-ready

## PHASE 1 — New design system (current one becomes legacy)
**Goal: fresh look, current style = legacy**
- Research: 2-3 design direction proposals (moodboards) → pick one → design tokens
- Still street/grunge DNA, but new palette, typography, components
- Covers everything: portal + admin panel

## PHASE 2 — Core portal (migrate v1 to backend)
- Gallery (server uploads, image storage), spot map, news, events, battles
- User accounts, profiles, props — all in DB, shared across all users
- Admin panel: dashboard, moderation, bot control, users, pin/event queues (as in v1, but API-driven)

## PHASE 3 — New features
**3a. Vote-based ranking**
- Writer leaderboard: props + battle votes + activity → rankings (global / per city / per category)
- Seasonal reset or all-time — configurable from admin

**3b. Forum**
- Categories (spray talk, spots, gear, battles, announcements), threads, replies, forum props
- Moderation wired into existing admin panel

**3c. Subscription model (invite → trial → paywall)**
- Registration ONLY via invite (admin-generated, single-use codes)
- After joining: **7-day full-access trial**
- Then: subscription ~25 PLN/month (range 20-30 PLN, price set in admin)
- Payments: Stripe/Przelewy24 (skeleton + mock first, production after keys)
- **ENTIRE PAYWALL toggled on/off from the admin panel** (free mode ↔ subscription mode)
- Admin sees: invites sent, active trials, paying users, MRR

## PHASE 4 — Full CMS (edit the site from admin)
- Edit site content WITHOUT touching code: hero texts, announcements, info pages, menu, banners
- Manage gallery categories, battle themes, subscription price, feature flags
- All settings from PHASES 2-3 collected in one place

## PHASE 5 — Hardening + deploy
- Anti-bot (Turnstile), rate limiting, validation, backups
- Deploy: frontend (Pages/Vercel) + backend (VPS/managed DB)
- Migration: legacy v1 stays at a separate URL/archive

---

## EXECUTION ORDER (stage-gate)
0 → 1 → 2 → (3a ∥ 3b ∥ 3c in parallel) → 4 → 5
Each phase: build → review → push to repo → only then the next one.

## OPEN DECISIONS (to confirm at kickoff)
- New design choice (3 proposals to pick from in Phase 1)
- Payments: Stripe vs Przelewy24 (Polish scene → P24?)
- Ranking: seasonal or all-time as default
