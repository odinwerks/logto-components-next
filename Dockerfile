# syntax=docker/dockerfile:1

# ──────────────────────────────────────────────────────────────────────────────
# Stage 1 — Install all dependencies
# ──────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# ──────────────────────────────────────────────────────────────────────────────
# Stage 2 — Build
#
# NEXT_PUBLIC_* vars must be present at build time — they are inlined into
# the client bundle by the Next.js compiler and cannot be changed at runtime.
# Pass them via docker-compose build.args (sourced from your .env file).
# ──────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time public env vars (baked into the client bundle)
ARG NEXT_PUBLIC_THEME
ARG NEXT_PUBLIC_LANG_MAIN
ARG NEXT_PUBLIC_LANG_AVAILABLE
ARG NEXT_PUBLIC_MFA_ISSUER
ARG NEXT_PUBLIC_DEFAULT_THEME_MODE
ARG NEXT_PUBLIC_USER_SHAPE
ARG NEXT_PUBLIC_NAME_TYPE
ARG NEXT_PUBLIC_LOAD_TABS

ENV NEXT_PUBLIC_THEME=$NEXT_PUBLIC_THEME
ENV NEXT_PUBLIC_LANG_MAIN=$NEXT_PUBLIC_LANG_MAIN
ENV NEXT_PUBLIC_LANG_AVAILABLE=$NEXT_PUBLIC_LANG_AVAILABLE
ENV NEXT_PUBLIC_MFA_ISSUER=$NEXT_PUBLIC_MFA_ISSUER
ENV NEXT_PUBLIC_DEFAULT_THEME_MODE=$NEXT_PUBLIC_DEFAULT_THEME_MODE
ENV NEXT_PUBLIC_USER_SHAPE=$NEXT_PUBLIC_USER_SHAPE
ENV NEXT_PUBLIC_NAME_TYPE=$NEXT_PUBLIC_NAME_TYPE
ENV NEXT_PUBLIC_LOAD_TABS=$NEXT_PUBLIC_LOAD_TABS

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# ──────────────────────────────────────────────────────────────────────────────
# Stage 3 — Runtime
#
# Copies only the minimal standalone output produced by output: 'standalone'.
# Runs as a non-root user for container security.
# ──────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Static assets
COPY --from=builder /app/public ./public
# Standalone server + static build output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static     ./.next/static

USER nextjs

EXPOSE 2999
ENV PORT=2999
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
