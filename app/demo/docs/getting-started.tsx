'use client';

import CodeBlock from '../utils/CodeBlock';
import { SectionContainer, Section } from '../utils/Section';
import { useDocStyles } from '../utils/useDocStyles';
import { SectionHeader, SectionWrap } from '../utils/SectionComponents';

// ═══════════════════════════════════════════════════════════════════════════════
// Page 1: Clone + ENV
// ═══════════════════════════════════════════════════════════════════════════════

function WhatIsThisSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="What is this?">
      <p style={styles.textStyle}>
        A modular Next.js app with a pre-built user management Dashboard,
        auth system, theme/i18n handling, and reusable UI components. Clone it,
        replace the demo with your own app, and you have auth + a user settings
        page out of the box.
      </p>
      <table style={styles.tableStyle}>
        <thead>
          <tr>
            <th style={styles.thStyle}>What you get</th>
            <th style={styles.thStyle}>Exports</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tdStyle}>Dashboard (profile, MFA, orgs, sessions with device info)</td>
            <td style={styles.tdPathStyle}>Dashboard</td>
          </tr>
          <tr>
            <td style={styles.tdStyle}>Auth context + dashboard modal</td>
            <td style={styles.tdPathStyle}>LogtoProvider, useLogto</td>
          </tr>
          <tr>
            <td style={styles.tdStyle}>Avatar components</td>
            <td style={styles.tdPathStyle}>UserButton, UserBadge, UserCard</td>
          </tr>
          <tr>
            <td style={styles.tdStyle}>RBAC gate</td>
            <td style={styles.tdPathStyle}>Protected, OrgSwitcher</td>
          </tr>
          <tr>
            <td style={styles.tdStyle}>Theme + language</td>
            <td style={styles.tdPathStyle}>useThemeMode, useLangMode</td>
          </tr>
        </tbody>
      </table>
      <div style={{ ...styles.noteStyle, marginBottom: 0 }}>
        <strong style={styles.strongNoteStyle}>Note:</strong>{' '}
        All other docs assume you have completed this setup. Everything is designed
        to work inside <code style={styles.codeSmStyle}>LogtoProvider</code>.
      </div>
    </SectionWrap>
  );
}

function CloneSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Clone & install">
      <CodeBlock title="Clone" code={`git clone https://github.com/odinwerks/logto-components-next.git
cd logto-components-next`} />
      <CodeBlock title="Install" code={`npm install`} />
      <p style={styles.textStyle}>
        The repo is a working Next.js app. The{' '}
        <code style={styles.codeStyle}>app/logto-kit/</code> folder contains the kit — you
        don't touch it. The <code style={styles.codeStyle}>app/demo/</code> folder is the
        self-documenting showcase — you replace it.
      </p>
    </SectionWrap>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page 2: ENV + Console
// ═══════════════════════════════════════════════════════════════════════════════

function EnvSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="ENV setup">
      <p style={styles.textStyle}>
        Copy <code style={styles.codeStyle}>.env.example</code> to{' '}
        <code style={styles.codeStyle}>.env</code> and fill in your Logto credentials.
      </p>
      <table style={styles.tableStyle}>
        <thead>
          <tr>
            <th style={styles.thStyle}>Variable</th>
            <th style={styles.thStyle}>Where to get it</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tdPathStyle}>APP_ID</td>
            <td style={styles.tdStyle}>Logto Console → Applications → your app → App ID</td>
          </tr>
          <tr>
            <td style={styles.tdPathStyle}>APP_SECRET</td>
            <td style={styles.tdStyle}>Same page → App Secret</td>
          </tr>
          <tr>
            <td style={styles.tdPathStyle}>ENDPOINT</td>
            <td style={styles.tdStyle}>Your Logto tenant URL (no trailing slash)</td>
          </tr>
          <tr>
            <td style={styles.tdPathStyle}>BASE_URL</td>
            <td style={styles.tdStyle}>Your app URL (e.g. <code style={styles.codeSmStyle}>http://localhost:3000</code>)</td>
          </tr>
          <tr>
            <td style={styles.tdPathStyle}>COOKIE_SECRET</td>
            <td style={styles.tdStyle}>Generate a random 32-char string</td>
          </tr>
          <tr>
            <td style={styles.tdPathStyle}>SCOPES</td>
            <td style={styles.tdStyle}>OIDC scopes (see below)</td>
          </tr>
        </tbody>
      </table>
      <CodeBlock title="SCOPES" code={`# Minimum (includes sessions)
SCOPES=openid,profile,custom_data,email,phone,identities,sessions

# With organizations
SCOPES=openid,profile,custom_data,email,phone,identities,sessions,organizations,organization_roles`} />
    </SectionWrap>
  );
}

function AvatarEnvSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Avatar upload (pick one)">
      <p style={styles.textStyle}>
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
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Supabase:</strong>{' '}
        If <code style={styles.codeSmStyle}>SUPABASE_SERVICE_ROLE_KEY</code> is set, the system
        uses Supabase's REST API directly (more reliable). Otherwise it falls back to
        the MinIO S3 SDK using <code style={styles.codeSmStyle}>S3_*</code> vars.
      </div>
    </SectionWrap>
  );
}

function ConsoleSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Logto Console">
      <p style={styles.textStyle}>
        Create two applications in your Logto tenant:
      </p>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>1. Regular Web App</strong>
        <br />• Redirect URI: <code style={styles.codeSmStyle}>http://localhost:3000/callback</code>
        <br />• Post sign-out redirect: <code style={styles.codeSmStyle}>http://localhost:3000/</code>
        <br />• Enable Account API (Settings → Account → Account API)
      </div>
      <div style={{ ...styles.noteStyle, marginBottom: 0 }}>
        <strong style={styles.strongNoteStyle}>2. M2M App</strong>
        <br />• Purpose: Account deletion + Management API access
        <br />• Assign permission: <code style={styles.codeSmStyle}>User data → Write</code>
        <br />• Copy APP_ID → <code style={styles.codeSmStyle}>LOGTO_M2M_APP_ID</code>
        <br />• Copy APP_SECRET → <code style={styles.codeSmStyle}>LOGTO_M2M_APP_SECRET</code>
      </div>
    </SectionWrap>
  );
}

function SessionMetaEnvSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Session metadata (optional)">
      <p style={styles.textStyle}>
        Session cards show browser, OS, device type, IP, and last-active timestamps
        instead of raw client IDs. Enable via a PostSignIn webhook + S3 storage.
      </p>
      <CodeBlock title=".env" code={`# Session metadata bucket (separate from avatars)
S3_SESSION_BUCKET=session-meta

# Webhook signing key — from Logto Console > Webhooks
# Leave empty during dev to skip signature verification
LOGTO_WEBHOOK_SIGNING_KEY=`} />
      <CodeBlock title="Logto Console → Webhooks" code={`Create webhook:
  Name: Session Metadata
  Endpoint: https://your-domain.com/api/webhook/logto
  Events: PostSignIn
  Copy signing key → LOGTO_WEBHOOK_SIGNING_KEY`} />
      <div style={styles.noteStyle}>
        The bucket can share your Supabase project. Create a private{' '}
        <code style={styles.codeSmStyle}>session-meta</code> bucket allowing{' '}
        <code style={styles.codeSmStyle}>application/json</code> MIME type.
      </div>
    </SectionWrap>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page 3: Replace the demo + Run
// ═══════════════════════════════════════════════════════════════════════════════

function ReplaceSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Replace the demo">
      <p style={styles.textStyle}>
        The repo ships with a self-documenting demo app. Replace{' '}
        <code style={styles.codeStyle}>&lt;DemoApp /&gt;</code> with your own component.
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
      darkThemeSpec={defaultDarkTheme}
      lightThemeSpec={defaultLightTheme}
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
      darkThemeSpec={defaultDarkTheme}
      lightThemeSpec={defaultLightTheme}
    >
      <YourApp />  {/* ← your app */}
    </LogtoProvider>
  );
}`} />
      <p style={styles.textStyle}>
        That's it. The <code style={styles.codeStyle}>LogtoProvider</code>,{' '}
        <code style={styles.codeStyle}>Dashboard</code>, auth middleware, API routes — all
        stay the same. You just swap in your own app component.
      </p>
    </SectionWrap>
  );
}

function RunSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Run">
      <CodeBlock title="Development" code={`npm run dev`} />
      <p style={styles.textStyle}>
        Open <code style={styles.codeStyle}>http://localhost:3000</code>. You'll be redirected
        to Logto for sign-in. After auth, you'll see your app wrapped in{' '}
        <code style={styles.codeStyle}>LogtoProvider</code>.
      </p>
      <CodeBlock title="Build" code={`npm run build
npm start`} />
    </SectionWrap>
  );
}

function UsageSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Using the kit in your app">
      <p style={styles.textStyle}>
        Inside <code style={styles.codeStyle}>LogtoProvider</code>, everything works:
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
      <div style={{ ...styles.noteStyle, marginBottom: 0 }}>
        <strong style={styles.strongNoteStyle}>Important:</strong>{' '}
        All components are designed to work inside{' '}
        <code style={styles.codeSmStyle}>LogtoProvider</code>. Without it,{' '}
        <code style={styles.codeSmStyle}>useLogto()</code> returns empty data and
        avatar components show fallback icons after 1.5s.
      </div>
    </SectionWrap>
  );
}

function AuthFlowSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Auth flow (how it works)">
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>1.</strong>{' '}
        <code style={styles.codeSmStyle}>proxy.ts</code> runs on every request.
        Not authenticated → redirects to <code style={styles.codeSmStyle}>/api/auth/sign-in</code>.
      </div>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>2.</strong>{' '}
        Sign-in redirects to Logto. User authenticates, redirected to{' '}
        <code style={styles.codeSmStyle}>/callback</code>.
      </div>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>3.</strong>{' '}
        Callback exchanges code for tokens, redirects to{' '}
        <code style={styles.codeSmStyle}>/</code>.
      </div>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>4.</strong>{' '}
        <code style={styles.codeSmStyle}>page.tsx</code> fetches user data, wraps in{' '}
        <code style={styles.codeSmStyle}>LogtoProvider</code>.
      </div>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>5.</strong>{' '}
        <code style={styles.codeSmStyle}>AuthWatcher</code> re-runs Server Components on
        tab focus, network reconnect, and every 5 min interval.
      </div>
      <div style={{ ...styles.noteStyle, marginBottom: 0 }}>
        <strong style={styles.strongNoteStyle}>6.</strong>{' '}
        Sign-out clears tokens, redirects to Logto. Stale cookies cleared by{' '}
        <code style={styles.codeSmStyle}>/api/wipe</code>.
      </div>
    </SectionWrap>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export default function GettingStartedDoc() {
  const styles = useDocStyles();
  return (
    <SectionContainer>
      {/* Page 1: What + Clone */}
      <Section id={1}>
        <div style={{ ...styles.twoColLayoutStyle, height: '100%', padding: '16px' }}>
          <div style={styles.colLeftStyle}>
            <WhatIsThisSection />
          </div>
          <div style={styles.colLeftStyle}>
            <CloneSection />
          </div>
        </div>
      </Section>

      {/* Page 2: ENV + Console */}
      <Section id={2}>
        <div style={{ ...styles.twoColLayoutStyle, height: '100%', padding: '16px' }}>
          <div style={styles.colLeftStyle}>
            <EnvSection />
            <ConsoleSection />
          </div>
          <div style={styles.colLeftStyle}>
            <AvatarEnvSection />
            <SessionMetaEnvSection />
          </div>
        </div>
      </Section>

      {/* Page 3: Replace + Run + Use */}
      <Section id={3}>
        <div style={{ ...styles.twoColLayoutStyle, height: '100%', padding: '16px' }}>
          <div style={styles.colLeftStyle}>
            <ReplaceSection />
            <RunSection />
          </div>
          <div style={styles.colLeftStyle}>
            <UsageSection />
            <AuthFlowSection />
          </div>
        </div>
      </Section>
    </SectionContainer>
  );
}
