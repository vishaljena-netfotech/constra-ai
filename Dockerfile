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
# Real secrets (DATABASE_URL, JWT_SECRET, etc.) are NOT needed at build time
# and stay runtime-only via .env.production (excluded from this build context
# by .dockerignore). VITE_-prefixed vars are the exception: Vite compiles them
# directly into the client JS bundle at build time, so they must be present
# here as build args, not just at container runtime. They end up visible in
# the browser bundle regardless, so passing them as build args (which land in
# `docker history`) doesn't reduce their existing exposure.
ARG VITE_OAUTH_PORTAL_URL
ARG VITE_APP_ID
ARG VITE_FRONTEND_FORGE_API_URL
ARG VITE_FRONTEND_FORGE_API_KEY
ARG VITE_ANALYTICS_ENDPOINT
ARG VITE_ANALYTICS_WEBSITE_ID
ENV VITE_OAUTH_PORTAL_URL=$VITE_OAUTH_PORTAL_URL \
    VITE_APP_ID=$VITE_APP_ID \
    VITE_FRONTEND_FORGE_API_URL=$VITE_FRONTEND_FORGE_API_URL \
    VITE_FRONTEND_FORGE_API_KEY=$VITE_FRONTEND_FORGE_API_KEY \
    VITE_ANALYTICS_ENDPOINT=$VITE_ANALYTICS_ENDPOINT \
    VITE_ANALYTICS_WEBSITE_ID=$VITE_ANALYTICS_WEBSITE_ID
RUN pnpm run build

# ---------- Production runtime ----------
FROM node:22-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Non-root user (enterprise/MNC standard: never run as root in prod)
RUN groupadd -r app && useradd -r -g app -d /app app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# Point corepack/node's cache/home at /tmp (always world-writable) so the
# non-root "app" user never needs write access to /app itself.
ENV HOME=/tmp
RUN corepack enable && corepack prepare pnpm@10.15.1 --activate

COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
# NOTE: intentionally NOT --prod here. The Jenkinsfile runs
# `drizzle-kit migrate` (a devDependency) against this same image, so
# devDependencies must be present. Trade-off: slightly larger image.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

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
