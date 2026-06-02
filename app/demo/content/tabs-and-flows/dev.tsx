'use client';

import CodeBlock from '../../components/SyntaxBlock';
import { useDocStyles } from '../../components/useDocStyles';
import { useThemeMode } from '../../../logto-kit/components/providers/preferences';

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

export default function DevSection() {
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

  const customTableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.8rem',
    marginBottom: '20px',
    marginTop: '12px',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`,
  };

  const customThStyle: React.CSSProperties = {
    textAlign: 'left',
    padding: '10px 12px',
    borderBottom: `2px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#cbd5e1'}`,
    background: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc',
    color: isDark ? 'rgba(255,255,255,0.6)' : '#475569',
    fontWeight: 600,
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };

  const customTdStyle: React.CSSProperties = {
    padding: '10px 12px',
    borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9'}`,
    color: isDark ? 'rgba(255,255,255,0.55)' : '#334155',
    verticalAlign: 'top',
    lineHeight: '1.5',
  };

  const customTdPropStyle: React.CSSProperties = {
    ...customTdStyle,
    color: isDark ? '#9cdcdb' : '#0369a1',
    fontFamily: "'IBM Plex Mono', monospace",
    fontWeight: 600,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h2 id={slugify("Dev - props")} style={h2Style}>Dev - props</h2>
        <p style={styles.textStyle}>
          The Dev tab acts as a real-time debugging console and token inspector for developers.
          It accepts standard rendering props while fetching highly sensitive tokens internally via secure server-side actions.
        </p>
        <table style={customTableStyle}>
          <thead>
            <tr>
              <th style={customThStyle}>Prop</th>
              <th style={customThStyle}>Type</th>
              <th style={customThStyle}>Purpose</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={customTdPropStyle}>userData</td>
              <td style={customTdStyle}><code style={styles.codeStyle}>UserData</code></td>
              <td style={customTdStyle}>User profile data object representing standard OIDC claims and custom fields</td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>mode</td>
              <td style={customTdStyle}><code style={styles.codeStyle}>&apos;dark&apos; | &apos;light&apos;</code></td>
              <td style={customTdStyle}>Theme rendering mode (dark or light theme)</td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>colors</td>
              <td style={customTdStyle}><code style={styles.codeStyle}>ThemeColors</code></td>
              <td style={customTdStyle}>Object containing defined hex color configurations for the active theme</td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>t</td>
              <td style={customTdStyle}><code style={styles.codeStyle}>Translations</code></td>
              <td style={customTdStyle}>Language translations map loaded from the locale provider</td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>mobmode</td>
              <td style={customTdStyle}><code style={styles.codeStyle}>number</code></td>
              <td style={customTdStyle}>Mobile responsive layout toggle (1 for mobile layout, other values for desktop)</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div>
        <h2 id={slugify("Dev - hard gate and security-in-depth")} style={h2Style}>Dev - hard gate and security-in-depth</h2>
        <p style={styles.textStyle}>
          To prevent accidental leakage of sensitive session tokens, permissions, or user metadata in production deployments, the system implements a strict multi-layer defense-in-depth gate.
        </p>
        <div style={styles.noteStyle}>
          <span style={styles.strongNoteStyle}>1. Dynamic Server-Side Route Filtering:</span>
          The routing logic (under <code style={styles.codeSmStyle}>logic/tabs.ts</code>) dynamically evaluates environment configurations. It completely filters the <code style={styles.codeSmStyle}>dev</code> tab out of the <code style={styles.codeSmStyle}>LOAD_TABS</code> collection if <code style={styles.codeSmStyle}>NODE_ENV !== &apos;development&apos;</code>.
        </div>
        <div style={styles.noteStyle}>
          <span style={styles.strongNoteStyle}>2. Component-Level Hard Gate:</span>
          Even if the route configuration is bypassed, the <code style={styles.codeSmStyle}>DevTab</code> component checks the compile-time environmental variable <code style={styles.codeSmStyle}>isDev</code>. If evaluated as false, it blocks execution and displays a fallback interface (using the <code style={styles.codeSmStyle}>ShieldAlert</code> icon) with the message: &quot;Dev tab is disabled in production builds. Set NODE_ENV=development to view debug info.&quot;
        </div>
        <div style={styles.noteStyle}>
          <span style={styles.strongNoteStyle}>3. Server-Action Verification:</span>
          The server-side action <code style={styles.codeSmStyle}>getCurrentAccessToken()</code> contains a strict development-only guard. It refuses to return any active access tokens when executed under production environments.
        </div>
        <div style={styles.noteStyle}>
          <span style={styles.strongNoteStyle}>4. Access Token Exposure Guard (LOGTO_DANGER_EXPOSE_TOKEN):</span>
          Even in development mode, access tokens are not exposed by default. The environment variable <code style={styles.codeSmStyle}>LOGTO_DANGER_EXPOSE_TOKEN</code> must be set explicitly to <code style={styles.codeSmStyle}>true</code> in the environment config to enable token retrieval. If set to false or left undefined, server-side actions will refuse to return the token to the client.
        </div>
      </div>

      <div>
        <h2 id={slugify("Dev - token inspector & lazy loading")} style={h2Style}>Dev - token inspector & lazy loading</h2>
        <p style={styles.textStyle}>
          The access token is fetched dynamically on the client side using a React effect hook that communicates with the server-side action. This keeps the initial dashboard page load lightweight.
        </p>
        <CodeBlock title="Access token lazy-loading" code={`// Lazily fetch the access token server-side via server action
useEffect(() => {
  let cancelled = false;
  getCurrentAccessToken().then(token => {
    if (!cancelled) setAccessToken(token);
  });
  return () => { cancelled = true; };
}, []);`} />
        <p style={styles.textStyle}>
          <strong>Masking and Verification:</strong>
        </p>
        <div style={styles.noteStyle}>
          To protect active session tokens from shoulder-surfing or recording, the <code style={styles.codeSmStyle}>TruncatedToken</code> helper component masks the core content by default. It displays only the first 8 and last 8 characters of the JWT string, separated by a sequence of mask characters. A client-side state toggle allows developers to temporarily unmask and review the raw full access token.
        </div>
      </div>

      <div>
        <h2 id={slugify("Dev - raw metadata and OIDC claims definition map")} style={h2Style}>Dev - raw metadata and OIDC claims definition map</h2>
        <p style={styles.textStyle}>
          The metadata inspector renders an expandable, styled JSON block representing the authenticated user session details (<code style={styles.codeStyle}>enhancedUserData</code>).
        </p>
        <p style={styles.textStyle}>
          <strong>Dynamic Permission Merging:</strong>
        </p>
        <div style={styles.noteStyle}>
          If the user custom preferences contain an active organization ID (<code style={styles.codeSmStyle}>customData.Preferences.asOrg</code>), the component executes a client-side hook to fetch organization-specific permissions. It executes the server-side action <code style={styles.codeSmStyle}>loadOrganizationPermissions(activeOrgId)</code> and merges the resulting scopes array into the <code style={styles.codeSmStyle}>organizationPermissions</code> property before displaying the final JSON object.
        </div>
        
        <p style={styles.textStyle}>
          <strong>JSON Claims Definition Map:</strong>
        </p>
        <table style={customTableStyle}>
          <thead>
            <tr>
              <th style={customThStyle}>Claim Key</th>
              <th style={customThStyle}>OIDC / Logto Definition</th>
              <th style={customThStyle}>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={customTdPropStyle}>id (sub)</td>
              <td style={customTdStyle}><code style={styles.codeStyle}>string</code></td>
              <td style={customTdStyle}>Subject identifier. A unique string mapping to the authenticated user inside the Logto tenant.</td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>username</td>
              <td style={customTdStyle}><code style={styles.codeStyle}>string | undefined</code></td>
              <td style={customTdStyle}>Optional unique username identifier for sign-in or identification.</td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>name</td>
              <td style={customTdStyle}><code style={styles.codeStyle}>string | undefined</code></td>
              <td style={customTdStyle}>The display name configured for the user profile.</td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>avatar</td>
              <td style={customTdStyle}><code style={styles.codeStyle}>string | undefined</code></td>
              <td style={customTdStyle}>Absolute URL linking to the user profile image.</td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>primaryEmail</td>
              <td style={customTdStyle}><code style={styles.codeStyle}>string | undefined</code></td>
              <td style={customTdStyle}>Primary email address bound and verified for authentication.</td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>primaryPhone</td>
              <td style={customTdStyle}><code style={styles.codeStyle}>string | undefined</code></td>
              <td style={customTdStyle}>Primary phone number bound and verified for authentication.</td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>profile</td>
              <td style={customTdStyle}><code style={styles.codeStyle}>UserProfile</code></td>
              <td style={customTdStyle}>Object containing supplementary profile details (such as givenName and familyName).</td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>customData</td>
              <td style={customTdStyle}><code style={styles.codeStyle}>Record&lt;string, unknown&gt;</code></td>
              <td style={customTdStyle}>User custom metadata dictionary. Arbitrary key-value pairs stored securely within Logto.</td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>customData.Preferences.asOrg</td>
              <td style={customTdStyle}><code style={styles.codeStyle}>string | null</code></td>
              <td style={customTdStyle}>The active organization identifier context currently selected by the user.</td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>identities</td>
              <td style={customTdStyle}><code style={styles.codeStyle}>Record&lt;string, Identity&gt;</code></td>
              <td style={customTdStyle}>Dictionary of social, enterprise, or external identities connected to this user account.</td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>lastSignInAt</td>
              <td style={customTdStyle}><code style={styles.codeStyle}>string | number</code></td>
              <td style={customTdStyle}>Unix epoch timestamp or ISO string representing the last recorded user login session.</td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>createdAt</td>
              <td style={customTdStyle}><code style={styles.codeStyle}>string | number</code></td>
              <td style={customTdStyle}>Unix epoch timestamp or ISO string representing the user account registration time.</td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>updatedAt</td>
              <td style={customTdStyle}><code style={styles.codeStyle}>string | number</code></td>
              <td style={customTdStyle}>Unix epoch timestamp or ISO string representing the last update to the user profile metadata.</td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>organizations</td>
              <td style={customTdStyle}><code style={styles.codeStyle}>Array&lt;{`{id, name}`}&gt;</code></td>
              <td style={customTdStyle}>List of organization nodes the user is currently associated with.</td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>organizationRoles</td>
              <td style={customTdStyle}><code style={styles.codeStyle}>Array&lt;{`{id, name, organizationId}`}&gt;</code></td>
              <td style={customTdStyle}>Collection of organization roles assigned to the user within their active organizations.</td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>organizationPermissions</td>
              <td style={customTdStyle}><code style={styles.codeStyle}>string[]</code></td>
              <td style={customTdStyle}>The lazy-loaded list of permission scopes active for the user within the selected organization.</td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>roles</td>
              <td style={customTdStyle}><code style={styles.codeStyle}>UserRole[]</code></td>
              <td style={customTdStyle}>Array of global user roles assigned to this account (independent of organization contexts).</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div>
        <h2 id={slugify("Dev - cookie and session management")} style={h2Style}>Dev - cookie and session management</h2>
        <p style={styles.textStyle}>
          The cookie management section provides interactive controls to test stale cookie recovery and complete session termination. Both client-side triggers perform same-origin authenticated requests.
        </p>
        <CodeBlock title="Cookie and session actions" code={`// Clear cookies (stale cookie recovery) - POST (CSRF-safe)
const handleClearCookies = async () => {
  await fetch('/api/wipe', { method: 'POST', credentials: 'same-origin' });
  window.location.href = '/';
};

// Force invalidate session (signs out from Logto too) - POST (CSRF-safe)
const handleInvalidateSession = async () => {
  await fetch('/api/wipe?force=true', { method: 'POST', credentials: 'same-origin' });
  window.location.href = '/';
};`} />
        
        <p style={styles.textStyle}>
          <strong>Architectural and Security Details:</strong>
        </p>
        <div style={styles.noteStyle}>
          <span style={styles.strongNoteStyle}>1. CSRF Mitigation:</span>
          While the server-side wipe endpoint accepts both GET and POST requests, the client dashboard explicitly initiates actions via HTTP <code style={styles.codeSmStyle}>POST</code> requests using <code style={styles.codeSmStyle}>credentials: &apos;same-origin&apos;</code>. This design pattern defends against CSRF (Cross-Site Request Forgery) attacks by ensuring that the browser includes cookies for credentials verification while delegating same-origin validations to the server origin guard (<code style={styles.codeSmStyle}>checkSameOrigin</code> in <code style={styles.codeSmStyle}>origin-guard.ts</code>).
        </div>
        <div style={styles.noteStyle}>
          <span style={styles.strongNoteStyle}>2. State Synchronization and Navigation:</span>
          Using standard client-side SPA routing (such as <code style={styles.codeSmStyle}>router.push</code> or <code style={styles.codeSmStyle}>router.refresh</code>) is insufficient when session cookies are purged or invalidated. The client-side trigger sets <code style={styles.codeSmStyle}>window.location.href = &apos;/&apos;</code> to force a hard page reload. This completely flushes the client-side JavaScript memory space, clears old layout cache segments, and enforces a fresh round of server-side middleware and authentication checks.
        </div>
      </div>
    </div>
  );
}
