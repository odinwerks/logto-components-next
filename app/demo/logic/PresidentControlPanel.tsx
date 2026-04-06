import { ClientProtected } from './ClientProtected';
import { PresidentControlPanelClient } from './PresidentControlPanelClient';

export function PresidentControlPanel() {
  return (
    <ClientProtected orgId="government" perm="kidnap:kids">
      <PresidentControlPanelClient />
    </ClientProtected>
  );
}