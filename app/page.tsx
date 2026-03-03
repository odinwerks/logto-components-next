export const dynamic = 'force-dynamic';

import { Dashboard } from './logto-kit/src';

export default function HomePage() {
  return (
    <main style={{ minHeight: '100vh', background: '#0a0a0a' }}>
      <Dashboard />
    </main>
  );
}
