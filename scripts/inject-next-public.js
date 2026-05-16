#!/usr/bin/env node
/**
 * Reads bare env vars from .env and writes NEXT_PUBLIC_* equivalents
 * to .env.local for local development with `npm run dev`.
 *
 * Only exposes vars that are explicitly in the NEXT_PUBLIC_ENV map
 * in app/logto-kit/logic/env.ts — never secrets, M2M keys, or tokens.
 *
 * Docker Compose handles this automatically via build.args;
 * this script is only for `npm run dev`.
 */
const fs = require('fs');
const path = require('path');

const PUBLIC_VARS = [
  'THEME',
  'LANG_MAIN',
  'LANG_AVAILABLE',
  'MFA_ISSUER',
  'DEFAULT_THEME_MODE',
  'USER_SHAPE',
  'NAME_TYPE',
  'LOAD_TABS',
  'DELETE_REDIRECT_DELAY',
];

const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
  console.log('[inject-next-public] No .env file found, skipping.');
  process.exit(0);
}

const lines = fs.readFileSync(envPath, 'utf8').split('\n');
const vars = {};

for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  const key = trimmed.substring(0, eqIdx).trim();
  const value = trimmed.substring(eqIdx + 1).trim();
  if (PUBLIC_VARS.includes(key)) {
    vars[`NEXT_PUBLIC_${key}`] = value;
  }
}

const outPath = path.join(__dirname, '..', '.env.local');
const content = Object.entries(vars)
  .map(([k, v]) => `${k}=${v}`)
  .join('\n');

fs.writeFileSync(outPath, content + '\n');
console.log(`[inject-next-public] Wrote ${Object.keys(vars).length} public vars to .env.local`);
