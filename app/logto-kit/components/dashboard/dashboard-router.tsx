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
 *   - Before `mounted` flips true, render a NEUTRAL placeholder (BUG-2 fix).
 *     Previously the desktop branch leaked through here, flashing the desktop
 *     profile tab ("personal") on portrait devices for one frame.
 *   - After hydration, render whichever branch matches the live media query.
 * This cuts the rendered subtree in half post-hydration with no mismatch and
 * no branch flash during the gate.
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
    // BUG-2 fix (initial "personal" tab flash): render a NEUTRAL placeholder
    // instead of the desktop branch during the SSR/first-client-render gate.
    // Previously this returned `<>{desktop}</>`, which painted
    // DashboardClient with `activeTab = loadedTabs[0] ?? 'profile'` — so on a
    // portrait device the user saw the desktop profile tab ("personal") for
    // one frame before the orientation check flipped to the mobile menu.
    //
    // Because `useIsPortrait`'s server snapshot returns `false` and `mounted`
    // starts `false` on both server and client, SSR also produces this
    // placeholder — so the first client render matches the server HTML and
    // hydration is safe. After the mount effect runs, the correct branch
    // (desktop or mobile) renders.
    //
    // The `mounted` gate pattern itself is preserved (NEVER-TOUCH rule); only
    // what it renders changed.
    return <div aria-busy="true" style={{ minHeight: '100dvh' }} />;
  }

  // Post-hydration: render only the active layout.
  return isPortrait ? <>{mobile}</> : <>{desktop}</>;
}
