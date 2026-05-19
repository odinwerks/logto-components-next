'use server';

import 'server-only';

import { getTokenForServerAction } from './tokens';

/**
 * Returns the current access token, but ONLY when the opt-in env var
 * `LOGTO_DANGER_EXPOSE_TOKEN` is explicitly set to `"true"`. In all other
 * cases (unset, `"false"`, production, test, etc.) returns `null`.
 *
 * This is intentionally stricter than the old `isDev` guard (which was true
 * for both `development` and `test` environments). A test suite running
 * against a real Logto tenant would inadvertently expose live tokens in CI
 * logs or test output. The explicit env‑var forces a conscious opt‑in.
 *
 * This function should only be used by the Dev tab for display/debugging.
 */
export async function getCurrentAccessToken(): Promise<string | null> {
  if (process.env.LOGTO_DANGER_EXPOSE_TOKEN !== 'true') return null;
  try {
    return await getTokenForServerAction();
  } catch {
    return null;
  }
}
