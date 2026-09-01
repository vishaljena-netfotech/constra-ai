# syntax=docker/dockerfile:1

# ---------- Base ----------
FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.15.1 --activate
WORKDIR /app

# ---------- Dependencies (cached layer) ----------
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ---------- Build ----------
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# No secrets are needed at build time; the app reads env vars at runtime.
RUN pnpm run build

# ---------- Production runtime ----------
FROM node:22-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Non-root user (enterprise/MNC standard: never run as root in prod)
RUN groupadd -r app && useradd -r -g app -d /app app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.15.1 --activate

COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod

# --chown sets ownership as part of the copy itself (cheap, no extra
# filesystem walk) — this replaces both the old recursive chown and
# the recursive chmod, which were the source of the slow builds.
COPY --from=build --chown=app:app /app/dist ./dist
COPY --from=build --chown=app:app /app/drizzle ./drizzle
COPY --chown=app:app drizzle.config.ts ./

USER app

# App auto-selects a free port starting at $PORT; keep them aligned.
ENV PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||3000)+'/', r => process.exit(r.statusCode < 500 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "dist/index.js"]
