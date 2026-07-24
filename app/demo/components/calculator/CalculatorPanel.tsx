'use client';

import { useEffect } from 'react';
import { Protected } from '../../../logto-kit';
import { useLogto } from '../../../logto-kit/components/providers/logto-provider';
import { CalculatorClient } from './CalculatorClient';

export default function CalculatorPanel() {
  const { isAuthenticated, openDashboard } = useLogto();

  // When unauthenticated, open the main auth modal instead of rendering an
  // inline fallback. The modal's routeTo will redirect the user back here
  // after they sign in.
  useEffect(() => {
    if (!isAuthenticated) {
      openDashboard({ routeTo: '/calculator/live-demo' });
    }
  }, [isAuthenticated, openDashboard]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Protected
      orgId="8joxv3kicmlz"
      perm="calc:basic"
      fallback={null}
    >
      <CalculatorClient />
    </Protected>
  );
}
