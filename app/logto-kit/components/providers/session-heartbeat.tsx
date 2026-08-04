'use client';

/**
 * logto-kit/components/providers/session-heartbeat.tsx
 *
 * <SessionHeartbeat /> - zero-UI heartbeat engine.
 *
 * Fires recordHeartbeat() (Server Action) every 30 seconds while the tab is
 * visible, and immediately when the tab becomes visible again after being hidden.
 * This keeps `lastActiveAt` up-to-date on the Logto session so the Sessions tab
 * and admin panel can show when each session was last active.
 *
 * Uses a Server Action directly instead of a fetch → API route, so the
 * correct Next.js auth/cookie context is always available.
 *
 * Errors are always swallowed - the heartbeat is best-effort.
 */

import { useEffect, useRef } from 'react';
import { recordHeartbeat } from '../../logic/actions/heartbeat';
import { readEnv } from '../../logic/env';

const PING_INTERVAL_MS = 30_000;
const DEBOUNCE_MS = 10_000;
const SESSION_ACTION_LOCK = 'logto-session-action';
const SIGN_OUT_MARKER_KEY = 'logto-session-sign-out-started-at';
const CLIENT_INSTANCE_STARTED_AT = Date.now();

type SessionLockOperation = 'heartbeat' | 'sign-out';

function readSignOutMarker(): number | null {
  try {
    const marker = window.localStorage.getItem(SIGN_OUT_MARKER_KEY);
    if (marker === null) return null;
    const startedAt = Number(marker);
    return Number.isFinite(startedAt) ? startedAt : null;
  } catch {
    return null;
  }
}

function signOutStartedSincePageLoad(): boolean {
  const marker = readSignOutMarker();
  return marker !== null && marker >= CLIENT_INSTANCE_STARTED_AT;
}

function markSignOutStarted(): string {
  const marker = String(Date.now());
  try {
    window.localStorage.setItem(SIGN_OUT_MARKER_KEY, marker);
  } catch {
    // Web Lock ordering still protects in-flight actions when storage is unavailable.
  }
  return marker;
}

function rollBackSignOutMarker(marker: string): void {
  try {
    if (window.localStorage.getItem(SIGN_OUT_MARKER_KEY) === marker) {
      window.localStorage.removeItem(SIGN_OUT_MARKER_KEY);
    }
  } catch {
    // Storage may be unavailable; there is no persisted marker to reset.
  }
}

/** Coordinates only heartbeat and sign-out actions across same-origin tabs. */
export async function withSessionActionLock<T>(
  operation: SessionLockOperation,
  action: () => Promise<T>
): Promise<T | undefined> {
  const lockManager = typeof navigator === 'undefined' ? undefined : navigator.locks;

  if (operation === 'heartbeat') {
    // Fail closed without Web Locks rather than risk a stale heartbeat response
    // restoring session state after sign-out.
    if (!lockManager) return undefined;

    return lockManager.request(SESSION_ACTION_LOCK, { ifAvailable: true }, async (lock) => {
      if (!lock || signOutStartedSincePageLoad()) return undefined;
      const result = await action();

      // Re-check client state after the action boundary. A sign-out that completed
      // in another tab must make this best-effort result unusable by the caller.
      return signOutStartedSincePageLoad() ? undefined : result;
    });
  }

  const runSignOut = async () => {
    const marker = markSignOutStarted();
    try {
      return await action();
    } catch (error) {
      rollBackSignOutMarker(marker);
      throw error;
    }
  };

  // Logout must remain available in browsers without Web Locks. Heartbeats are
  // disabled in that case, so there is no client-side action to race with it.
  return lockManager
    ? lockManager.request(SESSION_ACTION_LOCK, runSignOut)
    : runSignOut();
}

export default function SessionHeartbeat() {
  const lastPingRef = useRef<number>(0);

  useEffect(() => {
    const backendType = (readEnv('BACKEND_TYPE') ?? 'upstream').toLowerCase();
    // Platform Compatibility Check: Standard Logto upstream backends (e.g. Logto Cloud/OSS)
    // do not support custom API endpoints like heartbeats (which is a Blacktop-specific feature).
    // Gracefully exit early to avoid unnecessary pinging and error logging under upstream mode.
    // This is an intentional, known-safe and accepted platform compatibility choice.
    if (backendType === 'upstream') return;

    const ping = () => {
      // Only ping when the tab is visible.
      if (document.visibilityState !== 'visible') return;

      // Debounce: don't fire twice within DEBOUNCE_MS.
      const now = Date.now();
      if (now - lastPingRef.current < DEBOUNCE_MS) return;

      lastPingRef.current = now;
      void withSessionActionLock('heartbeat', recordHeartbeat).catch(() => {});
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
