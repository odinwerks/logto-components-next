export const dynamic = 'force-dynamic';

import React, { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { fetchDashboardData } from '../logto-kit/logic/actions';
import { AuthErrorBanner } from '../logto-kit/components/auth-error-banner';
import DocsLayoutClient from './layout-client';
import { DocsErrorFallback } from './docs-error-fallback';

export default async function DocsLayout({ children }: { children: React.ReactNode }) {
  const result = await fetchDashboardData();

  if (!result.success) {
    if ('needsAuth' in result && result.needsAuth) {
      redirect('/callback');
    }
    const errorMessage = 'error' in result ? String(result.error) : 'Failed to load user data';
    return <DocsErrorFallback message={errorMessage} />;
  }

  return (
    <Suspense fallback={null}>
      <AuthErrorBanner />
      <DocsLayoutClient>
        {children}
      </DocsLayoutClient>
    </Suspense>
  );
}
