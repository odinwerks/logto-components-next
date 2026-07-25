#!/usr/bin/env node
/**
 * Post-build script: copies static assets into the standalone output directory.
 *
 * Next.js `output: 'standalone'` does NOT include `.next/static` or `public/`
 * inside `.next/standalone/`. This causes CSS/JS/fonts to 404 in production,
 * breaking CSS animations (missing keyframes) and other static assets.
 *
 * This script runs automatically via the `postbuild` npm lifecycle hook.
 * It is idempotent — safe to run multiple times.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const STANDALONE = path.join(ROOT, '.next', 'standalone');
const STATIC_SRC = path.join(ROOT, '.next', 'static');
const STATIC_DST = path.join(STANDALONE, '.next', 'static');
const PUBLIC_SRC = path.join(ROOT, 'public');
const PUBLIC_DST = path.join(STANDALONE, 'public');

/**
 * Recursively copy a directory. Creates destination if it doesn't exist.
 * Idempotent — overwrites existing files but doesn't delete extras.
 *
 * @param {string} src  Source directory
 * @param {string} dest Destination directory
 */
function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    throw new Error(`Source directory does not exist: ${src}`);
  }

  fs.mkdirSync(dest, { recursive: true });

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    // nosemgrep: javascript.lang.security.audit.path-traversal.path-join-resolve-traversal
    const srcPath = path.join(src, entry.name);
    // nosemgrep: javascript.lang.security.audit.path-traversal.path-join-resolve-traversal
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function countFiles(dir) {
  let count = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      // nosemgrep: javascript.lang.security.audit.path-traversal.path-join-resolve-traversal
      count += countFiles(path.join(dir, entry.name));
    } else {
      count++;
    }
  }
  return count;
}

try {
  console.log('[copy-standalone-assets] Starting…');

  // ── .next/static → .next/standalone/.next/static ──
  if (fs.existsSync(STATIC_SRC)) {
    copyRecursive(STATIC_SRC, STATIC_DST);
    const fileCount = countFiles(STATIC_DST);
    console.log(`[copy-standalone-assets] Copied .next/static → .next/standalone/.next/static (${fileCount} files)`);
  } else {
    console.warn(`[copy-standalone-assets] WARNING: ${STATIC_SRC} does not exist — skipping static copy`);
  }

  // ── public → .next/standalone/public ──
  if (fs.existsSync(PUBLIC_SRC)) {
    copyRecursive(PUBLIC_SRC, PUBLIC_DST);
    const fileCount = countFiles(PUBLIC_DST);
    console.log(`[copy-standalone-assets] Copied public → .next/standalone/public (${fileCount} files)`);
  } else {
    console.warn(`[copy-standalone-assets] WARNING: ${PUBLIC_SRC} does not exist — skipping public copy`);
  }

  console.log('[copy-standalone-assets] Done.');
  process.exit(0);
} catch (err) {
  console.error(`[copy-standalone-assets] ERROR: ${err.message}`);
  process.exit(1);
}
