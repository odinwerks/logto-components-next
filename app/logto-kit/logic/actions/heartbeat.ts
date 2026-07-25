'use server';

import { safeAction, type DataResult } from './safe';
import { getTokenForServerAction } from './tokens';
import { makeRequest } from './request';
import { getBackendType } from '../../config';
import { debug, warn, logEvent } from '../log';
import { LOG_EVENTS } from '../../../lib/log-events';

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
 *
 * Wrapped with `safeAction` for consistent error sanitization (BUG-065).
 */
export async function recordHeartbeat(): Promise<DataResult<void>> {
  return safeAction(async () => {
    // Platform Compatibility Check: Standard Logto upstream backends (e.g. Logto Cloud/OSS)
    // do not support custom API endpoints like heartbeats (which is a Blacktop-specific feature).
    // Abort early to avoid executing calls and generating unnecessary errors under upstream mode.
    // This is an intentional, known-safe and accepted platform compatibility choice.
    if (getBackendType() === 'upstream') {
      debug('Heartbeat skipped (BACKEND_TYPE=upstream)');
      return;
    }
    const token = await getTokenForServerAction().catch(() => null);
    if (!token) return; // Not authenticated - silently skip
    try {
      await makeRequest('/api/my-account/sessions/heartbeat', { method: 'POST' });
      logEvent.info(LOG_EVENTS.SESSION_HEARTBEAT, 'Heartbeat recorded');
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        warn('[recordHeartbeat] failed:', err instanceof Error ? err.message : String(err));
      }
      throw err;
    }
  });
}
