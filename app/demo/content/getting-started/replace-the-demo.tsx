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
        Once you understand how the kit functions, replace the demonstration showcase with your own application shell. In this starter kit, global layout + server-side OIDC hydration live in <code style={styles.codeSmStyle}>app/(docs)/layout.tsx</code>, while <code style={styles.codeSmStyle}>app/page.tsx</code> currently redirects to the docs route. When replacing the demo, either move this provider wiring into your root layout (<code style={styles.codeSmStyle}>app/layout.tsx</code>) or keep the route-group approach.
      </p>
      
      <CodeBlock title="Current provider wiring (from app/(docs)/layout.tsx)" code={`import { LogtoProvider } from '../logto-kit/components/providers/logto-provider';
import { Dashboard } from '../logto-kit/components/dashboard';
import { MobileDashboard } from '../logto-kit/components/dashboard/mobile-page';

export default async function DocsLayout({ children }) {
  const result = await fetchDashboardData();
  if (!result.success) {
    if ('needsAuth' in result && result.needsAuth) redirect('/callback');
    return <div>Failed to load user data</div>;
  }

  return (
    <LogtoProvider
      userData={result.userData}
      dashboard={{ desktop: <Dashboard />, mobile: <MobileDashboard /> }}
    >
      {children}
    </LogtoProvider>
  );
}`} />

      <h2 id={slugify("Using the Kit inside your components")} style={h2Style}>Using the Kit inside your components</h2>
      
      <p style={styles.textStyle}>
        You can consume authentication state, localization preferences, and UI controls anywhere inside your component tree under <code style={styles.codeSmStyle}>LogtoProvider</code>.
      </p>
      
      <CodeBlock title="Import API" code={`import {
  useLogto, useThemeMode, useLangMode,
  UserButton, UserBadge, UserCard,
  Protected, OrgSwitcher,
} from './logto-kit';`} />
      
      <CodeBlock title="Usage Example" code={`function Header() {
  const { userData, openDashboard } = useLogto();
  return (
    <header style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <span>Hello, {userData.name}</span>
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
            <strong style={styles.strongNoteStyle}>1. Proxy Guard (Next.js Middleware):</strong> <code style={styles.codeSmStyle}>proxy.ts</code> (the project&apos;s custom Next.js middleware) intercepts incoming server-side requests. Unauthenticated requests are redirected straight to <code style={styles.codeSmStyle}>/api/auth/sign-in</code>.
      </div>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>2. OIDC Authorize:</strong> Sign-in endpoint redirects to Logto. After successful login, Logto routes back to the <code style={styles.codeSmStyle}>/callback</code> route.
      </div>
      <div style={styles.noteStyle}>
            <strong style={styles.strongNoteStyle}>3. Callback Handler:</strong> The <code style={styles.codeSmStyle}>/callback</code> route delegates to <code style={styles.codeSmStyle}>handleSignIn()</code>, which completes the OAuth callback by exchanging the authorization code for tokens. Sign-in initiation is handled exclusively by <code style={styles.codeSmStyle}>/api/auth/sign-in</code>.
      </div>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>4. Context Hydration:</strong> <code style={styles.codeSmStyle}>app/(docs)/layout.tsx</code> loads user profile credentials server-side and hydrates the client&apos;s <code style={styles.codeSmStyle}>LogtoProvider</code> context.
      </div>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>5. Session Refresh:</strong> The <code style={styles.codeSmStyle}>AuthWatcher</code> watches for tab refocusing, online connection restored events, and standard 5-minute intervals to silently refresh authentication states.
      </div>
      <div style={{ ...styles.noteStyle, marginBottom: 0 }}>
        <strong style={styles.strongNoteStyle}>6. Client Sign-out:</strong> Clearing access tokens redirects back to Logto. Any remaining residual session cookies are systematically purged by the client-initiated <code style={styles.codeSmStyle}>/api/wipe</code> endpoint.
      </div>
    </div>
  );
}
