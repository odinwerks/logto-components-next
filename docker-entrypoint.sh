#!/bin/sh
set -e

# Wipe .next cache on every container start.
# In standalone mode, Next.js may write ISR / fetch cache artefacts to
# .next/cache across runs. Clearing it on restart mirrors the local-dev
# pattern of "rm -rf .next" and prevents stale cache poisoning.
echo "Clearing .next cache..."
rm -rf /app/.next/cache 2>/dev/null || true

# Compose mounts the Redis credential as a secret. Keep REDIS_PASSWORD out of
# Compose's environment metadata and put the encoded credential directly into
# the REDIS_URL consumed by the app at runtime.
REDIS_PASSWORD_FILE="${REDIS_PASSWORD_FILE:-/run/secrets/redis_password}"
if [ -r "$REDIS_PASSWORD_FILE" ]; then
  export REDIS_URL="$(REDIS_PASSWORD_FILE="$REDIS_PASSWORD_FILE" REDIS_URL="${REDIS_URL:-redis://redis:6379}" node - <<'NODE'
const fs = require('fs');

const passwordFile = process.env.REDIS_PASSWORD_FILE;
const redisUrl = new URL(process.env.REDIS_URL);
const password = fs.readFileSync(passwordFile, 'utf8').replace(/\r?\n$/, '');

redisUrl.username = '';
redisUrl.password = password;
process.stdout.write(redisUrl.toString());
NODE
)"
fi

echo "Starting Next.js..."
exec node /app/server.js
