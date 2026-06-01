'use client';

import CodeBlock from '../../components/SyntaxBlock';
import { useDocStyles } from '../../components/useDocStyles';
import { SectionWrap } from '../../components/SectionComponents';

export default function OrganizationsSection() {
  const styles = useDocStyles();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <SectionWrap label="Organizations - Props & Context Switches">
        <p style={styles.textStyle}>
          The <code style={styles.codeStyle}>OrganizationsTab</code> component manages organization-level user context switches, role verification, and permission audits.
        </p>

        <table style={styles.tableStyle}>
          <thead>
            <tr>
              <th style={{ ...styles.thStyle, width: '25%' }}>Prop</th>
              <th style={{ ...styles.thStyle, width: '25%' }}>Type</th>
              <th style={{ ...styles.thStyle, width: '50%' }}>Purpose</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.tdPropStyle}>userData</td>
              <td style={styles.tdTypeStyle}>UserData</td>
              <td style={styles.tdStyle}>
                The complete user profile object containing identities, memberships, and custom preferences.
              </td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>currentOrgId</td>
              <td style={styles.tdTypeStyle}>string?</td>
              <td style={styles.tdStyle}>
                The server-resolved active organization ID retrieved from custom data preferences.
              </td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>mode</td>
              <td style={styles.tdTypeStyle}>&apos;dark&apos; | &apos;light&apos;</td>
              <td style={styles.tdStyle}>
                The active visual theme mode used to render the tab elements.
              </td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>colors</td>
              <td style={styles.tdTypeStyle}>ThemeColors</td>
              <td style={styles.tdStyle}>
                The active theme color token definitions containing hexadecimal color strings.
              </td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>t</td>
              <td style={styles.tdTypeStyle}>Translations</td>
              <td style={styles.tdStyle}>
                Static key-value translations mapped to the active language locale.
              </td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>mobmode</td>
              <td style={styles.tdTypeStyle}>number?</td>
              <td style={styles.tdStyle}>
                Optional flag where 1 signals mobile screen dimensions to reduce visual spacing.
              </td>
            </tr>
          </tbody>
        </table>

        <h4 style={{ ...styles.textStyle, fontWeight: 600, marginTop: '16px', marginBottom: '8px' }}>
          Organization-Level Context Swapping
        </h4>
        <p style={styles.textStyle}>
          When a user selects an organization, the application executes a stateful context transition that synchronizes client memory with server-side persistence:
        </p>
        <ul style={{ ...styles.textStyle, paddingLeft: '20px', listStyleType: 'disc', marginBottom: '0.75rem' }}>
          <li style={{ marginBottom: '6px' }}>
            <strong>Server Validation:</strong> The client triggers the server action <code style={styles.codeSmStyle}>setActiveOrg(orgId)</code>. This action calls <code style={styles.codeSmStyle}>getLogtoContext(..., &#123; fetchUserInfo: true &#125;)</code>, which fetches the live user memberships from Logto&apos;s OIDC UserInfo endpoint. This direct fetch bypasses cached session tokens to prevent stale memberships if the user was recently added to an organization.
          </li>
          <li style={{ marginBottom: '6px' }}>
            <strong>Database Persistence:</strong> If the membership is valid, <code style={styles.codeSmStyle}>setActiveOrg</code> writes the selection to the user&apos;s custom data profile in Logto under the key <code style={styles.codeSmStyle}>Preferences.asOrg</code>. If the user selects personal mode (reverts to global context), the action writes <code style={styles.codeSmStyle}>asOrg: null</code>.
          </li>
          <li style={{ marginBottom: '6px' }}>
            <strong>Client Memory and Session Storage:</strong> Upon successful validation, the client-side hook <code style={styles.codeSmStyle}>useOrgMode()</code> writes the active organization ID to <code style={styles.codeSmStyle}>sessionStorage</code> (key: <code style={styles.codeSmStyle}>&apos;org-mode&apos;</code>) and updates the local React state.
          </li>
          <li style={{ marginBottom: '6px' }}>
            <strong>RSC Reload:</strong> A call to <code style={styles.codeSmStyle}>router.refresh()</code> forces the React Server Components to reload. The server reads <code style={styles.codeSmStyle}>customData.Preferences.asOrg</code> during rendering to resolve organization contexts, maintaining consistency across browser sessions.
          </li>
        </ul>

        <CodeBlock title="useOrgMode Context State Hook" code={`// Returns:
//   asOrg: string | null
//   setAsOrg: (orgId: string | null) => void

const { asOrg, setAsOrg } = useOrgMode();
setAsOrg('org-123'); // persists to sessionStorage and Logto API via onUpdateCustomData
setAsOrg(null);      // global mode ("be yourself")`} />

        <CodeBlock title="Organization Transition Flow" code={`// 1. Execute server action to validate membership and update custom_data profile
const isValid = await setActiveOrg(orgId);
if (!isValid) {
  setErrorMsg('You are not a member of this organization.');
  return;
}

// 2. Propagate state change to sessionStorage and PreferencesProvider React context
startTransition(() => {
  setAsOrg(orgId);
  // 3. Trigger RSC reload to fetch fresh dashboard data under the updated org context
  router.refresh();
});`} />

        <div style={styles.noteStyle}>
          <strong style={styles.strongNoteStyle}>setActiveOrg logic:</strong>{' '}
          Imported from <code style={styles.codeSmStyle}>custom-logic/set-active-org</code>. This function runs on the server. It verifies membership via OIDC UserInfo fetch before writing preferences to Logto custom data profiles.
        </div>
      </SectionWrap>

      <SectionWrap label="OrgSwitcher Dropdown - Technical Breakdown">
        <p style={styles.textStyle}>
          The <code style={styles.codeStyle}>OrgSwitcher</code> component renders a dynamic, self-configuring selector that provides organization switching capability.
        </p>

        <table style={styles.tableStyle}>
          <thead>
            <tr>
              <th style={{ ...styles.thStyle, width: '25%' }}>Prop</th>
              <th style={{ ...styles.thStyle, width: '25%' }}>Type</th>
              <th style={{ ...styles.thStyle, width: '50%' }}>Purpose</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.tdPropStyle}>organizations</td>
              <td style={styles.tdTypeStyle}>OrganizationData[]</td>
              <td style={styles.tdStyle}>
                Collection of user-associated organizations resolved on the server from the OIDC payload.
              </td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>currentOrgId</td>
              <td style={styles.tdTypeStyle}>string?</td>
              <td style={styles.tdStyle}>
                The server-resolved active organization ID.
              </td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>mode</td>
              <td style={styles.tdTypeStyle}>&apos;dark&apos; | &apos;light&apos;</td>
              <td style={styles.tdStyle}>
                The active layout color theme.
              </td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>colors</td>
              <td style={styles.tdTypeStyle}>ThemeColors</td>
              <td style={styles.tdStyle}>
                The visual style token definitions.
              </td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>t</td>
              <td style={styles.tdTypeStyle}>Translations?</td>
              <td style={styles.tdStyle}>
                Static key-value translations mapped to the active language locale.
              </td>
            </tr>
          </tbody>
        </table>

        <h4 style={{ ...styles.textStyle, fontWeight: 600, marginTop: '16px', marginBottom: '8px' }}>
          Switcher Behaviors and Visibility Rules
        </h4>
        <ul style={{ ...styles.textStyle, paddingLeft: '20px', listStyleType: 'disc', marginBottom: '0.75rem' }}>
          <li style={{ marginBottom: '6px' }}>
            <strong>Auto-fetching and Server Resolution:</strong> The parent server component retrieves the list of user organizations from the OIDC userinfo payload (using <code style={styles.codeSmStyle}>userInfo.organization_data</code> if populated, falling back to <code style={styles.codeSmStyle}>userInfo.organizations</code> strings) and passes the array directly to the switcher.
          </li>
          <li style={{ marginBottom: '6px' }}>
            <strong>Single-Organization Auto-Select:</strong> If the user is a member of exactly one organization, and no active organization has been selected yet (both client-side <code style={styles.codeSmStyle}>asOrg</code> and server-side <code style={styles.codeSmStyle}>currentOrgId</code> are empty), the switcher automatically triggers a transition to that sole organization on mount. This behavior avoids requiring the user to make a redundant manual selection.
          </li>
          <li style={{ marginBottom: '6px' }}>
            <strong>Visibility Thresholds:</strong> The dropdown renders <code style={styles.codeSmStyle}>null</code> (hiding itself) in two scenarios: (1) if the organization list is completely empty, or (2) if there is exactly one organization and the auto-select transition has not completed yet. This minimizes unnecessary configuration elements in the layout.
          </li>
          <li style={{ marginBottom: '6px' }}>
            <strong>Fallback Options:</strong> The first element of the dropdown is a &quot;Be yourself (global)&quot; fallback (value: <code style={styles.codeSmStyle}>&quot;&quot;</code>). Selecting this option clears the organization context by updating state to <code style={styles.codeSmStyle}>null</code>, reverting the application to global user scope.
          </li>
        </ul>

        <CodeBlock title="Single-Organization Auto-Select Effect" code={`// Automatic context transition when only one organization exists
useEffect(() => {
  if (organizations.length === 1 && !asOrg && !currentOrgId && !isSwitchingRef.current) {
    isSwitchingRef.current = true;
    handleChange(organizations[0].id).finally(() => { 
      isSwitchingRef.current = false; 
    });
  }
}, [organizations, asOrg, currentOrgId]);`} />
      </SectionWrap>

      <SectionWrap label="Role Mappings, Scope Audits & Permissions Block">
        <p style={styles.textStyle}>
          The Organizations Tab divides user context display into distinct roles and permissions columns, backed by parallel server action loaders and M2M resolution APIs.
        </p>

        <h4 style={{ ...styles.textStyle, fontWeight: 600, marginTop: '16px', marginBottom: '8px' }}>
          1. Security-First Role Exposure
        </h4>
        <p style={styles.textStyle}>
          Organization roles are filtered dynamically on the client. The component only displays roles matching the active organization:
          <br />
          <code style={styles.codeSmStyle}>const organizationRoles = activeOrgId ? (userData.organizationRoles || []).filter(role =&gt; role.organizationId === activeOrgId) : [];</code>
          <br />
          If no organization is selected (global personal mode), organization roles are hidden from view. This prevents cross-tenant metadata exposure.
        </p>

        <h4 style={{ ...styles.textStyle, fontWeight: 600, marginTop: '16px', marginBottom: '8px' }}>
          2. Batch Role Resolution via Machine-to-Machine API
        </h4>
        <p style={styles.textStyle}>
          Standard OIDC claims only return plain role string arrays formatted as <code style={styles.codeStyle}>org_id:role_name</code>. They lack role UUIDs and description strings. The tab resolves these in a multi-tiered sequence:
        </p>
        <ol style={{ ...styles.textStyle, paddingLeft: '20px', listStyleType: 'decimal', marginBottom: '0.75rem' }}>
          <li style={{ marginBottom: '8px' }}>
            <strong>Batch Resolution:</strong> Upon mounting or context transition, the client runs <code style={styles.codeSmStyle}>loadOrganizationUserRoles(orgId)</code>. This queries the server action, which utilizes a safe machine-to-machine (M2M) Management API token to request <code style={styles.codeSmStyle}>GET /api/organizations/{"{orgId}"}/users/{"{userId}"}/roles</code>. The action retrieves the actual role objects, including UUIDs and descriptions, which are mapped by name to the UI cards.
          </li>
          <li style={{ marginBottom: '8px' }}>
            <strong>Lazy Hover Fetches:</strong> For individual roles rendered on other screens, the <code style={styles.codeSmStyle}>RoleCard</code> component executes <code style={styles.codeSmStyle}>getRoleDetails(roleId)</code> on demand when the user hovers over the Info icon. Results are written to an in-memory cache shared across card instances to optimize hover responsiveness.
          </li>
        </ol>

        <h4 style={{ ...styles.textStyle, fontWeight: 600, marginTop: '16px', marginBottom: '8px' }}>
          3. Live Permission Fetches & Direct Token Audits
        </h4>
        <p style={styles.textStyle}>
          The <code style={styles.codeStyle}>PermissionsBlock</code> component displays the current organization-level permissions. It implements the following logic:
        </p>
        <ul style={{ ...styles.textStyle, paddingLeft: '20px', listStyleType: 'disc', marginBottom: '0.75rem' }}>
          <li style={{ marginBottom: '6px' }}>
            <strong>Direct /oidc/token Audits:</strong> Rather than relying on the Next.js SDK&apos;s cookie-persisted <code style={styles.codeSmStyle}>accessTokenMap</code>, the server action <code style={styles.codeSmStyle}>loadOrganizationPermissions(orgId)</code> calls Logto&apos;s <code style={styles.codeSmStyle}>/oidc/token</code> endpoint using a direct client-credentials <code style={styles.codeSmStyle}>refresh_token</code> grant request with the target <code style={styles.codeSmStyle}>organization_id</code>. This guarantees that returned permission scopes are live and fresh, completely avoiding cached values and stale session data.
          </li>
          <li style={{ marginBottom: '6px' }}>
            <strong>Parallel Scope Description Fetches:</strong> To display human-readable labels and explanations, the block runs <code style={styles.codeSmStyle}>loadOrgPermissionDescriptions(orgId)</code>. This queries the M2M action <code style={styles.codeSmStyle}>getOrgPermissionsWithDescriptions</code>, which fetches the user&apos;s roles and concurrently calls <code style={styles.codeSmStyle}>GET /api/organization-roles/{"{roleId}"}/scopes</code> for each role. The results are merged into detailed permission mappings on the client.
          </li>
          <li style={{ marginBottom: '6px' }}>
            <strong>Layout Bounds Tooltips:</strong> Tooltips are rendered via React Portal (<code style={styles.codeSmStyle}>createPortal</code> to <code style={styles.codeSmStyle}>document.body</code>) and styled with <code style={styles.codeSmStyle}>position: fixed</code>. Tooltip placement is calculated dynamically using <code style={styles.codeSmStyle}>getBoundingClientRect()</code> of the Info icon. This ensures tooltips are visible and never clipped by parent containers utilizing <code style={styles.codeSmStyle}>overflow: hidden</code>.
          </li>
        </ul>

        <CodeBlock title="RoleCard Lazy-Fetch & Shareable Cache" code={`// Module-scoped in-memory cache to prevent duplicate backend requests
const descriptionCache = new Map<string, string | null>();

const fetchDescription = async () => {
  if (!roleId) return;
  if (description !== undefined) return; // pre-filled from batch API

  const cached = descriptionCache.get(roleId);
  if (cached !== undefined) return;

  const result = await getRoleDetails(roleId);
  if (result.ok) {
    const desc = result.data.description || null;
    descriptionCache.set(roleId, desc);
    setResolvedDescription(desc);
  }
};`} />

        <CodeBlock title="Direct Refresh Token Grant for Fresh Scopes" code={`// Direct HTTP call bypasses the SDK's cookie token cache
const body = new URLSearchParams({
  grant_type: 'refresh_token',
  client_id: config.appId,
  refresh_token: refreshToken,
  organization_id: orgId,
});

const res = await fetch(tokenEndpoint, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    Authorization: \`Basic \${Buffer.from(\`\${config.appId}:\${config.appSecret}\`).toString('base64')}\`,
  },
  body: body.toString(),
});`} />
      </SectionWrap>
    </div>
  );
}
