'use client';

import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(callback: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {};
  }
  const mq = window.matchMedia(QUERY);
  mq.addEventListener('change', callback);
  return () => mq.removeEventListener('change', callback);
}

function getSnapshot(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(QUERY).matches
  );
}

function getServerSnapshot(): boolean {
  return false;
}

/**
 * SSR-safe hook that returns `true` when the user prefers reduced motion.
 *
 * Uses `useSyncExternalStore` to subscribe to the `prefers-reduced-motion`
 * media query. On the server and during the first client render, returns
 * `false` (matching `getServerSnapshot`) to avoid hydration mismatches.
 * After hydration, the real client value is used.
 */
export function usePrefersReducedMotion(): boolean {
  const reduced = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  // Development override: force animations on regardless of OS reduced-motion
  // preference. Set NEXT_PUBLIC_FORCE_ANIMATIONS=true in .env to enable.
  if (process.env.NEXT_PUBLIC_FORCE_ANIMATIONS === 'true') {
    return false;
  }
  return reduced;
}
