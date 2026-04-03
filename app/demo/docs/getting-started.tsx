'use client';

import CodeBlock from '../utils/CodeBlock';
import { SectionContainer, Section } from '../utils/Section';

// ─── Shared styles ──────────────────────────────────────────────────────────

const twoColLayoutStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '16px',
  alignItems: 'start',
};

const colLeftStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
};

const sectionWrapStyle: React.CSSProperties = {
  border: '1px solid rgba(255,255,255,0.058)',
  borderRadius: '5px',
  overflow: 'hidden',
  background: 'rgba(255,255,255,0.01)',
  display: 'flex',
  flexDirection: 'column',
};

const sectionHeadStyle: React.CSSProperties = {
  padding: '8px 14px',
  borderBottom: '1px solid rgba(255,255,255,0.045)',
  display: 'flex',
  alignItems: 'center',
  gap: '7px',
  background: 'rgba(255,255,255,0.015)',
};

const sectionDotStyle: React.CSSProperties = {
  width: '4px',
  height: '4px',
  borderRadius: '50%',
  background: 'rgba(255,255,255,0.18)',
  flexShrink: 0,
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: '9px',
  fontWeight: 600,
  color: 'rgba(255,255,255,0.28)',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
};

const sectionBodyStyle: React.CSSProperties = {
  padding: '20px 16px',
};

const textStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  lineHeight: 1.7,
  color: 'rgba(255,255,255,0.5)',
  fontFamily: "'DM Sans', system-ui, sans-serif",
  marginBottom: '0.75rem',
};

const codeStyle: React.CSSProperties = {
  color: '#9cdcdb',
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: '0.75rem',
};

const codeSmStyle: React.CSSProperties = {
  color: '#ce9178',
  fontSize: '0.6875rem',
  fontFamily: "'IBM Plex Mono', monospace",
};

const noteStyle: React.CSSProperties = {
  fontSize: '0.6875rem',
  lineHeight: 1.7,
  color: 'rgba(255,255,255,0.38)',
  fontFamily: "'DM Sans', system-ui, sans-serif",
  marginBottom: '0.625rem',
  paddingLeft: '10px',
  borderLeft: '2px solid rgba(255,255,255,0.06)',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: '0.6875rem',
  marginBottom: '0.75rem',
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '7px 10px',
  borderBottom: '1px solid rgba(255,255,255,0.08)',
  color: 'rgba(255,255,255,0.35)',
  fontWeight: 600,
  fontSize: '0.5625rem',
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '7px 10px',
  borderBottom: '1px solid rgba(255,255,255,0.035)',
  color: 'rgba(255,255,255,0.5)',
  verticalAlign: 'top',
  lineHeight: 1.5,
};

const tdPathStyle: React.CSSProperties = {
  ...tdStyle,
  color: '#ce9178',
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: '0.625rem',
  whiteSpace: 'nowrap',
};

// ─── Section wrappers ────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <div style={sectionHeadStyle}>
      <div style={sectionDotStyle} />
      <span style={sectionLabelStyle}>{label}</span>
    </div>
  );
}

function SectionWrap({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={sectionWrapStyle}>
      <SectionHeader label={label} />
      <div style={{ ...sectionBodyStyle, flex: 1 }}>{children}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page 1: Clone + ENV
// ═══════════════════════════════════════════════════════════════════════════════

function WhatIsThisSection() {
  return (
    <SectionWrap label="What is this?">
      <p style={textStyle}>
        A modular Next.js app with a pre-built user management Dashboard,
        auth system, theme/i18n handling, and reusable UI components. Clone it,
        replace the demo with your own app, and you have auth + a user settings
        page out of the box.
      </p>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>What you get</th>
            <th style={thStyle}>Exports</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdStyle}>Dashboard (profile, MFA, orgs, tokens)</td>
            <td style={tdPathStyle}>Dashboard</td>
          </tr>
          <tr>
            <td style={tdStyle}>Auth context + dashboard modal</td>
            <td style={tdPathStyle}>LogtoProvider, useLogto</td>
          </tr>
          <tr>
            <td style={tdStyle}>Avatar components</td>
            <td style={tdPathStyle}>UserButton, UserBadge, UserCard</td>
          </tr>
          <tr>
            <td style={tdStyle}>RBAC gate</td>
            <td style={tdPathStyle}>Protected, OrgSwitcher</td>
          </tr>
          <tr>
            <td style={tdStyle}>Theme + language</td>
            <td style={tdPathStyle}>useThemeMode, useLangMode</td>
          </tr>
        </tbody>
      </table>
      <div style={{ ...noteStyle, marginBottom: 0 }}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Note:</strong>{' '}
        All other docs assume you have completed this setup. Everything is designed
        to work inside <code style={codeSmStyle}>LogtoProvider</code>.
      </div>
    </SectionWrap>
  );
}

function CloneSection() {
  return (
    <SectionWrap label="Clone & install">
      <CodeBlock title="Clone" code={`git clone https://github.com/odinwerks/logto-components-next.git
cd logto-components-next`} />
      <CodeBlock title="Install" code={`npm install`} />
      <p style={textStyle}>
        The repo is a working Next.js app. The{' '}
        <code style={codeStyle}>app/logto-kit/</code> folder contains the kit — you
        don't touch it. The <code style={codeStyle}>app/demo/</code> folder is the
        self-documenting showcase — you replace it.
      </p>
    </SectionWrap>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page 2: ENV + Console
// ═══════════════════════════════════════════════════════════════════════════════

function EnvSection() {
  return (
    <SectionWrap label="ENV setup">
      <p style={textStyle}>
        Copy <code style={codeStyle}>.env.example</code> to{' '}
        <code style={codeStyle}>.env</code> and fill in your Logto credentials.
      </p>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Variable</th>
            <th style={thStyle}>Where to get it</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdPathStyle}>APP_ID</td>
            <td style={tdStyle}>Logto Console → Applications → your app → App ID</td>
          </tr>
          <tr>
            <td style={tdPathStyle}>APP_SECRET</td>
            <td style={tdStyle}>Same page → App Secret</td>
          </tr>
          <tr>
            <td style={tdPathStyle}>ENDPOINT</td>
            <td style={tdStyle}>Your Logto tenant URL (no trailing slash)</td>
          </tr>
          <tr>
            <td style={tdPathStyle}>BASE_URL</td>
            <td style={tdStyle}>Your app URL (e.g. <code style={codeSmStyle}>http://localhost:3000</code>)</td>
          </tr>
          <tr>
            <td style={tdPathStyle}>COOKIE_SECRET</td>
            <td style={tdStyle}>Generate a random 32-char string</td>
          </tr>
          <tr>
            <td style={tdPathStyle}>SCOPES</td>
            <td style={tdStyle}>OIDC scopes (see below)</td>
          </tr>
        </tbody>
      </table>
      <CodeBlock title="SCOPES" code={`# Minimum
SCOPES=openid,profile,custom_data,email,phone,identities

# With organizations
SCOPES=openid,profile,custom_data,email,phone,identities,organizations,organization_roles`} />
    </SectionWrap>
  );
}

function AvatarEnvSection() {
  return (
    <SectionWrap label="Avatar upload (pick one)">
      <p style={textStyle}>
        Avatar uploads need S3-compatible storage. Choose ONE approach:
      </p>
      <CodeBlock title="Option A: Supabase REST API (recommended)" code={`# Supabase Dashboard → Settings → API → Service role key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

S3_BUCKET_NAME=avatars
S3_PUBLIC_URL=https://your-project.supabase.co/storage/v1/object/public/avatars`} />
      <CodeBlock title="Option B: MinIO / S3 SDK" code={`S3_ENDPOINT=https://your-project.supabase.co/storage/v1/s3
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key
S3_REGION=auto
S3_BUCKET_NAME=avatars
S3_PUBLIC_URL=https://your-project.supabase.co/storage/v1/object/public/avatars`} />
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Supabase:</strong>{' '}
        If <code style={codeSmStyle}>SUPABASE_SERVICE_ROLE_KEY</code> is set, the system
        uses Supabase's REST API directly (more reliable). Otherwise it falls back to
        the MinIO S3 SDK using <code style={codeSmStyle}>S3_*</code> vars.
      </div>
    </SectionWrap>
  );
}

function ConsoleSection() {
  return (
    <SectionWrap label="Logto Console">
      <p style={textStyle}>
        Create two applications in your Logto tenant:
      </p>
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>1. Regular Web App</strong>
        <br />• Redirect URI: <code style={codeSmStyle}>http://localhost:3000/callback</code>
        <br />• Post sign-out redirect: <code style={codeSmStyle}>http://localhost:3000/</code>
        <br />• Enable Account API (Settings → Account → Account API)
      </div>
      <div style={{ ...noteStyle, marginBottom: 0 }}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>2. M2M App</strong>
        <br />• Purpose: Account deletion + Management API access
        <br />• Assign permission: <code style={codeSmStyle}>User data → Write</code>
        <br />• Copy APP_ID → <code style={codeSmStyle}>LOGTO_M2M_APP_ID</code>
        <br />• Copy APP_SECRET → <code style={codeSmStyle}>LOGTO_M2M_APP_SECRET</code>
      </div>
    </SectionWrap>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page 3: Replace the demo + Run
// ═══════════════════════════════════════════════════════════════════════════════

function ReplaceSection() {
  return (
    <SectionWrap label="Replace the demo">
      <p style={textStyle}>
        The repo ships with a self-documenting demo app. Replace{' '}
        <code style={codeStyle}>&lt;DemoApp /&gt;</code> with your own component.
      </p>
      <CodeBlock title="app/page.tsx (current)" code={`import DemoApp from './demo'; // ← this is the demo

export default async function HomePage() {
  const result = await fetchDashboardData();
  if (!result.success) { /* ... */ }

  return (
    <LogtoProvider
      userData={result.userData}
      accessToken={result.accessToken}
      dashboard={<Dashboard />}
    >
      <DemoApp />  {/* ← replace this */}
    </LogtoProvider>
  );
}`} />
      <CodeBlock title="app/page.tsx (yours)" code={`export default async function HomePage() {
  const result = await fetchDashboardData();
  if (!result.success) { /* ... */ }

  return (
    <LogtoProvider
      userData={result.userData}
      accessToken={result.accessToken}
      dashboard={<Dashboard />}
    >
      <YourApp />  {/* ← your app */}
    </LogtoProvider>
  );
}`} />
      <p style={textStyle}>
        That's it. The <code style={codeStyle}>LogtoProvider</code>,{' '}
        <code style={codeStyle}>Dashboard</code>, auth middleware, API routes — all
        stay the same. You just swap in your own app component.
      </p>
    </SectionWrap>
  );
}

function RunSection() {
  return (
    <SectionWrap label="Run">
      <CodeBlock title="Development" code={`npm run dev`} />
      <p style={textStyle}>
        Open <code style={codeStyle}>http://localhost:3000</code>. You'll be redirected
        to Logto for sign-in. After auth, you'll see your app wrapped in{' '}
        <code style={codeStyle}>LogtoProvider</code>.
      </p>
      <CodeBlock title="Build" code={`npm run build
npm start`} />
    </SectionWrap>
  );
}

function UsageSection() {
  return (
    <SectionWrap label="Using the kit in your app">
      <p style={textStyle}>
        Inside <code style={codeStyle}>LogtoProvider</code>, everything works:
      </p>
      <CodeBlock title="Import from logto-kit" code={`import {
  useLogto, useThemeMode, useLangMode,
  UserButton, UserBadge, UserCard,
  Protected, OrgSwitcher,
} from './logto-kit';`} />
      <CodeBlock title="Example" code={`function Header() {
  const { userData, openDashboard } = useLogto();

  return (
    <header>
      <span>Hello, {userData.name}</span>
      <UserButton Size="36px" />
      <button onClick={openDashboard}>Settings</button>
    </header>
  );
}`} />
      <div style={{ ...noteStyle, marginBottom: 0 }}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Important:</strong>{' '}
        All components are designed to work inside{' '}
        <code style={codeSmStyle}>LogtoProvider</code>. Without it,{' '}
        <code style={codeSmStyle}>useLogto()</code> returns empty data and
        avatar components show fallback icons after 1.5s.
      </div>
    </SectionWrap>
  );
}

function AuthFlowSection() {
  return (
    <SectionWrap label="Auth flow (how it works)">
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>1.</strong>{' '}
        <code style={codeSmStyle}>proxy.ts</code> runs on every request.
        Not authenticated → redirects to <code style={codeSmStyle}>/api/auth/sign-in</code>.
      </div>
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>2.</strong>{' '}
        Sign-in redirects to Logto. User authenticates, redirected to{' '}
        <code style={codeSmStyle}>/callback</code>.
      </div>
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>3.</strong>{' '}
        Callback exchanges code for tokens, redirects to{' '}
        <code style={codeSmStyle}>/</code>.
      </div>
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>4.</strong>{' '}
        <code style={codeSmStyle}>page.tsx</code> fetches user data, wraps in{' '}
        <code style={codeSmStyle}>LogtoProvider</code>.
      </div>
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>5.</strong>{' '}
        <code style={codeSmStyle}>AuthWatcher</code> re-runs Server Components on
        tab focus, network reconnect, and every 5 min interval.
      </div>
      <div style={{ ...noteStyle, marginBottom: 0 }}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>6.</strong>{' '}
        Sign-out clears tokens, redirects to Logto. Stale cookies cleared by{' '}
        <code style={codeSmStyle}>/api/wipe</code>.
      </div>
    </SectionWrap>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export default function GettingStartedDoc() {
  return (
    <SectionContainer>
      {/* Page 1: What + Clone */}
      <Section id={1}>
        <div style={{ ...twoColLayoutStyle, height: '100%', padding: '16px' }}>
          <div style={colLeftStyle}>
            <WhatIsThisSection />
          </div>
          <div style={colLeftStyle}>
            <CloneSection />
          </div>
        </div>
      </Section>

      {/* Page 2: ENV + Console */}
      <Section id={2}>
        <div style={{ ...twoColLayoutStyle, height: '100%', padding: '16px' }}>
          <div style={colLeftStyle}>
            <EnvSection />
            <ConsoleSection />
          </div>
          <div style={colLeftStyle}>
            <AvatarEnvSection />
          </div>
        </div>
      </Section>

      {/* Page 3: Replace + Run + Use */}
      <Section id={3}>
        <div style={{ ...twoColLayoutStyle, height: '100%', padding: '16px' }}>
          <div style={colLeftStyle}>
            <ReplaceSection />
            <RunSection />
          </div>
          <div style={colLeftStyle}>
            <UsageSection />
            <AuthFlowSection />
          </div>
        </div>
      </Section>
    </SectionContainer>
  );
}
