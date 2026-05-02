'use client';

/**
 * logto-kit/components/handlers/session-heartbeat.tsx
 *
 * <SessionHeartbeat /> — zero-UI heartbeat engine.
 *
 * Fires recordHeartbeat() (Server Action) every 30 seconds while the tab is
 * visible, and immediately when the tab becomes visible again after being hidden.
 * This keeps `lastActiveAt` up-to-date on the Logto session so the Sessions tab
 * and admin panel can show when each session was last active.
 *
 * Uses a Server Action directly instead of a fetch → API route, so the
 * correct Next.js auth/cookie context is always available.
 *
 * Errors are always swallowed — the heartbeat is best-effort.
 */

import { useEffect, useRef } from 'react';
import { recordHeartbeat } from '../../logic/actions/heartbeat';

const PING_INTERVAL_MS = 30_000;
const DEBOUNCE_MS = 10_000;

export default function SessionHeartbeat() {
  const lastPingRef = useRef<number>(0);

  useEffect(() => {
    const ping = () => {
      // Only ping when the tab is visible.
      if (document.visibilityState !== 'visible') return;

      // Debounce: don't fire twice within DEBOUNCE_MS.
      const now = Date.now();
      if (now - lastPingRef.current < DEBOUNCE_MS) return;

      lastPingRef.current = now;
      recordHeartbeat().catch(() => {
        // Best-effort — errors are silently swallowed.
      });
    };

    // Fire immediately on mount (if tab is visible).
    ping();

    // Re-ping when tab becomes visible (e.g. user switches back).
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') ping();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Periodic ping.
    const intervalId = setInterval(ping, PING_INTERVAL_MS);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, []);

  return null;
}
