'use client';

/**
 * logto-kit/src/components/auth-watcher.tsx
 *
 * <AuthWatcher /> — the "live update by force" engine.
 *
 * Zero-UI client component. Sits in your root layout and calls router.refresh()
 * whenever the auth state might have gone stale. router.refresh() re-runs all
 * Server Components on the page (including SignedIn / SignedOut) without a full
 * page reload, and without losing client state (useState, scroll position, etc).
 *
 * Triggers:
 *   1. visibilitychange → visible  Tab regains focus (most important — catches
 *                                   "logged out in another tab" instantly)
 *   2. online                       Network reconnects (catches expired sessions
 *                                   that built up while offline)
 *   3. Interval (default: 5 min)   Periodic check for long-lived sessions where
 *                                   the account is deleted while idle on the page
 */

import { useEffect, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface AuthWatcherProps {
  /** How often (in ms) to proactively refresh auth state. Default: 300000 (5 min).
   *  Set to 0 to disable interval polling and rely only on tab-focus + online triggers. */
  refreshIntervalMs?: number;
  /** Minimum ms between refreshes — prevents a flood of calls if triggers fire
   *  in rapid succession (e.g., tab focus + online at the same time). Default: 1000. */
  debounceMs?: number;
}

export default function AuthWatcher({
  refreshIntervalMs = 300_000,
  debounceMs = 1_000,
}: AuthWatcherProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // useRef to hold debounce state — avoids adding to effect deps
  const lastRefreshRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // ▼ BUG FIX: define refresh INSIDE the effect so it captures the correct
    // closure. Previously it was defined in the component body, which means
    // the event listeners always called the stale refresh from the initial render.
    // Defining it here ensures the listeners always get the current closure.
    const refresh = () => {
      const now = Date.now();

      // Rate-limit: don't fire within debounceMs of the last refresh
      if (now - lastRefreshRef.current < debounceMs) return;

      // Cancel any pending refresh (in case two triggers fire close together)
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      // Schedule the refresh on the next tick so rapid-fire events collapse
      timeoutRef.current = setTimeout(() => {
        lastRefreshRef.current = Date.now();
        // useTransition keeps this refresh non-blocking — it won't freeze
        // any urgent UI updates that happen at the same time
        startTransition(() => {
          router.refresh();
        });
      }, 0);
    };

    // ── Trigger 1: Tab becomes visible ────────────────────────────────────
    // User switches back to this tab from another — they may have signed out
    // elsewhere, or an admin may have deleted the account in the interim.
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // ── Trigger 2: Network reconnects ─────────────────────────────────────
    // Device went offline and came back — session may have expired during
    // the offline period, especially for long gaps (sleep, travel, etc.)
    window.addEventListener('online', refresh);

    // ── Trigger 3: Interval ───────────────────────────────────────────────
    // Catches the "user is actively on the page for a long time" case —
    // e.g., admin deletes account while user is idle on the dashboard.
    let intervalId: ReturnType<typeof setInterval> | null = null;
    if (refreshIntervalMs > 0) {
      intervalId = setInterval(refresh, refreshIntervalMs);
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', refresh);
      if (intervalId !== null) clearInterval(intervalId);
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    };
  }, [router, startTransition, debounceMs, refreshIntervalMs]);
  // ↑ All actual dependencies listed. router and startTransition are stable
  // references from Next.js/React, so this effect runs exactly once on mount.

  return null;
}
