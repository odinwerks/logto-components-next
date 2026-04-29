'use server';

import 'server-only';

import { isDev } from '../dev-mode';
import { getTokenForServerAction } from './tokens';

/**
 * Returns the current access token, but ONLY when the server is running in
 * development mode. In production, returns `null` unconditionally — so even
 * if a client component is coaxed into calling this, it gets nothing.
 *
 * Defense-in-depth: the Dev tab itself is also gated client-side by the
 * `isDev` constant (which reflects the same NODE_ENV), but this second check
 * ensures that a malicious bundle can't extract the token by calling the
 * server action directly.
 *
 * This function should only be used by the Dev tab for display/debugging.
 */
export async function getCurrentAccessToken(): Promise<string | null> {
  if (!isDev) return null;
  try {
    return await getTokenForServerAction();
  } catch {
    return null;
  }
}
