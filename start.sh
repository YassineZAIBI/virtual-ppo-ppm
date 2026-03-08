#!/bin/sh
# Azmyra startup script — runs Prisma migrations then starts Next.js

echo "Running database schema sync..."
npx prisma db push --accept-data-loss 2>&1 || echo "Schema push warning (may be first run)"

echo "Starting Azmyra..."
exec node server.js
