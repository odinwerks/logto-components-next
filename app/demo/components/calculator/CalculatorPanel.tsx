'use client';

import { useEffect } from 'react';
import { Protected } from '../../../logto-kit/custom-logic';
import { useLogto } from '../../../logto-kit/components/providers/logto-provider';
import { CalculatorClient } from './CalculatorClient';

export default function CalculatorPanel() {
  const { isAuthenticated, openDashboard } = useLogto();

  // When unauthenticated, open the main auth modal instead of rendering an
  // inline fallback. The modal's routeTo will redirect the user back here
  // after they sign in.
  useEffect(() => {
    if (!isAuthenticated) {
      openDashboard({ routeTo: '/demo/calculator/live-calculator' });
    }
  }, [isAuthenticated, openDashboard]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Protected
      orgId="5b6sw6p5uzti"
      perm="calc:basic"
      fallback={null}
    >
      <CalculatorClient />
    </Protected>
  );
}
