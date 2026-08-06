# Multi-stage build for @bcv2/server. Build from the MONOREPO ROOT, not this
# directory, since npm workspaces need the root package.json/lockfile:
#   docker build -f apps/server/Dockerfile -t bcv2-server .
#
# sharp (native image binary) is rebuilt inside the image by `npm ci`, so
# this produces a correct linux binary regardless of the host that runs the
# build — never copy a host-built node_modules into this image.

FROM node:22-slim AS build
WORKDIR /app

# Copy just the manifests first for better layer caching on dependency-only
# changes (source edits won't invalidate the npm ci layer).
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/server/package.json apps/server/package.json
RUN npm ci

COPY packages/shared packages/shared
COPY apps/server apps/server
RUN npm run build -w @bcv2/shared && npm run build -w @bcv2/server

# devDependencies are kept (not pruned) — the runtime CMD below runs
# `drizzle-kit migrate` on boot, so drizzle-kit needs to still be present.
# Trades a larger image for a single-container migrate-then-start deploy
# instead of orchestrating a separate migration job/container.

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/apps/server/dist ./apps/server/dist
COPY --from=build /app/apps/server/package.json ./apps/server/package.json
COPY --from=build /app/apps/server/drizzle ./apps/server/drizzle
COPY --from=build /app/apps/server/drizzle.config.ts ./apps/server/drizzle.config.ts
# drizzle-kit reads drizzle.config.ts -> ./src/env.js + ./src/db/schema.ts
# directly (its own on-the-fly TS loader, independent of the tsc build
# output) — src/ has to actually be present at runtime, dist/ isn't enough.
COPY --from=build /app/apps/server/src ./apps/server/src

# Local-driver uploads persist here — mount a volume at this path in
# production (see docs/deploy.md) or they're lost on container recreate.
RUN mkdir -p /app/apps/server/uploads

WORKDIR /app/apps/server
EXPOSE 3001

# Run migrations then start — safe to run on every boot, drizzle-kit migrate
# is idempotent (already-applied migrations are skipped).
CMD ["sh", "-c", "npx drizzle-kit migrate && node dist/index.js"]
