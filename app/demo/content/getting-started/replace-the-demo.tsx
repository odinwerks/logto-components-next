'use client';

import { useDocStyles } from '../../components/useDocStyles';
import CodeBlock from '../../components/SyntaxBlock';
import { SectionWrap } from '../../components/SectionComponents';

export default function ReplaceTheDemo() {
  const styles = useDocStyles();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <SectionWrap label="Replacing the Demo App">
        <p style={styles.textStyle}>
          Once you understand how the kit functions, replace the demonstration showcase with your own application shell. In this starter kit, the global layout and server-side OIDC hydration live under the layout route group at <code style={styles.codeSmStyle}>app/(docs)/layout.tsx</code>, and <code style={styles.codeSmStyle}>app/page.tsx</code> is a simple redirect to guide users to the docs. When replacing the demo, you can lift the provider structure into your root layout (<code style={styles.codeSmStyle}>app/layout.tsx</code>) or keep the route group setup.
        </p>
        <CodeBlock title="app/page.tsx (Structure)" code={`import { LogtoProvider } from './logto-kit';
import { Dashboard } from './logto-kit/components/dashboard';
import { MobileDashboard } from './logto-kit/components/dashboard/mobile-page';
import DemoApp from './demo'; // ← Replace this import with your own component!

export default async function HomePage() {
  const result = await fetchDashboardData();
  if (!result.success) { /* Handle error states */ }

  return (
    <LogtoProvider
      userData={result.userData}
      dashboard={{ desktop: <Dashboard />, mobile: <MobileDashboard /> }}
    >
      <DemoApp />  {/* ← Instantiate your application here */}
    </LogtoProvider>
  );
}`} />
      </SectionWrap>

      <SectionWrap label="Using the Kit inside your components">
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
      <UserButton size="36px" />
      <button onClick={openDashboard}>Settings Dashboard</button>
    </header>
  );
}`} />
      </SectionWrap>

      <SectionWrap label="Run in Development & Production">
        <p style={styles.textStyle}>
          To run the project locally, verify you are using <strong>Node.js v18+ (LTS) or v20+ (LTS)</strong> (due to modern APIs like <code style={styles.codeSmStyle}>globalThis.structuredClone</code> which are fully supported natively since Node v17).
        </p>
        <CodeBlock title="Development Mode" code={`npm run dev`} />
        <p style={styles.textStyle}>
          Open <code style={styles.codeSmStyle}>http://localhost:3000</code>. You will be routed through the auth guard automatically and returned to the application context.
        </p>
        <CodeBlock title="Production Build" code={`npm run build
npm start`} />
      </SectionWrap>

      <SectionWrap label="Deploying with Docker & Cloudflare Tunnel">
        <p style={styles.textStyle}>
          The repository is pre-configured with a multi-stage production <code style={styles.codeSmStyle}>Dockerfile</code> and a <code style={styles.codeSmStyle}>docker-compose.yml</code> file orchestrating both the application and a secure <code style={styles.codeSmStyle}>cloudflared</code> tunnel sidecar. 
          Application port <code style={styles.codeSmStyle}>2999</code> is isolated internally so only Cloudflare can access it.
        </p>
        <CodeBlock title="Step 1 - Configure Tunnel and Public Base URL in .env" code={`# PUBLIC_BASE_URL is baked into Next.js at build-time. Must match your final public domain name.
PUBLIC_BASE_URL=https://dash.yourdomain.org

# Paste your Cloudflare Zero Trust Tunnel Token
CLOUDFLARE_TUNNEL_TOKEN=your-cloudflare-tunnel-token`} />
        <div style={styles.noteStyle}>
          <strong style={styles.strongNoteStyle}>Step 2 - DNS Routing:</strong> Point your Cloudflare Tunnel host settings to point your domain name directly to the internal container endpoint <code style={styles.codeSmStyle}>http://logto-dash:2999</code>.
        </div>
        <CodeBlock title="Step 3 - Compose Build & Run" code={`# Build the container images
docker compose build

# Spawn the microservices in detached mode
docker compose up -d`} />
        <CodeBlock title="Upstream Updates" code={`git pull
docker compose build --no-cache
docker compose up -d`} />
        <div style={{ ...styles.noteStyle, marginBottom: 0 }}>
          <strong style={styles.strongNoteStyle}>Build note:</strong> If you change any client-side <code style={styles.codeSmStyle}>NEXT_PUBLIC_*</code> environment variables, you must perform a clean container rebuild with <code style={styles.codeSmStyle}>docker compose build --no-cache</code>.
        </div>
      </SectionWrap>

      <SectionWrap label="The Authentication Lifecycle (How it Works)">
        <p style={styles.textStyle}>
          Here is a step-by-step description of how the authorization layers secure your application:
        </p>
        <div style={styles.noteStyle}>
          <strong style={styles.strongNoteStyle}>1. Proxy Guard (Next.js 16):</strong> <code style={styles.codeSmStyle}>proxy.ts</code> (the official Next.js 16 proxy convention replacing deprecated middleware) intercepts incoming server-side requests. Unauthenticated requests are redirected straight to <code style={styles.codeSmStyle}>/api/auth/sign-in</code>.
        </div>
        <div style={styles.noteStyle}>
          <strong style={styles.strongNoteStyle}>2. OIDC Authorize:</strong> Sign-in endpoint redirects to Logto. After successful login, Logto routes back to the <code style={styles.codeSmStyle}>/callback</code> route.
        </div>
        <div style={styles.noteStyle}>
          <strong style={styles.strongNoteStyle}>3. Token Exchange:</strong> The callback endpoint securely exchanges the authorization code for tokens, writes session cookies, and redirects back to <code style={styles.codeSmStyle}>/</code>.
        </div>
        <div style={styles.noteStyle}>
          <strong style={styles.strongNoteStyle}>4. Context Hydration:</strong> <code style={styles.codeSmStyle}>app/(docs)/layout.tsx</code> loads user profile credentials server-side and hydrates the client's <code style={styles.codeSmStyle}>LogtoProvider</code> context.
        </div>
        <div style={styles.noteStyle}>
          <strong style={styles.strongNoteStyle}>5. Session Refresh:</strong> The <code style={styles.codeSmStyle}>AuthWatcher</code> watches for tab refocusing, online connection restored events, and standard 5-minute intervals to silently refresh authentication states.
        </div>
        <div style={{ ...styles.noteStyle, marginBottom: 0 }}>
          <strong style={styles.strongNoteStyle}>6. Client Sign-out:</strong> Clearing access tokens redirects back to Logto. Any remaining residual session cookies are systematically purged by the client-initiated <code style={styles.codeSmStyle}>/api/wipe</code> endpoint.
        </div>
      </SectionWrap>
    </div>
  );
}
