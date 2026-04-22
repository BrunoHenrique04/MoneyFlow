#!/bin/sh
set -e

echo "Syncing database schema..."
npx prisma db push --schema=./prisma/schema.prod.prisma --accept-data-loss

echo "Running seed (skips if already seeded)..."
npx tsx prisma/seed.ts

echo "Starting API..."
exec node dist/server.js
