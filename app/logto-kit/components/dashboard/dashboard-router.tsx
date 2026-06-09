'use client';

import { useSyncExternalStore, type ReactNode } from 'react';

export function useIsPortrait(): boolean {
  const portrait = useSyncExternalStore(
    (callback) => {
      const mq = window.matchMedia('(orientation: portrait)');
      mq.addEventListener('change', callback);
      return () => mq.removeEventListener('change', callback);
    },
    () => window.matchMedia('(orientation: portrait)').matches,
    () => false // SSR fallback
  );

  const narrow = useSyncExternalStore(
    (callback) => {
      const mq = window.matchMedia('(max-width: 64rem)');
      mq.addEventListener('change', callback);
      return () => mq.removeEventListener('change', callback);
    },
    () => window.matchMedia('(max-width: 64rem)').matches,
    () => false // SSR fallback
  );

  return portrait || narrow;
}

export function DashboardRouter({
  desktop,
  mobile,
}: {
  desktop: ReactNode;
  mobile: ReactNode;
}) {
  const isPortrait = useIsPortrait();
  return <>{isPortrait ? mobile : desktop}</>;
}
