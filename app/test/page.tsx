export const dynamic = 'force-dynamic';

import { MobileDashboard } from '../logto-kit/components/dashboard/mobile-page';

export default function TestPage() {
  return (
    <main style={{ minHeight: '100dvh' }}>
      <MobileDashboard />
    </main>
  );
}
