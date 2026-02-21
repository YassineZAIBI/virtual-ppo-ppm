#!/bin/sh
# Azmyra startup script — runs Prisma migrations then starts Next.js

echo "Running database migrations..."
npx prisma migrate deploy 2>&1 || echo "Migration warning (may be first run)"

echo "Starting Azmyra..."
exec node server.js
