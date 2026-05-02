'use server';

import { makeRequest } from './request';

/**
 * Records a session heartbeat by calling Logto's Account API.
 *
 * Updates `lastActiveAt` on the current session so other devices can see
 * this session is actively open.  Errors are swallowed — the heartbeat is
 * best-effort and must never surface failures to the user.
 *
 * Called directly from the SessionHeartbeat client component every 30 s.
 * Using a Server Action (instead of an API route) ensures cookies are
 * available in the correct Next.js auth context.
 */
export async function recordHeartbeat(): Promise<void> {
  try {
    await makeRequest('/api/my-account/sessions/heartbeat', { method: 'POST' });
  } catch {
    // Best-effort — silently absorb all errors.
  }
}
