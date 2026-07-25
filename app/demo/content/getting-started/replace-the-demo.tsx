'use client';

import { useDocStyles } from '../../components/useDocStyles';
import CodeBlock from '../../components/SyntaxBlock';
import { useThemeMode } from '../../../logto-kit/components/providers/preferences';
import { slugify } from '../../components/SectionComponents';

export default function ReplaceTheDemo() {
  const styles = useDocStyles();
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';

  const h2Style: React.CSSProperties = {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: isDark ? '#f3f4f6' : '#111827',
    marginTop: '32px',
    marginBottom: '16px',
    borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`,
    paddingBottom: '8px',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <h2 id={slugify("Replacing the Demo App")} style={{ ...h2Style, marginTop: 0 }}>Replacing the Demo App</h2>
      
      <p style={styles.textStyle}>
        Once you understand how the kit functions, replace the demonstration showcase with your own application shell. In this starter kit, global layout + server-side OIDC hydration live in the ROOT <code style={styles.codeSmStyle}>app/layout.tsx</code>. The root layout wraps everything in a provider tree: <code style={styles.codeSmStyle}>MotionConfigProvider</code> (outermost, controls Framer Motion reduced-motion), <code style={styles.codeSmStyle}>LogtoProvider</code>, <code style={styles.codeSmStyle}>AuthWatcher</code>, <code style={styles.codeSmStyle}>SessionHeartbeat</code> (fires heartbeat every 30s while tab is visible, gated to non-upstream backends), and <code style={styles.codeSmStyle}>LangSync</code> (syncs lang preference to the DOM for screen readers). The <code style={styles.codeSmStyle}>app/(docs)/layout.tsx</code> performs additional data fetching for the docs shell and renders <code style={styles.codeSmStyle}>DocsLayoutClient</code>. When replacing the demo, either keep both layout files or consolidate into your root layout.
      </p>
      
      <CodeBlock title="Current docs layout (from app/(docs)/layout.tsx)" code={`export const dynamic = 'force-dynamic';

import React, { Suspense } from 'react';
import { fetchDashboardDataCached } from '../logto-kit/logic/cached-dashboard';
import { AuthErrorBanner } from '../logto-kit/components/auth-error-banner';
import DocsLayoutClient from './layout-client';
import { DocsErrorFallback } from './docs-error-fallback';

export default async function DocsLayout({ children }: { children: React.ReactNode }) {
  const result = await fetchDashboardDataCached(true);

  if (!result.success) {
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
      <DocsLayoutClient>
        <Suspense fallback={null}>
          <AuthErrorBanner />
        </Suspense>
        {children}
      </DocsLayoutClient>
    </Suspense>
  );
}`} />

      <p style={styles.textStyle}>
        Note: <code style={styles.codeSmStyle}>LogtoProvider</code> wrapping (with <code style={styles.codeSmStyle}>userData</code> + dashboard JSX props) lives in the ROOT <code style={styles.codeSmStyle}>app/layout.tsx</code>, not in <code style={styles.codeSmStyle}>(docs)/layout.tsx</code>. The docs layout only performs additional data fetching for the docs shell.
      </p>

      <CodeBlock title="Root layout provider tree (from app/layout.tsx)" code={`<body>
  <MotionConfigProvider>
    <LogtoProvider
      userData={userData}
      dashboard={{ desktop: <Dashboard />, mobile: <MobileDashboard /> }}
      initialTheme={resolvedTheme}
      initialLang={resolvedLang}
      initialOrgId={resolvedOrg}
      allTranslations={allTranslations}
      fallbackTranslations={fallbackTranslations}
    >
      <AuthWatcher />
      <SessionHeartbeat />
      {children}
      <LangSync />
    </LogtoProvider>
  </MotionConfigProvider>
</body>`} />

      <h2 id={slugify("Using the Kit inside your components")} style={h2Style}>Using the Kit inside your components</h2>
      
      <p style={styles.textStyle}>
        You can consume authentication state, localization preferences, and UI controls anywhere inside your component tree under <code style={styles.codeSmStyle}>LogtoProvider</code>.
      </p>
      
      <CodeBlock title="Import API" code={`import {
  useLogto, useThemeMode, useLangMode, useUserDataContext,
  UserButton, UserBadge, UserCard,
  Protected, OrgSwitcher,
} from './logto-kit';`} />
      
      <CodeBlock title="Usage Example" code={`function Header() {
  const { isAuthenticated, openDashboard } = useLogto();
  const userData = useUserDataContext();
  return (
    <header style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      {isAuthenticated && <span>Hello, {userData?.name ?? 'User'}</span>}
      <UserButton Size="36px" />
      <button onClick={openDashboard}>Settings Dashboard</button>
    </header>
  );
}`} />

      <h2 id={slugify("Run in Development & Production")} style={h2Style}>Run in Development & Production</h2>
      
      <p style={styles.textStyle}>
        To run locally, use a current Node.js LTS runtime (Node 20+ recommended for modern Next.js toolchains).
      </p>
      
      <CodeBlock title="Development Mode" code={`npm run dev`} />
      
      <p style={styles.textStyle}>
        Open <code style={styles.codeSmStyle}>http://localhost:3000</code>. You will be routed through the auth guard automatically and returned to the application context.
      </p>
      
      <CodeBlock title="Production Build" code={`npm run build
npm start`} />

      <h2 id={slugify("Deploying with Docker & Cloudflare Tunnel")} style={h2Style}>Deploying with Docker & Cloudflare Tunnel</h2>
      
      <p style={styles.textStyle}>
        The repository is pre-configured with a multi-stage production <code style={styles.codeSmStyle}>Dockerfile</code> and a <code style={styles.codeSmStyle}>docker-compose.yml</code> file orchestrating both the application and a secure <code style={styles.codeSmStyle}>cloudflared</code> tunnel sidecar. 
        Application port <code style={styles.codeSmStyle}>2999</code> is isolated internally so only Cloudflare can access it.
      </p>
      
      <CodeBlock title="Step 1 - Configure Tunnel and Public Base URL in .env" code={`# PUBLIC_BASE_URL is mapped to the runtime container variable BASE_URL, so it does not require rebuilding. Must match your final public domain name.
PUBLIC_BASE_URL=https://dash.yourdomain.org

# Paste your Cloudflare Zero Trust Tunnel Token
CLOUDFLARE_TUNNEL_TOKEN=your-cloudflare-tunnel-token`} />
      
      <div style={{ ...styles.noteStyle, marginTop: '16px' }}>
        <strong style={styles.strongNoteStyle}>Step 2 - DNS Routing:</strong> Point your Cloudflare Tunnel host settings to point your domain name directly to the internal container endpoint <code style={styles.codeSmStyle}>http://logto-dash:2999</code>.
      </div>
      
      <CodeBlock title="Step 3 - Compose Build & Run" code={`# Build the container images
docker compose build

# Spawn the microservices in detached mode
docker compose up -d`} />
      
      <CodeBlock title="Upstream Updates" code={`git pull
docker compose build --no-cache
docker compose up -d`} />
      
      <div style={{ ...styles.noteStyle, marginTop: '16px' }}>
        <strong style={styles.strongNoteStyle}>Build note:</strong> If you change any client-side <code style={styles.codeSmStyle}>NEXT_PUBLIC_*</code> environment variables, you must perform a clean container rebuild with <code style={styles.codeSmStyle}>docker compose build --no-cache</code>.
      </div>

      <h2 id={slugify("The Authentication Lifecycle (How it Works)")} style={h2Style}>The Authentication Lifecycle (How it Works)</h2>
      
      <p style={styles.textStyle}>
        Here is a step-by-step description of how the authorization layers secure your application:
      </p>
      
      <div style={styles.noteStyle}>
            <strong style={styles.strongNoteStyle}>1. Proxy Guard (Next.js Middleware):</strong> <code style={styles.codeSmStyle}>proxy.ts</code> (the project&apos;s custom Next.js middleware) intercepts incoming server-side requests. Unauthenticated requests on PROTECTED routes are redirected to <code style={styles.codeSmStyle}>/api/auth/sign-in</code>. Public paths (root, <code style={styles.codeSmStyle}>/demo/*</code>, docs topic prefixes, <code style={styles.codeSmStyle}>/api/auth/sign-in</code>, <code style={styles.codeSmStyle}>/callback</code>, <code style={styles.codeSmStyle}>/api/wipe</code>) are excluded.
      </div>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>2. OIDC Authorize:</strong> Sign-in endpoint redirects to Logto. After successful login, Logto routes back to the <code style={styles.codeSmStyle}>/callback</code> route.
      </div>
      <div style={styles.noteStyle}>
            <strong style={styles.strongNoteStyle}>3. Callback Handler:</strong> The <code style={styles.codeSmStyle}>/callback</code> route delegates to <code style={styles.codeSmStyle}>handleSignIn()</code>, which completes the OAuth callback by exchanging the authorization code for tokens. Sign-in initiation is handled exclusively by <code style={styles.codeSmStyle}>/api/auth/sign-in</code>.
      </div>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>4. Context Hydration:</strong> The ROOT <code style={styles.codeSmStyle}>app/layout.tsx</code> loads user data via <code style={styles.codeSmStyle}>fetchDashboardDataCached</code> and hydrates the client&apos;s <code style={styles.codeSmStyle}>LogtoProvider</code> context. The full provider tree is <code style={styles.codeSmStyle}>MotionConfigProvider</code> &gt; <code style={styles.codeSmStyle}>LogtoProvider</code> &gt; (<code style={styles.codeSmStyle}>AuthWatcher</code>, <code style={styles.codeSmStyle}>SessionHeartbeat</code>, <code style={styles.codeSmStyle}>{'{children}'}</code>, <code style={styles.codeSmStyle}>LangSync</code>). The <code style={styles.codeSmStyle}>app/(docs)/layout.tsx</code> performs a secondary auth-tolerant fetch for the docs error banner.
      </div>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>5. Session Refresh:</strong> The <code style={styles.codeSmStyle}>AuthWatcher</code> watches for tab refocusing, online connection restored events, and standard 60-second intervals to silently refresh authentication states. The <code style={styles.codeSmStyle}>SessionHeartbeat</code> fires <code style={styles.codeSmStyle}>recordHeartbeat()</code> every 30 seconds while the tab is visible (gated to <code style={styles.codeSmStyle}>BACKEND_TYPE !== &apos;upstream&apos;</code>).
      </div>
      <div style={{ ...styles.noteStyle, marginBottom: 0 }}>
        <strong style={styles.strongNoteStyle}>6. Client Sign-out:</strong> Sign-out is handled by the <code style={styles.codeSmStyle}>signOutUser()</code> Server Action, which calls Logto&apos;s <code style={styles.codeSmStyle}>signOut()</code> and redirects back to the app. The <code style={styles.codeSmStyle}>/api/wipe</code> endpoint is a recovery path for stale cookies (e.g., <code style={styles.codeSmStyle}>invalid_grant</code>), not the primary sign-out mechanism.
      </div>
    </div>
  );
}
