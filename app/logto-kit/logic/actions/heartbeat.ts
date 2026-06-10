'use server';

import { getTokenForServerAction } from './tokens';
import { makeRequest } from './request';
import { getBackendType } from '../../config';

/**
 * Records a session heartbeat by calling Logto's Account API.
 *
 * Updates `lastActiveAt` on the current session so other devices can see
 * this session is actively open.  Errors are swallowed - the heartbeat is
 * best-effort and must never surface failures to the user.
 *
 * Called directly from the SessionHeartbeat client component every 30 s.
 * Using a Server Action (instead of an API route) ensures cookies are
 * available in the correct Next.js auth context.
 */
export async function recordHeartbeat(): Promise<void> {
  try {
    // Platform Compatibility Check: Standard Logto upstream backends (e.g. Logto Cloud/OSS)
    // do not support custom API endpoints like heartbeats (which is a Blacktop-specific feature).
    // Abort early to avoid executing calls and generating unnecessary errors under upstream mode.
    // This is an intentional, known-safe and accepted platform compatibility choice.
    if (getBackendType() === 'upstream') return;
    const token = await getTokenForServerAction().catch(() => null);
    if (!token) return; // Not authenticated - silently skip
    await makeRequest('/api/my-account/sessions/heartbeat', { method: 'POST' });
  } catch {
    // Best-effort - silently absorb all errors.
  }
}
