'use client';

import { useState, useEffect, type ReactNode } from 'react';

export function useIsPortrait(): boolean {
  const [portrait, setPortrait] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(orientation: portrait)');
    setPortrait(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPortrait(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return portrait;
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
