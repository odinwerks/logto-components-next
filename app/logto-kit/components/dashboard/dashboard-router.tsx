'use client';

import { useSyncExternalStore, type ReactNode } from 'react';

/**
 * Single-subscription hook that checks both portrait orientation AND narrow width.
 * Combines two MediaQueries into one useSyncExternalStore to avoid double subscriptions (BUG-026).
 */
export function useIsPortrait(): boolean {
  return useSyncExternalStore(
    (callback) => {
      const mqPortrait = window.matchMedia('(orientation: portrait)');
      const mqNarrow = window.matchMedia('(max-width: 64rem)');

      mqPortrait.addEventListener('change', callback);
      mqNarrow.addEventListener('change', callback);

      return () => {
        mqPortrait.removeEventListener('change', callback);
        mqNarrow.removeEventListener('change', callback);
      };
    },
    () => {
      // Snapshot must be stable — read both and return combined result.
      // Do NOT create new MediaQueryList objects here; read from the same
      // ones created in the subscribe callback via window.matchMedia.
      return (
        window.matchMedia('(orientation: portrait)').matches ||
        window.matchMedia('(max-width: 64rem)').matches
      );
    },
    () => false // SSR fallback: render desktop on server (hidden by CSS media query on client)
  );
}

/**
 * BUG-008 fix: CSS-based mobile/desktop split to avoid hydration mismatch.
 * Both layouts are rendered, and CSS media queries show/hide them.
 * This eliminates the client-only JS toggle that caused SSR/client mismatch.
 */
export function DashboardRouter({
  desktop,
  mobile,
}: {
  desktop: ReactNode;
  mobile: ReactNode;
}) {
  return (
    <>
      <div className="ldd-desktop">{desktop}</div>
      <div className="ldd-mobile">{mobile}</div>
    </>
  );
}
