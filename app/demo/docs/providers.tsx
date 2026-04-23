'use client';

import CodeBlock from '../utils/CodeBlock';
import { SectionContainer, Section } from '../utils/Section';
import { useDocStyles } from '../utils/useDocStyles';
import { SectionHeader, SectionWrap } from '../utils/SectionComponents';

// ═══════════════════════════════════════════════════════════════════════════════
// Page 1: Provider Hierarchy + Hydration Flow
// ═══════════════════════════════════════════════════════════════════════════════

function ProviderTreeSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Provider hierarchy">
      <p style={styles.textStyle}>
        <code style={styles.codeStyle}>LogtoProvider</code> is the all-in-one entry point.
        You only need one wrapper in your app — it creates{' '}
        <code style={styles.codeStyle}>PreferencesProvider</code> and{' '}
        <code style={styles.codeStyle}>UserDataProvider</code> internally:
      </p>
      <CodeBlock title="All-in-one entry point" code={`<LogtoProvider
  userData={userData}       // from fetchDashboardData()
  accessToken={accessToken} // from fetchDashboardData()
  dashboard={<Dashboard />} // Server Component JSX
  initialTheme="dark"       // optional — falls back to storage or ENV
  initialLang="en-US"       // optional — falls back to storage or default
  onUpdateCustomData={updateUserCustomData} // optional — persists to Logto API
  darkThemeSpec={defaultDarkTheme}   // required
  lightThemeSpec={defaultLightTheme} // required
>
  <App />
</LogtoProvider>`} />
      <p style={styles.textStyle}>
        Internally, <code style={styles.codeStyle}>LogtoProvider</code> nests two providers:
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
      <table style={styles.tableStyle}>
        <thead>
          <tr>
            <th style={styles.thStyle}>Provider</th>
            <th style={styles.thStyle}>Provides</th>
            <th style={styles.thStyle}>Hooks</th>
            <th style={styles.thStyle}>User manages?</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tdPropStyle}>LogtoProvider</td>
            <td style={styles.tdStyle}>All-in-one: user data, access token, dashboard modal, preferences, unified context</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>useLogto()</code></td>
            <td style={styles.tdStyle}><strong style={{ color: '#10b981' }}>Yes</strong></td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>PreferencesProvider</td>
            <td style={styles.tdStyle}>Theme, language, org state + persistence</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>useThemeMode()</code>, <code style={styles.codeSmStyle}>useLangMode()</code>, <code style={styles.codeSmStyle}>useOrgMode()</code></td>
            <td style={styles.tdStyle}>Internal — created by LogtoProvider</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>UserDataProvider</td>
            <td style={styles.tdStyle}>Cached user data (sessionStorage-backed)</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>useUserDataContext()</code></td>
            <td style={styles.tdStyle}>Internal — created by LogtoProvider</td>
          </tr>
        </tbody>
      </table>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Note:</strong>{' '}
        <code style={styles.codeStyle}>PreferencesProvider</code> and{' '}
        <code style={styles.codeStyle}>UserDataProvider</code> are also exported for advanced
        use cases (e.g., using preference hooks outside a dashboard context), but most
        apps only need <code style={styles.codeStyle}>LogtoProvider</code>.
      </div>
    </SectionWrap>
  );
}

function HydrationFlowSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="How hydration works">
      <p style={styles.textStyle}>
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
      darkThemeSpec={defaultDarkTheme}
      lightThemeSpec={defaultLightTheme}
    >
      <App />
    </LogtoProvider>
  );
}`} />
      <p style={styles.textStyle}>
        Inside <code style={styles.codeStyle}>LogtoProvider</code>, each child provider
        hydrates its state:
      </p>
      <table style={styles.tableStyle}>
        <thead>
          <tr>
            <th style={styles.thStyle}>Provider</th>
            <th style={styles.thStyle}>Initial state source</th>
            <th style={styles.thStyle}>Fallback chain</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tdPropStyle}>PreferencesProvider</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>sessionStorage</code></td>
            <td style={styles.tdStyle}>storage → prop → ENV default → auto-detect</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>UserDataProvider</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>sessionStorage</code></td>
            <td style={styles.tdStyle}>storage → prop (server data)</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>AuthWatcher</td>
            <td style={styles.tdStyle}>Placed in root layout</td>
            <td style={styles.tdStyle}>N/A — triggers <code style={styles.codeSmStyle}>router.refresh()</code></td>
          </tr>
        </tbody>
      </table>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Key point:</strong>{' '}
        Preferences are read from <code style={styles.codeStyle}>sessionStorage</code> on mount
        inside <code style={styles.codeStyle}>LogtoProvider</code>. If the user previously
        selected a theme/language, it persists across page loads without server involvement.
      </div>
    </SectionWrap>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page 2: Hooks Reference
// ═══════════════════════════════════════════════════════════════════════════════

function UseLogtoSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="useLogto()">
      <p style={styles.textStyle}>
        The unified hook. Exposes user data, access token, theme, language,
        organization, and dashboard controls from a single context.
      </p>
      <table style={styles.tableStyle}>
        <thead>
          <tr>
            <th style={styles.thStyle}>Field</th>
            <th style={styles.thStyle}>Type</th>
            <th style={styles.thStyle}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tdPropStyle}>userData</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>UserData</code></td>
            <td style={styles.tdStyle}>Current user profile data</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>accessToken</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>string</code></td>
            <td style={styles.tdStyle}>JWT access token for API calls</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>theme</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>&apos;dark&apos; | &apos;light&apos;</code></td>
            <td style={styles.tdStyle}>Current theme mode</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>themeSpec</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>ThemeSpec</code></td>
            <td style={styles.tdStyle}>Full theme object (colors, tokens, components)</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>setTheme()</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>(mode) =&gt; void</code></td>
            <td style={styles.tdStyle}>Set theme, persists + dispatches event</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>toggleTheme()</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>() =&gt; void</code></td>
            <td style={styles.tdStyle}>Swap dark &lt;→ light</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>lang</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>string</code></td>
            <td style={styles.tdStyle}>Current language code (e.g. &quot;en-US&quot;)</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>setLang()</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>(code) =&gt; void</code></td>
            <td style={styles.tdStyle}>Set language, persists + dispatches event</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>asOrg</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>string | null</code></td>
            <td style={styles.tdStyle}>Active organization ID (null = global)</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>setAsOrg()</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>(id) =&gt; void</code></td>
            <td style={styles.tdStyle}>Switch organization</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>openDashboard()</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>() =&gt; void</code></td>
            <td style={styles.tdStyle}>Open dashboard modal</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>closeDashboard()</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>() =&gt; void</code></td>
            <td style={styles.tdStyle}>Close dashboard modal (also via ESC)</td>
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
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Throws:</strong>{' '}
        <code style={styles.codeStyle}>useLogto()</code> throws if used outside{' '}
        <code style={styles.codeStyle}>LogtoProvider</code>. Unlike the other hooks, it has
        no silent fallback.
      </div>
    </SectionWrap>
  );
}

function PreferenceHooksSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Preference hooks">
      <p style={styles.textStyle}>
        Three focused hooks for theme, language, and organization state. Available
        via <code style={styles.codeStyle}>useLogto()</code> or directly from{' '}
        <code style={styles.codeStyle}>PreferencesProvider</code> (created automatically
        by <code style={styles.codeStyle}>LogtoProvider</code>).
      </p>

      <p style={{ ...styles.textStyle, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem' }}>
        useThemeMode()
      </p>
      <table style={styles.tableStyle}>
        <thead>
          <tr>
            <th style={styles.thStyle}>Field</th>
            <th style={styles.thStyle}>Type</th>
            <th style={styles.thStyle}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tdPropStyle}>theme</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>&apos;dark&apos; | &apos;light&apos;</code></td>
            <td style={styles.tdStyle}>Current mode</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>themeSpec</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>ThemeSpec</code></td>
            <td style={styles.tdStyle}>Full theme: colors, typography, radii, shadows, component styles</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>setTheme()</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>(mode) =&gt; void</code></td>
            <td style={styles.tdStyle}>Persist + dispatch</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>toggleTheme()</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>() =&gt; void</code></td>
            <td style={styles.tdStyle}>Swap dark &lt;→ light</td>
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

      <p style={{ ...styles.textStyle, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginTop: '1rem' }}>
        useLangMode()
      </p>
      <table style={styles.tableStyle}>
        <thead>
          <tr>
            <th style={styles.thStyle}>Field</th>
            <th style={styles.thStyle}>Type</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tdPropStyle}>lang</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>string</code></td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>setLang()</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>(code: string) =&gt; void</code></td>
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

      <p style={{ ...styles.textStyle, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginTop: '1rem' }}>
        useOrgMode()
      </p>
      <table style={styles.tableStyle}>
        <thead>
          <tr>
            <th style={styles.thStyle}>Field</th>
            <th style={styles.thStyle}>Type</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tdPropStyle}>asOrg</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>string | null</code></td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>setAsOrg()</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>(orgId: string | null) =&gt; void</code></td>
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
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Outside provider:</strong>{' '}
        All three hooks return no-op <code style={styles.codeStyle}>set</code> functions and
        auto-detected or default values when used outside{' '}
        <code style={styles.codeStyle}>PreferencesProvider</code>. No errors — silent fallback.
        Each hook reads from <code style={styles.codeStyle}>sessionStorage</code> first,
        then falls back to provider state or defaults.
      </div>
    </SectionWrap>
  );
}

function UserDataSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="useUserDataContext()">
      <p style={styles.textStyle}>
        Returns cached user data from <code style={styles.codeStyle}>UserDataProvider</code>.
        The cache is backed by <code style={styles.codeStyle}>sessionStorage</code> under
        the key <code style={styles.codeSmStyle}>user-data</code>.
      </p>
      <CodeBlock title="Usage" code={`'use client';
import { useUserDataContext } from './logto-kit';

function UserAvatar() {
  const userData = useUserDataContext();
  if (!userData) return null;

  return <img src={userData.avatar} alt={userData.name} />;
}`} />
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Returns:</strong>{' '}
        <code style={styles.codeStyle}>UserData | null</code>. Returns{' '}
        <code style={styles.codeStyle}>null</code> when used outside{' '}
        <code style={styles.codeStyle}>UserDataProvider</code> or during SSR before hydration.
      </div>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Caching behavior:</strong>{' '}
        On mount, if <code style={styles.codeStyle}>sessionStorage</code> has cached data,
        it is used immediately to avoid a flash of empty/old UI. The provider
        updates the cache when the server-provided <code style={styles.codeStyle}>userData</code> prop
        differs from the cached version (deep comparison via{' '}
        <code style={styles.codeStyle}>JSON.stringify</code>).
      </div>
    </SectionWrap>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page 3: AuthWatcher + Cross-Tab Sync
// ═══════════════════════════════════════════════════════════════════════════════

function AuthWatcherSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="AuthWatcher">
      <p style={styles.textStyle}>
        A zero-UI component that keeps auth state fresh by calling{' '}
        <code style={styles.codeStyle}>router.refresh()</code> on three triggers.
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
      <table style={styles.tableStyle}>
        <thead>
          <tr>
            <th style={styles.thStyle}>Trigger</th>
            <th style={styles.thStyle}>Catches</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tdPropStyle}>visibilitychange</td>
            <td style={styles.tdStyle}>User returns to tab — account deleted elsewhere, session revoked, role changed</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>online</td>
            <td style={styles.tdStyle}>Network reconnect — session expired while offline (sleep, travel)</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>setInterval</td>
            <td style={styles.tdStyle}>Long-lived sessions — admin deletes account while user idle on page</td>
          </tr>
        </tbody>
      </table>
      <p style={styles.textStyle}>
        <code style={styles.codeStyle}>router.refresh()</code> re-runs all Server Components
        on the page without a full page reload. Client state (form inputs, scroll
        position, modals) is preserved.
      </p>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Debounce:</strong>{' '}
        Set <code style={styles.codeStyle}>debounceMs</code> to control the minimum gap between
        refreshes. Prevents floods when multiple triggers fire simultaneously
        (e.g., tab focus + online at the same time).
      </div>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Disable interval:</strong>{' '}
        Set <code style={styles.codeStyle}>refreshIntervalMs=0</code> to disable periodic
        polling. Only visibility + online triggers remain active.
      </div>
    </SectionWrap>
  );
}

function CrossTabSyncSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Cross-tab sync">
      <p style={styles.textStyle}>
        Preferences (theme, language, org) sync across browser tabs via{' '}
        <code style={styles.codeStyle}>sessionStorage</code> and a custom DOM event.
      </p>
      <CodeBlock title="Storage keys + events" code={`// Storage keys written by setTheme(), setLang(), setAsOrg():
sessionStorage.setItem('theme-mode', 'dark');
sessionStorage.setItem('lang-mode', 'en-US');
sessionStorage.setItem('org-mode', 'org_abc123');

// Theme changes dispatch 'theme-changed':
window.dispatchEvent(new Event('theme-changed'));

// Language and org changes dispatch 'preferences-changed':
window.dispatchEvent(new Event('preferences-changed'));

// Listen for either event to re-read from storage:
window.addEventListener('theme-changed', () => {
  const theme = sessionStorage.getItem('theme-mode');
});
window.addEventListener('preferences-changed', () => {
  const lang  = sessionStorage.getItem('lang-mode');
  const org   = sessionStorage.getItem('org-mode');
});`} />
      <table style={styles.tableStyle}>
        <thead>
          <tr>
            <th style={styles.thStyle}>Storage key</th>
            <th style={styles.thStyle}>Set by</th>
            <th style={styles.thStyle}>Read by</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tdPropStyle}>theme-mode</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>setTheme()</code></td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>useThemeMode()</code>, external consumers</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>lang-mode</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>setLang()</code></td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>useLangMode()</code>, external consumers</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>org-mode</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>setAsOrg()</code></td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>useOrgMode()</code>, external consumers</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>user-data</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>UserDataProvider</code></td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>useUserDataContext()</code></td>
          </tr>
        </tbody>
      </table>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Why sessionStorage:</strong>{' '}
        Persists across page navigations within the same tab but clears when
        the tab closes. This avoids stale data on new sessions while keeping
        the current session consistent.
      </div>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Persistence:</strong>{' '}
        If <code style={styles.codeStyle}>onUpdateCustomData</code> is provided to{' '}
        <code style={styles.codeStyle}>LogtoProvider</code>, preference changes are also
        persisted to Logto&apos;s Management API via the custom data endpoint.
        This survives session boundaries.
      </div>
    </SectionWrap>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export default function ProvidersDoc() {
  const styles = useDocStyles();
  return (
    <SectionContainer>
      {/* Page 1: Provider hierarchy + Hydration flow (two-column) */}
      <Section id={1}>
        <div style={{ ...styles.twoColLayoutStyle, height: '100%', padding: '16px' }}>
          <div style={styles.colLeftStyle}>
            <ProviderTreeSection />
          </div>
          <div style={styles.colLeftStyle}>
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
        <div style={{ ...styles.twoColLayoutStyle, height: '100%', padding: '16px' }}>
          <div style={styles.colLeftStyle}>
            <AuthWatcherSection />
          </div>
          <div style={styles.colLeftStyle}>
            <CrossTabSyncSection />
          </div>
        </div>
      </Section>
    </SectionContainer>
  );
}
