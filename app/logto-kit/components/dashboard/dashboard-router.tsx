'use client';

import { Activity, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';

const subscribeIsPortrait = (callback: () => void) => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
  const mqPortrait = window.matchMedia('(orientation: portrait)');

  mqPortrait.addEventListener('change', callback);

  return () => {
    mqPortrait.removeEventListener('change', callback);
  };
};

const getSnapshotIsPortrait = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(orientation: portrait)').matches;
};

const getServerSnapshotIsPortrait = () => false;

/**
 * Single-subscription hook that checks portrait orientation.
 * Uses a single MediaQuery in useSyncExternalStore.
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
 * Defer the orientation-aware layout until after mount:
 *   - Before `mounted` flips true, render a NEUTRAL placeholder (BUG-2 fix).
 *     Previously the desktop branch leaked through here, flashing the desktop
 *     profile tab ("personal") on portrait devices for one frame.
 *   - After hydration, keep both layout instances stable while an Activity
 *     boundary hides the inactive one. React preserves its state and DOM, but
 *     cleans up its effects while hidden so duplicate subscriptions and lazy
 *     work do not remain active.
 * This prevents orientation round-trips from destroying drafts, visited tabs,
 * and scroll state without reintroducing active duplicate work.
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

  return (
    <>
      <Activity name="desktop-dashboard-shell" mode={isPortrait ? 'hidden' : 'visible'}>
        <div
          data-testid="desktop-dashboard-shell"
          aria-hidden={isPortrait ? true : undefined}
          inert={isPortrait}
          style={{ width: '100%' }}
        >
          {desktop}
        </div>
      </Activity>
      <Activity name="mobile-dashboard-shell" mode={isPortrait ? 'visible' : 'hidden'}>
        <div
          data-testid="mobile-dashboard-shell"
          aria-hidden={isPortrait ? undefined : true}
          inert={!isPortrait}
          style={{ width: '100%' }}
        >
          {mobile}
        </div>
      </Activity>
    </>
  );
}
