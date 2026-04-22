FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /app

# ── deps ──────────────────────────────────────────────────────────────────────
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/api/package.json ./packages/api/

RUN pnpm install --frozen-lockfile --filter @moneyflow/api --filter @moneyflow/shared

# ── build shared ──────────────────────────────────────────────────────────────
FROM deps AS build-shared
COPY packages/shared ./packages/shared
RUN pnpm --filter @moneyflow/shared build

# ── build api ─────────────────────────────────────────────────────────────────
FROM build-shared AS build-api
COPY packages/api ./packages/api

# Use production schema (PostgreSQL) and generate client
RUN cp packages/api/prisma/schema.prod.prisma packages/api/prisma/schema.prisma
RUN pnpm --filter @moneyflow/api exec prisma generate --schema=./prisma/schema.prisma
RUN pnpm --filter @moneyflow/api exec tsc -p tsconfig.json

# ── runner ────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /app

ENV NODE_ENV=production

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/api/package.json ./packages/api/

RUN pnpm install --frozen-lockfile --filter @moneyflow/api --filter @moneyflow/shared --prod

COPY --from=build-api /app/packages/shared/dist ./packages/shared/dist
COPY --from=build-api /app/packages/api/dist ./packages/api/dist
COPY --from=build-api /app/packages/api/prisma ./packages/api/prisma
COPY --from=build-api /app/node_modules/.pnpm ./node_modules/.pnpm
COPY --from=build-api /app/node_modules/@prisma ./node_modules/@prisma
COPY packages/api/docker-entrypoint.sh ./packages/api/docker-entrypoint.sh

RUN chmod +x /app/packages/api/docker-entrypoint.sh

WORKDIR /app/packages/api

EXPOSE 3001

ENTRYPOINT ["sh", "/app/packages/api/docker-entrypoint.sh"]
