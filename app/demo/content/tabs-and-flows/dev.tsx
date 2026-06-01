'use client';

import CodeBlock from '../../components/SyntaxBlock';
import { useDocStyles } from '../../components/useDocStyles';
import { SectionWrap } from '../../components/SectionComponents';

export default function DevSection() {
  const styles = useDocStyles();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <SectionWrap label="Dev - props">
        <p style={styles.textStyle}>
          The Dev tab acts as a real-time debugging console and token inspector for developers.
          It accepts standard rendering props while fetching highly sensitive tokens internally via secure server-side actions.
        </p>
        <table style={styles.tableStyle}>
          <thead>
            <tr>
              <th style={styles.thStyle}>Prop</th>
              <th style={styles.thStyle}>Type</th>
              <th style={styles.thStyle}>Purpose</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.tdPathStyle}>userData</td>
              <td style={styles.tdStyle}><code style={styles.codeStyle}>UserData</code></td>
              <td style={styles.tdStyle}>User profile data object representing standard OIDC claims and custom fields</td>
            </tr>
            <tr>
              <td style={styles.tdPathStyle}>mode</td>
              <td style={styles.tdStyle}><code style={styles.codeStyle}>&apos;dark&apos; | &apos;light&apos;</code></td>
              <td style={styles.tdStyle}>Theme rendering mode (dark or light theme)</td>
            </tr>
            <tr>
              <td style={styles.tdPathStyle}>colors</td>
              <td style={styles.tdStyle}><code style={styles.codeStyle}>ThemeColors</code></td>
              <td style={styles.tdStyle}>Object containing defined hex color configurations for the active theme</td>
            </tr>
            <tr>
              <td style={styles.tdPathStyle}>t</td>
              <td style={styles.tdStyle}><code style={styles.codeStyle}>Translations</code></td>
              <td style={styles.tdStyle}>Language translations map loaded from the locale provider</td>
            </tr>
            <tr>
              <td style={styles.tdPathStyle}>mobmode</td>
              <td style={styles.tdStyle}><code style={styles.codeStyle}>number</code></td>
              <td style={styles.tdStyle}>Mobile responsive layout toggle (1 for mobile layout, other values for desktop)</td>
            </tr>
          </tbody>
        </table>
      </SectionWrap>

      <SectionWrap label="Dev - hard gate and security-in-depth">
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
      </SectionWrap>

      <SectionWrap label="Dev - token inspector & lazy loading">
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
      </SectionWrap>

      <SectionWrap label="Dev - raw metadata and OIDC claims definition map">
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
        <table style={styles.tableStyle}>
          <thead>
            <tr>
              <th style={styles.thStyle}>Claim Key</th>
              <th style={styles.thStyle}>OIDC / Logto Definition</th>
              <th style={styles.thStyle}>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.tdPathStyle}>id (sub)</td>
              <td style={styles.tdStyle}><code style={styles.codeStyle}>string</code></td>
              <td style={styles.tdStyle}>Subject identifier. A unique string mapping to the authenticated user inside the Logto tenant.</td>
            </tr>
            <tr>
              <td style={styles.tdPathStyle}>username</td>
              <td style={styles.tdStyle}><code style={styles.codeStyle}>string | undefined</code></td>
              <td style={styles.tdStyle}>Optional unique username identifier for sign-in or identification.</td>
            </tr>
            <tr>
              <td style={styles.tdPathStyle}>name</td>
              <td style={styles.tdStyle}><code style={styles.codeStyle}>string | undefined</code></td>
              <td style={styles.tdStyle}>The display name configured for the user profile.</td>
            </tr>
            <tr>
              <td style={styles.tdPathStyle}>avatar</td>
              <td style={styles.tdStyle}><code style={styles.codeStyle}>string | undefined</code></td>
              <td style={styles.tdStyle}>Absolute URL linking to the user profile image.</td>
            </tr>
            <tr>
              <td style={styles.tdPathStyle}>primaryEmail</td>
              <td style={styles.tdStyle}><code style={styles.codeStyle}>string | undefined</code></td>
              <td style={styles.tdStyle}>Primary email address bound and verified for authentication.</td>
            </tr>
            <tr>
              <td style={styles.tdPathStyle}>primaryPhone</td>
              <td style={styles.tdStyle}><code style={styles.codeStyle}>string | undefined</code></td>
              <td style={styles.tdStyle}>Primary phone number bound and verified for authentication.</td>
            </tr>
            <tr>
              <td style={styles.tdPathStyle}>profile</td>
              <td style={styles.tdStyle}><code style={styles.codeStyle}>UserProfile</code></td>
              <td style={styles.tdStyle}>Object containing supplementary profile details (such as givenName and familyName).</td>
            </tr>
            <tr>
              <td style={styles.tdPathStyle}>customData</td>
              <td style={styles.tdStyle}><code style={styles.codeStyle}>Record&lt;string, unknown&gt;</code></td>
              <td style={styles.tdStyle}>User custom metadata dictionary. Arbitrary key-value pairs stored securely within Logto.</td>
            </tr>
            <tr>
              <td style={styles.tdPathStyle}>customData.Preferences.asOrg</td>
              <td style={styles.tdStyle}><code style={styles.codeStyle}>string | null</code></td>
              <td style={styles.tdStyle}>The active organization identifier context currently selected by the user.</td>
            </tr>
            <tr>
              <td style={styles.tdPathStyle}>identities</td>
              <td style={styles.tdStyle}><code style={styles.codeStyle}>Record&lt;string, Identity&gt;</code></td>
              <td style={styles.tdStyle}>Dictionary of social, enterprise, or external identities connected to this user account.</td>
            </tr>
            <tr>
              <td style={styles.tdPathStyle}>lastSignInAt</td>
              <td style={styles.tdStyle}><code style={styles.codeStyle}>string | number</code></td>
              <td style={styles.tdStyle}>Unix epoch timestamp or ISO string representing the last recorded user login session.</td>
            </tr>
            <tr>
              <td style={styles.tdPathStyle}>createdAt</td>
              <td style={styles.tdStyle}><code style={styles.codeStyle}>string | number</code></td>
              <td style={styles.tdStyle}>Unix epoch timestamp or ISO string representing the user account registration time.</td>
            </tr>
            <tr>
              <td style={styles.tdPathStyle}>updatedAt</td>
              <td style={styles.tdStyle}><code style={styles.codeStyle}>string | number</code></td>
              <td style={styles.tdStyle}>Unix epoch timestamp or ISO string representing the last update to the user profile metadata.</td>
            </tr>
            <tr>
              <td style={styles.tdPathStyle}>organizations</td>
              <td style={styles.tdStyle}><code style={styles.codeStyle}>Array&lt;{`{id, name}`}&gt;</code></td>
              <td style={styles.tdStyle}>List of organization nodes the user is currently associated with.</td>
            </tr>
            <tr>
              <td style={styles.tdPathStyle}>organizationRoles</td>
              <td style={styles.tdStyle}><code style={styles.codeStyle}>Array&lt;{`{id, name, organizationId}`}&gt;</code></td>
              <td style={styles.tdStyle}>Collection of organization roles assigned to the user within their active organizations.</td>
            </tr>
            <tr>
              <td style={styles.tdPathStyle}>organizationPermissions</td>
              <td style={styles.tdStyle}><code style={styles.codeStyle}>string[]</code></td>
              <td style={styles.tdStyle}>The lazy-loaded list of permission scopes active for the user within the selected organization.</td>
            </tr>
            <tr>
              <td style={styles.tdPathStyle}>roles</td>
              <td style={styles.tdStyle}><code style={styles.codeStyle}>UserRole[]</code></td>
              <td style={styles.tdStyle}>Array of global user roles assigned to this account (independent of organization contexts).</td>
            </tr>
          </tbody>
        </table>
      </SectionWrap>

      <SectionWrap label="Dev - cookie and session management">
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
      </SectionWrap>
    </div>
  );
}
