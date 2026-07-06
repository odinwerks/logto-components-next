'use client';

import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';

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
 * BUG-008 fix: SSR renders the desktop branch only (via the server snapshot
 * returning false), which is what the client must render on its first pass to
 * avoid a hydration mismatch.
 *
 * BUG-009 fix: after hydration, render ONLY the active layout instead of both.
 * The previous implementation always rendered both `desktop` and `mobile` slots
 * (hiding one with CSS), which caused both RSC parents to call
 * `fetchDashboardData` and doubled the per-open Management-API load. We now
 * defer the orientation-aware branch selection until after mount:
 *   - Before `mounted` flips true, render the desktop branch (matches SSR HTML).
 *   - After hydration, render whichever branch matches the live media query.
 * This cuts the rendered subtree in half post-hydration with no mismatch.
 */
export function DashboardRouter({
  desktop,
  mobile,
}: {
  desktop: ReactNode;
  mobile: ReactNode;
}) {
  const isPortrait = useIsPortrait();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-once guard is the canonical Next.js SSR/hydration pattern
    setMounted(true);
  }, []);

  if (!mounted) {
    // SSR + first client render: render only desktop to match server HTML.
    return <>{desktop}</>;
  }

  // Post-hydration: render only the active layout.
  return isPortrait ? <>{mobile}</> : <>{desktop}</>;
}
