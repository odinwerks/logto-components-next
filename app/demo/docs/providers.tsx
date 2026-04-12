'use client';

import CodeBlock from '../utils/CodeBlock';
import { SectionContainer, Section } from '../utils/Section';

// ─── Shared styles ──────────────────────────────────────────────────────────

const twoColLayoutStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '16px',
  alignItems: 'stretch',
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

const tdPropStyle: React.CSSProperties = {
  ...tdStyle,
  color: '#9cdcdb',
  fontFamily: "'IBM Plex Mono', monospace",
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
// Page 1: Provider Hierarchy + Hydration Flow
// ═══════════════════════════════════════════════════════════════════════════════

function ProviderTreeSection() {
  return (
    <SectionWrap label="Provider hierarchy">
      <p style={textStyle}>
        <code style={codeStyle}>LogtoProvider</code> is the all-in-one entry point.
        You only need one wrapper in your app — it creates{' '}
        <code style={codeStyle}>PreferencesProvider</code> and{' '}
        <code style={codeStyle}>UserDataProvider</code> internally:
      </p>
      <CodeBlock title="All-in-one entry point" code={`<LogtoProvider
  userData={userData}       // from fetchDashboardData()
  accessToken={accessToken} // from fetchDashboardData()
  dashboard={<Dashboard />} // Server Component JSX
  initialTheme="dark"       // optional — falls back to storage or ENV
  initialLang="en-US"       // optional — falls back to storage or default
  onUpdateCustomData={updateUserCustomData} // optional — persists to Logto API
>
  <App />
</LogtoProvider>`} />
      <p style={textStyle}>
        Internally, <code style={codeStyle}>LogtoProvider</code> nests two providers:
      </p>
      <CodeBlock title="Internal structure (not user-facing)" code={`// Inside LogtoProvider:

<PreferencesProvider        // ← created automatically
  initialTheme={initialTheme}
  initialLang={initialLang}
  onUpdateCustomData={onUpdateCustomData}
>
  <LogtoProviderContent     // ← exposes useLogto()
    userData={userData}
    accessToken={accessToken}
    dashboard={dashboard}
  >
    <UserDataProvider        // ← created automatically
      userData={userData}
    >
      {children}
    </UserDataProvider>
  </LogtoProviderContent>
</PreferencesProvider>`} />
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Provider</th>
            <th style={thStyle}>Provides</th>
            <th style={thStyle}>Hooks</th>
            <th style={thStyle}>User manages?</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdPropStyle}>LogtoProvider</td>
            <td style={tdStyle}>All-in-one: user data, access token, dashboard modal, preferences, unified context</td>
            <td style={tdStyle}><code style={codeSmStyle}>useLogto()</code></td>
            <td style={tdStyle}><strong style={{ color: '#10b981' }}>Yes</strong></td>
          </tr>
          <tr>
            <td style={tdPropStyle}>PreferencesProvider</td>
            <td style={tdStyle}>Theme, language, org state + persistence</td>
            <td style={tdStyle}><code style={codeSmStyle}>useThemeMode()</code>, <code style={codeSmStyle}>useLangMode()</code>, <code style={codeSmStyle}>useOrgMode()</code></td>
            <td style={tdStyle}>Internal — created by LogtoProvider</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>UserDataProvider</td>
            <td style={tdStyle}>Cached user data (sessionStorage-backed)</td>
            <td style={tdStyle}><code style={codeSmStyle}>useUserDataContext()</code></td>
            <td style={tdStyle}>Internal — created by LogtoProvider</td>
          </tr>
        </tbody>
      </table>
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Note:</strong>{' '}
        <code style={codeStyle}>PreferencesProvider</code> and{' '}
        <code style={codeStyle}>UserDataProvider</code> are also exported for advanced
        use cases (e.g., using preference hooks outside a dashboard context), but most
        apps only need <code style={codeStyle}>LogtoProvider</code>.
      </div>
    </SectionWrap>
  );
}

function HydrationFlowSection() {
  return (
    <SectionWrap label="How hydration works">
      <p style={textStyle}>
        Server-side data flows into client-side providers through props. No manual
        wiring required.
      </p>
      <CodeBlock title="Server → Client pipeline" code={`// 1. Server Component (page.tsx)
export default async function HomePage() {
  const result = await fetchDashboardData();
  //    ↑ calls Logto Management API
  //    returns { userData, accessToken }

  return (
    <LogtoProvider
      userData={result.userData}
      accessToken={result.accessToken}
      dashboard={<Dashboard />}
      initialTheme="dark"
      onUpdateCustomData={updateUserCustomData}
    >
      <App />
    </LogtoProvider>
  );
}`} />
      <p style={textStyle}>
        Inside <code style={codeStyle}>LogtoProvider</code>, each child provider
        hydrates its state:
      </p>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Provider</th>
            <th style={thStyle}>Initial state source</th>
            <th style={thStyle}>Fallback chain</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdPropStyle}>PreferencesProvider</td>
            <td style={tdStyle}><code style={codeSmStyle}>sessionStorage</code></td>
            <td style={tdStyle}>storage → prop → ENV default → auto-detect</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>UserDataProvider</td>
            <td style={tdStyle}><code style={codeSmStyle}>sessionStorage</code></td>
            <td style={tdStyle}>storage → prop (server data)</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>AuthWatcher</td>
            <td style={tdStyle}>Placed in root layout</td>
            <td style={tdStyle}>N/A — triggers <code style={codeSmStyle}>router.refresh()</code></td>
          </tr>
        </tbody>
      </table>
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Key point:</strong>{' '}
        Preferences are read from <code style={codeStyle}>sessionStorage</code> on mount
        inside <code style={codeStyle}>LogtoProvider</code>. If the user previously
        selected a theme/language, it persists across page loads without server involvement.
      </div>
    </SectionWrap>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page 2: Hooks Reference
// ═══════════════════════════════════════════════════════════════════════════════

function UseLogtoSection() {
  return (
    <SectionWrap label="useLogto()">
      <p style={textStyle}>
        The unified hook. Exposes user data, access token, theme, language,
        organization, and dashboard controls from a single context.
      </p>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Field</th>
            <th style={thStyle}>Type</th>
            <th style={thStyle}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdPropStyle}>userData</td>
            <td style={tdStyle}><code style={codeSmStyle}>UserData</code></td>
            <td style={tdStyle}>Current user profile data</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>accessToken</td>
            <td style={tdStyle}><code style={codeSmStyle}>string</code></td>
            <td style={tdStyle}>JWT access token for API calls</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>theme</td>
            <td style={tdStyle}><code style={codeSmStyle}>&apos;dark&apos; | &apos;light&apos;</code></td>
            <td style={tdStyle}>Current theme mode</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>themeSpec</td>
            <td style={tdStyle}><code style={codeSmStyle}>ThemeSpec</code></td>
            <td style={tdStyle}>Full theme object (colors, tokens, components)</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>setTheme()</td>
            <td style={tdStyle}><code style={codeSmStyle}>(mode) =&gt; void</code></td>
            <td style={tdStyle}>Set theme, persists + dispatches event</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>toggleTheme()</td>
            <td style={tdStyle}><code style={codeSmStyle}>() =&gt; void</code></td>
            <td style={tdStyle}>Swap dark &lt;→ light</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>lang</td>
            <td style={tdStyle}><code style={codeSmStyle}>string</code></td>
            <td style={tdStyle}>Current language code (e.g. &quot;en-US&quot;)</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>setLang()</td>
            <td style={tdStyle}><code style={codeSmStyle}>(code) =&gt; void</code></td>
            <td style={tdStyle}>Set language, persists + dispatches event</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>asOrg</td>
            <td style={tdStyle}><code style={codeSmStyle}>string | null</code></td>
            <td style={tdStyle}>Active organization ID (null = global)</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>setAsOrg()</td>
            <td style={tdStyle}><code style={codeSmStyle}>(id) =&gt; void</code></td>
            <td style={tdStyle}>Switch organization</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>openDashboard()</td>
            <td style={tdStyle}><code style={codeSmStyle}>() =&gt; void</code></td>
            <td style={tdStyle}>Open dashboard modal</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>closeDashboard()</td>
            <td style={tdStyle}><code style={codeSmStyle}>() =&gt; void</code></td>
            <td style={tdStyle}>Close dashboard modal (also via ESC)</td>
          </tr>
        </tbody>
      </table>
      <CodeBlock title="Usage" code={`'use client';
import { useLogto } from './logto-kit';

function MyComponent() {
  const { userData, theme, openDashboard, setLang } = useLogto();

  return (
    <div>
      <p>Welcome, {userData.name}</p>
      <p>Theme: {theme}</p>
      <button onClick={openDashboard}>Open Dashboard</button>
      <button onClick={() => setLang('ka-GE')}>ქართული</button>
    </div>
  );
}`} />
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Throws:</strong>{' '}
        <code style={codeStyle}>useLogto()</code> throws if used outside{' '}
        <code style={codeStyle}>LogtoProvider</code>. Unlike the other hooks, it has
        no silent fallback.
      </div>
    </SectionWrap>
  );
}

function PreferenceHooksSection() {
  return (
    <SectionWrap label="Preference hooks">
      <p style={textStyle}>
        Three focused hooks for theme, language, and organization state. Available
        via <code style={codeStyle}>useLogto()</code> or directly from{' '}
        <code style={codeStyle}>PreferencesProvider</code> (created automatically
        by <code style={codeStyle}>LogtoProvider</code>).
      </p>

      <p style={{ ...textStyle, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem' }}>
        useThemeMode()
      </p>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Field</th>
            <th style={thStyle}>Type</th>
            <th style={thStyle}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdPropStyle}>theme</td>
            <td style={tdStyle}><code style={codeSmStyle}>&apos;dark&apos; | &apos;light&apos;</code></td>
            <td style={tdStyle}>Current mode</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>themeSpec</td>
            <td style={tdStyle}><code style={codeSmStyle}>ThemeSpec</code></td>
            <td style={tdStyle}>Full theme: colors, typography, radii, shadows, component styles</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>setTheme()</td>
            <td style={tdStyle}><code style={codeSmStyle}>(mode) =&gt; void</code></td>
            <td style={tdStyle}>Persist + dispatch</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>toggleTheme()</td>
            <td style={tdStyle}><code style={codeSmStyle}>() =&gt; void</code></td>
            <td style={tdStyle}>Swap dark &lt;→ light</td>
          </tr>
        </tbody>
      </table>
      <CodeBlock title="useThemeMode()" code={`'use client';
import { useThemeMode } from './logto-kit';

function ThemeToggle() {
  const { theme, themeSpec, toggleTheme } = useThemeMode();
  const c = themeSpec.colors;

  return (
    <button
      onClick={toggleTheme}
      style={{ background: c.bgSecondary, color: c.textPrimary }}
    >
      {theme === 'dark' ? 'Light mode' : 'Dark mode'}
    </button>
  );
}`} />

      <p style={{ ...textStyle, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginTop: '1rem' }}>
        useLangMode()
      </p>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Field</th>
            <th style={thStyle}>Type</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdPropStyle}>lang</td>
            <td style={tdStyle}><code style={codeSmStyle}>string</code></td>
          </tr>
          <tr>
            <td style={tdPropStyle}>setLang()</td>
            <td style={tdStyle}><code style={codeSmStyle}>(code: string) =&gt; void</code></td>
          </tr>
        </tbody>
      </table>
      <CodeBlock title="useLangMode()" code={`'use client';
import { useLangMode } from './logto-kit';

function LangSelector() {
  const { lang, setLang } = useLangMode();

  return (
    <select value={lang} onChange={e => setLang(e.target.value)}>
      <option value="en-US">English</option>
      <option value="ka-GE">ქართული</option>
    </select>
  );
}`} />

      <p style={{ ...textStyle, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginTop: '1rem' }}>
        useOrgMode()
      </p>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Field</th>
            <th style={thStyle}>Type</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdPropStyle}>asOrg</td>
            <td style={tdStyle}><code style={codeSmStyle}>string | null</code></td>
          </tr>
          <tr>
            <td style={tdPropStyle}>setAsOrg()</td>
            <td style={tdStyle}><code style={codeSmStyle}>(orgId: string | null) =&gt; void</code></td>
          </tr>
        </tbody>
      </table>
      <CodeBlock title="useOrgMode()" code={`'use client';
import { useOrgMode } from './logto-kit';

function OrgIndicator() {
  const { asOrg, setAsOrg } = useOrgMode();

  return asOrg ? (
    <span>Org: {asOrg}</span>
  ) : (
    <button onClick={() => setAsOrg('org_123')}>Join org</button>
  );
}`} />
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Outside provider:</strong>{' '}
        All three hooks return no-op <code style={codeStyle}>set</code> functions and
        auto-detected or default values when used outside{' '}
        <code style={codeStyle}>PreferencesProvider</code>. No errors — silent fallback.
        Each hook reads from <code style={codeStyle}>sessionStorage</code> first,
        then falls back to provider state or defaults.
      </div>
    </SectionWrap>
  );
}

function UserDataSection() {
  return (
    <SectionWrap label="useUserDataContext()">
      <p style={textStyle}>
        Returns cached user data from <code style={codeStyle}>UserDataProvider</code>.
        The cache is backed by <code style={codeStyle}>sessionStorage</code> under
        the key <code style={codeSmStyle}>user-data</code>.
      </p>
      <CodeBlock title="Usage" code={`'use client';
import { useUserDataContext } from './logto-kit';

function UserAvatar() {
  const userData = useUserDataContext();
  if (!userData) return null;

  return <img src={userData.avatar} alt={userData.name} />;
}`} />
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Returns:</strong>{' '}
        <code style={codeStyle}>UserData | null</code>. Returns{' '}
        <code style={codeStyle}>null</code> when used outside{' '}
        <code style={codeStyle}>UserDataProvider</code> or during SSR before hydration.
      </div>
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Caching behavior:</strong>{' '}
        On mount, if <code style={codeStyle}>sessionStorage</code> has cached data,
        it is used immediately to avoid a flash of empty/old UI. The provider
        updates the cache when the server-provided <code style={codeStyle}>userData</code> prop
        differs from the cached version (deep comparison via{' '}
        <code style={codeStyle}>JSON.stringify</code>).
      </div>
    </SectionWrap>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page 3: AuthWatcher + Cross-Tab Sync
// ═══════════════════════════════════════════════════════════════════════════════

function AuthWatcherSection() {
  return (
    <SectionWrap label="AuthWatcher">
      <p style={textStyle}>
        A zero-UI component that keeps auth state fresh by calling{' '}
        <code style={codeStyle}>router.refresh()</code> on three triggers.
        Place it in your root layout — it renders nothing.
      </p>
      <CodeBlock title="Root layout" code={`import AuthWatcher from './logto-kit';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AuthWatcher
          refreshIntervalMs={300000}  // 5 min (default)
          debounceMs={1000}           // min gap between refreshes
        />
        {children}
      </body>
    </html>
  );
}`} />
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Trigger</th>
            <th style={thStyle}>Catches</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdPropStyle}>visibilitychange</td>
            <td style={tdStyle}>User returns to tab — account deleted elsewhere, session revoked, role changed</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>online</td>
            <td style={tdStyle}>Network reconnect — session expired while offline (sleep, travel)</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>setInterval</td>
            <td style={tdStyle}>Long-lived sessions — admin deletes account while user idle on page</td>
          </tr>
        </tbody>
      </table>
      <p style={textStyle}>
        <code style={codeStyle}>router.refresh()</code> re-runs all Server Components
        on the page without a full page reload. Client state (form inputs, scroll
        position, modals) is preserved.
      </p>
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Debounce:</strong>{' '}
        Set <code style={codeStyle}>debounceMs</code> to control the minimum gap between
        refreshes. Prevents floods when multiple triggers fire simultaneously
        (e.g., tab focus + online at the same time).
      </div>
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Disable interval:</strong>{' '}
        Set <code style={codeStyle}>refreshIntervalMs=0</code> to disable periodic
        polling. Only visibility + online triggers remain active.
      </div>
    </SectionWrap>
  );
}

function CrossTabSyncSection() {
  return (
    <SectionWrap label="Cross-tab sync">
      <p style={textStyle}>
        Preferences (theme, language, org) sync across browser tabs via{' '}
        <code style={codeStyle}>sessionStorage</code> and a custom DOM event.
      </p>
      <CodeBlock title="Storage keys + event" code={`// Storage keys written by setTheme(), setLang(), setAsOrg():
sessionStorage.setItem('theme-mode', 'dark');
sessionStorage.setItem('lang-mode', 'en-US');
sessionStorage.setItem('org-mode', 'org_abc123');

// On every change, a unified event is dispatched:
window.dispatchEvent(new Event('preferences-changed'));

// External consumers re-read from storage:
window.addEventListener('preferences-changed', () => {
  const theme = sessionStorage.getItem('theme-mode');
  const lang  = sessionStorage.getItem('lang-mode');
  const org   = sessionStorage.getItem('org-mode');
  // apply changes...
});`} />
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Storage key</th>
            <th style={thStyle}>Set by</th>
            <th style={thStyle}>Read by</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdPropStyle}>theme-mode</td>
            <td style={tdStyle}><code style={codeSmStyle}>setTheme()</code></td>
            <td style={tdStyle}><code style={codeSmStyle}>useThemeMode()</code>, external consumers</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>lang-mode</td>
            <td style={tdStyle}><code style={codeSmStyle}>setLang()</code></td>
            <td style={tdStyle}><code style={codeSmStyle}>useLangMode()</code>, external consumers</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>org-mode</td>
            <td style={tdStyle}><code style={codeSmStyle}>setAsOrg()</code></td>
            <td style={tdStyle}><code style={codeSmStyle}>useOrgMode()</code>, external consumers</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>user-data</td>
            <td style={tdStyle}><code style={codeSmStyle}>UserDataProvider</code></td>
            <td style={tdStyle}><code style={codeSmStyle}>useUserDataContext()</code></td>
          </tr>
        </tbody>
      </table>
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Why sessionStorage:</strong>{' '}
        Persists across page navigations within the same tab but clears when
        the tab closes. This avoids stale data on new sessions while keeping
        the current session consistent.
      </div>
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Persistence:</strong>{' '}
        If <code style={codeStyle}>onUpdateCustomData</code> is provided to{' '}
        <code style={codeStyle}>LogtoProvider</code>, preference changes are also
        persisted to Logto&apos;s Management API via the custom data endpoint.
        This survives session boundaries.
      </div>
    </SectionWrap>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export default function ProvidersDoc() {
  return (
    <SectionContainer>
      {/* Page 1: Provider hierarchy + Hydration flow (two-column) */}
      <Section id={1}>
        <div style={{ ...twoColLayoutStyle, height: '100%', padding: '16px' }}>
          <div style={colLeftStyle}>
            <ProviderTreeSection />
          </div>
          <div style={colLeftStyle}>
            <HydrationFlowSection />
          </div>
        </div>
      </Section>

      {/* Page 2: Hooks reference (full width) */}
      <Section id={2}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          padding: '16px',
          height: '100%',
          overflow: 'auto',
        }}>
          <UseLogtoSection />
          <PreferenceHooksSection />
          <UserDataSection />
        </div>
      </Section>

      {/* Page 3: AuthWatcher + Cross-tab sync (two-column) */}
      <Section id={3}>
        <div style={{ ...twoColLayoutStyle, height: '100%', padding: '16px' }}>
          <div style={colLeftStyle}>
            <AuthWatcherSection />
          </div>
          <div style={colLeftStyle}>
            <CrossTabSyncSection />
          </div>
        </div>
      </Section>
    </SectionContainer>
  );
}
