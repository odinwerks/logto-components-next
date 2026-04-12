import { ClientProtected } from './ClientProtected';
import { PresidentControlPanelClient } from './PresidentControlPanelClient';

export default function PresidentControlPanel() {
  return (
    <ClientProtected orgId="5b6sw6p5uzti" perm="kidnap:kids">
      <PresidentControlPanelClient />
    </ClientProtected>
  );
}