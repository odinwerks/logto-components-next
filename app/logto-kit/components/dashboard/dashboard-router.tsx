'use client';

import { useState, useEffect, useLayoutEffect, type ReactNode } from 'react';

const useHydrationSafeLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;

export function useIsPortrait(): boolean {
  const [portrait, setPortrait] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(orientation: portrait)').matches;
  });
  const [narrow, setNarrow] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 64rem)').matches;
  });

  useHydrationSafeLayoutEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const orientationMq = window.matchMedia('(orientation: portrait)');
    const widthMq = window.matchMedia('(max-width: 64rem)');

    setPortrait(orientationMq.matches);
    setNarrow(widthMq.matches);

    const handleOrientationChange = (e: MediaQueryListEvent) => setPortrait(e.matches);
    const handleWidthChange = (e: MediaQueryListEvent) => setNarrow(e.matches);

    orientationMq.addEventListener('change', handleOrientationChange);
    widthMq.addEventListener('change', handleWidthChange);

    return () => {
      orientationMq.removeEventListener('change', handleOrientationChange);
      widthMq.removeEventListener('change', handleWidthChange);
    };
  }, []);

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
