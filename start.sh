#!/bin/sh
# Azmyra startup script — runs Prisma schema sync then starts Next.js

echo "Running database schema sync..."
node /app/prisma-cli/node_modules/prisma/build/index.js db push --schema=./prisma/schema.prisma --accept-data-loss 2>&1 || echo "Schema push warning (may be first run)"

echo "Starting Azmyra..."
exec node server.js
