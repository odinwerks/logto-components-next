'use client';

import { Protected } from '../../logto-kit/custom-logic';
import { PresidentControlPanelClient } from './PresidentControlPanelClient';

export default function PresidentControlPanel() {
  return (
    <Protected orgId="5b6sw6p5uzti" perm="kidnap:kids">
      <PresidentControlPanelClient />
    </Protected>
  );
}