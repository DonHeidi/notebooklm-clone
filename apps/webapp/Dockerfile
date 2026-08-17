# Webapp production image — decision D-1 (product/feasibility.md):
# Node runtime, Next.js `output: "standalone"`, official with-docker pattern.
# Bun is used only to install dependencies (it owns bun.lock); `next build`
# and the runtime run on Node.
#
# Build from the REPO ROOT (the monorepo lockfile lives there):
#   docker build -f apps/webapp/Dockerfile -t webapp .

# --- deps: install workspace dependencies with Bun ---------------------------
FROM oven/bun:1.3.14 AS deps
WORKDIR /app

COPY package.json bun.lock ./
COPY apps/webapp/package.json apps/webapp/
COPY apps/docs/package.json apps/docs/
COPY apps/marketing/package.json apps/marketing/
# Hoisted linker: Bun 1.3 defaults to isolated (pnpm-style) installs, whose
# node_modules/.bun symlink store breaks Next's standalone file tracing.
RUN bun install --frozen-lockfile --linker=hoisted

# --- builder: next build on Node ---------------------------------------------
FROM node:24-slim AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app/apps/webapp
# Invoke the next bin directly so the build runs on Node, not Bun (D-1).
RUN ../../node_modules/.bin/next build

# --- runner: minimal standalone image ----------------------------------------
FROM node:24-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

# With outputFileTracingRoot at the repo root, the standalone folder mirrors
# the monorepo layout: server.js lives at apps/webapp/server.js.
COPY --from=builder --chown=nextjs:nodejs /app/apps/webapp/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/webapp/.next/static ./apps/webapp/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/webapp/public ./apps/webapp/public

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "apps/webapp/server.js"]
