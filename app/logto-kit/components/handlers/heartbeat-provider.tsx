'use client';

/**
 * HeartbeatProvider — keeps user session context alive while tab is active
 *
 * Sends periodic heartbeats to server to indicate user is active.
 * When heartbeats stop (tab closed), server clears asOrg after timeout.
 *
 * Works with both memory mode (dev) and Redis mode (prod).
 */

import { useEffect, useRef, useCallback } from 'react';

interface HeartbeatProviderProps {
  /** Interval between heartbeats in ms. Default: 30000 (30s) */
  intervalMs?: number;
  /** Get current access token - called on each heartbeat */
  getToken?: () => string | null;
  /** Get current org ID - called on each heartbeat */
  getOrgId?: () => string | null;
}

export function HeartbeatProvider({
  intervalMs = 30_000,
  getToken,
  getOrgId,
}: HeartbeatProviderProps) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);

  // Default token getter - tries common storage locations
  const defaultGetToken = useCallback((): string | null => {
    // Try sessionStorage first (where Logto kit stores it)
    try {
      const sessionToken = sessionStorage.getItem('logto-token');
      if (sessionToken) return sessionToken;
    } catch {
      // sessionStorage might be unavailable
    }

    // Try cookie
    const cookieMatch = document.cookie
      .split('; ')
      .find((row) => row.startsWith('logto-token='));
    if (cookieMatch) {
      return cookieMatch.split('=')[1];
    }

    return null;
  }, []);

  // Default org ID getter - tries sessionStorage
  const defaultGetOrgId = useCallback((): string | null => {
    try {
      return sessionStorage.getItem('logto-active-org');
    } catch {
      return null;
    }
  }, []);

  const tokenGetter = getToken ?? defaultGetToken;
  const orgIdGetter = getOrgId ?? defaultGetOrgId;

  useEffect(() => {
    isMountedRef.current = true;

    const sendHeartbeat = async () => {
      const token = tokenGetter();
      if (!token) {
        // No token = not logged in, skip silently
        return;
      }

      const orgId = orgIdGetter();

      try {
        const response = await fetch('/api/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, orgId }),
          keepalive: true, // Ensures request completes even if tab closing
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          console.debug('[Heartbeat] Server error:', data.error);
        }
      } catch (err) {
        // Silent fail — heartbeat is best-effort
        console.debug('[Heartbeat] Request failed:', err);
      }
    };

    // Initial heartbeat on mount
    sendHeartbeat();

    // Set up interval
    intervalRef.current = setInterval(sendHeartbeat, intervalMs);

    // Send heartbeat when tab becomes visible (user returned)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isMountedRef.current) {
        sendHeartbeat();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      isMountedRef.current = false;

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      document.removeEventListener('visibilitychange', handleVisibilityChange);

      // Send final heartbeat (best effort - keepalive helps)
      sendHeartbeat();
    };
  }, [intervalMs, tokenGetter, orgIdGetter]);

  return null; // Zero-UI component
}
