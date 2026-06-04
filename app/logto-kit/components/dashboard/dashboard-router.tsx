'use client';

import { useState, useEffect, type ReactNode } from 'react';

export function useIsPortrait(): boolean {
  const [portrait, setPortrait] = useState(false);
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
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
