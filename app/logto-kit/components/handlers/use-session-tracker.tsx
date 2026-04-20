'use client';

import { useEffect, useRef } from 'react';

const TRACK_INTERVAL_MS = 5 * 60 * 1000;
const DEBOUNCE_MS = 5_000;

export function useSessionTracker(accessToken: string | null, userId: string | null) {
  const lastTrackRef = useRef<number>(0);
  const accessTokenRef = useRef(accessToken);
  const userIdRef = useRef(userId);

  useEffect(() => {
    accessTokenRef.current = accessToken;
    userIdRef.current = userId;
  }, [accessToken, userId]);

  useEffect(() => {
    if (!accessToken || !userId) return;

    const track = async () => {
      const now = Date.now();
      if (now - lastTrackRef.current < DEBOUNCE_MS) return;

      const token = accessTokenRef.current;
      const uid = userIdRef.current;
      if (!token || !uid) return;

      lastTrackRef.current = now;

      try {
        const res = await fetch('/api/session-track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken: token, userId: uid }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.updated) {
          console.log('[session-tracker] Session tracked OK');
        } else {
          console.warn('[session-tracker] Response:', data);
        }
      } catch {
        // Silent — non-critical
      }
    };

    track();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') track();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    const intervalId = setInterval(track, TRACK_INTERVAL_MS);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(intervalId);
    };
  }, [accessToken, userId]);
}