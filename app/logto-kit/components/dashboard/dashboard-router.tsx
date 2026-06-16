'use client';

import { useSyncExternalStore, type ReactNode } from 'react';

const subscribeIsPortrait = (callback: () => void) => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
  const mqPortrait = window.matchMedia('(orientation: portrait)');
  const mqNarrow = window.matchMedia('(max-width: 64rem)');

  mqPortrait.addEventListener('change', callback);
  mqNarrow.addEventListener('change', callback);

  return () => {
    mqPortrait.removeEventListener('change', callback);
    mqNarrow.removeEventListener('change', callback);
  };
};

const getSnapshotIsPortrait = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return (
    window.matchMedia('(orientation: portrait)').matches ||
    window.matchMedia('(max-width: 64rem)').matches
  );
};

const getServerSnapshotIsPortrait = () => false;

/**
 * Single-subscription hook that checks both portrait orientation AND narrow width.
 * Combines two MediaQueries into one useSyncExternalStore to avoid double subscriptions (BUG-026).
 */
export function useIsPortrait(): boolean {
  return useSyncExternalStore(
    subscribeIsPortrait,
    getSnapshotIsPortrait,
    getServerSnapshotIsPortrait
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
