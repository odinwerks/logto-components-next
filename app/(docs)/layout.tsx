export const dynamic = 'force-dynamic';

import React, { Suspense } from 'react';
import { fetchDashboardDataCached } from '../logto-kit/logic/cached-dashboard';
import { AuthErrorBanner } from '../logto-kit/components/auth-error-banner';
import DocsLayoutClient from './layout-client';
import { DocsErrorFallback } from './docs-error-fallback';

export default async function DocsLayout({ children }: { children: React.ReactNode }) {
  const result = await fetchDashboardDataCached({ tolerateAuthErrors: true });

  if (!result.success) {
    // Unauthenticated users (needsAuth) are allowed to view public docs routes.
    // The root layout's LogtoProvider already provides anonymous state via
    // auth-tolerant fetchDashboardData, so we just render normally here.
    if ('needsAuth' in result && result.needsAuth) {
      return (
        <Suspense fallback={null}>
          <DocsLayoutClient>
            {children}
          </DocsLayoutClient>
        </Suspense>
      );
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
