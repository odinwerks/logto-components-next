#!/bin/sh
set -e

# Wipe .next cache on every container start.
# In standalone mode, Next.js may write ISR / fetch cache artefacts to
# .next/cache across runs. Clearing it on restart mirrors the local-dev
# pattern of "rm -rf .next" and prevents stale cache poisoning.
echo "Clearing .next cache..."
rm -rf /app/.next/cache 2>/dev/null || true

echo "Starting Next.js..."
exec node /app/server.js
