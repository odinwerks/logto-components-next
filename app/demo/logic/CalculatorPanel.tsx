'use client';

import { Protected } from '../../logto-kit/custom-logic';
import { CalculatorClient } from './CalculatorClient';

export default function CalculatorPanel() {
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
