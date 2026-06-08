'use client';

import { useDocStyles } from '../../components/useDocStyles';
import CodeBlock from '../../components/SyntaxBlock';
import { useThemeMode } from '../../../logto-kit/components/providers/preferences';
import { slugify } from '../../components/SectionComponents';

export default function UiProtectedDoc() {
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

  const customTdTypeStyle: React.CSSProperties = {
    ...customTdStyle,
    color: isDark ? '#4ec9b0' : '#059669',
    fontFamily: "'IBM Plex Mono', monospace",
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h2 id={slugify("Protected Component Overview")} style={{ ...h2Style, marginTop: 0 }}>
        Protected Component Overview
      </h2>
      <p style={styles.textStyle}>
        The <code style={styles.codeStyle}>{`<Protected />`}</code> component conditionally gates client-side UI subtrees.
        It improves the user experience by hiding UI elements that the user cannot interact with.
      </p>
      <div style={styles.warningBannerStyle}>
        <strong style={styles.warningBannerStrongStyle}>Important:</strong> This component is a client-side convenience for user experience. It is not a security boundary. Client-side checks can be bypassed using browser tools or by modifying JavaScript. All security enforcement must happen server-side within the Protected Actions API.
      </div>
      <CodeBlock
        title="Basic Client-Side Usage"
        code={`import { Protected } from '@/app/logto-kit';

// Check single permission
<Protected perm="admin">
  <AdminPanel />
</Protected>

// Check multiple permissions (all required by default)
<Protected perm={['read:users', 'write:users']}>
  <UserManagement />
</Protected>

// Check multiple permissions with OR condition
<Protected perm={['read:users', 'read:reports']} requireAll={false}>
  <ReportsViewer />
</Protected>

// Constrain to specific organization ID
<Protected orgId="org_123" perm="calc:basic">
  <CalculatorPanel />
</Protected>

// Constrain to specific organization name
<Protected orgName="Mathinators" perm="calc:scientific">
  <AdvancedPanel />
</Protected>

// Custom fallback UI
<Protected perm="admin" fallback={<div>Access Denied</div>}>
  <AdminDashboard />
</Protected>`}
      />

      <h2 id={slugify("Component Props")} style={h2Style}>
        Component Props
      </h2>
      <p style={styles.textStyle}>
        The component supports the following configuration props:
      </p>
      <table style={customTableStyle}>
        <thead>
          <tr>
            <th style={{ ...customThStyle, width: '20%' }}>Prop</th>
            <th style={{ ...customThStyle, width: '25%' }}>Type</th>
            <th style={{ ...customThStyle, width: '15%' }}>Default</th>
            <th style={{ ...customThStyle, width: '40%' }}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={customTdPropStyle}>perm</td>
            <td style={customTdTypeStyle}>string | string[]</td>
            <td style={customTdStyle}>-</td>
            <td style={customTdStyle}>Required permission keys to render children. Bypassed in Self Mode (<code style={styles.codeStyle}>orgId=&quot;self&quot;</code>), but checked alongside roles in Organization Mode. If omitted in organization mode, only organization membership is verified.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>roleId</td>
            <td style={customTdTypeStyle}>string | string[]</td>
            <td style={customTdStyle}>-</td>
            <td style={customTdStyle}>Required role IDs to render children. Used in Self Mode (<code style={styles.codeStyle}>orgId=&quot;self&quot;</code>) as the exclusive gating boundary, and in Organization Mode as an additional check alongside permissions.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>requireAll</td>
            <td style={customTdTypeStyle}>boolean</td>
            <td style={customTdStyle}>true</td>
            <td style={customTdStyle}>When multiple permissions are specified, determines whether all keys must be present (AND) or if any single key is sufficient (OR).</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>orgId</td>
            <td style={customTdTypeStyle}>string | null</td>
            <td style={customTdStyle}>undefined</td>
            <td style={customTdStyle}>Targets the scope of RBAC checks. Set to <code style={styles.codeStyle}>&quot;self&quot;</code> for user-level (personal) RBAC, which loads personal roles and gates strictly on <code style={styles.codeStyle}>roleId</code>, completely bypassing permission checks. Set to an organization ID for organization-scoped RBAC, which strictly matches the target ID against <code style={styles.codeStyle}>asOrg</code> (breaking immediately on mismatch) and checks BOTH roles and permissions. If omitted, no organization checks are performed, and any permission check (<code style={styles.codeStyle}>perm</code>) will fail-closed (default-deny).</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>orgName</td>
            <td style={customTdTypeStyle}>string | null</td>
            <td style={customTdStyle}>undefined</td>
            <td style={customTdStyle}>Alternative to orgId: matches against the organization name within the user organization list.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>fallback</td>
            <td style={customTdTypeStyle}>ReactNode</td>
            <td style={customTdStyle}>null</td>
            <td style={customTdStyle}>Optional UI element to render if the user lacks the required organization membership or permissions.</td>
          </tr>
        </tbody>
      </table>

      <h2 id={slugify("Client-Side Permission Resolution")} style={h2Style}>
        Client-Side Permission Resolution
      </h2>
      <p style={styles.textStyle}>
        The permission resolution process runs client-side inside a single React hook effect, switching between two distinct execution modes:
      </p>
      <p style={styles.textStyle}>
        1. **Self Mode (<code style={styles.codeStyle}>orgId=&quot;self&quot;</code>)**:
        Shifts the component to user RBAC (personal/global scope). In this mode, the component fetches personal roles using <code style={styles.codeStyle}>loadPersonalRoles()</code> and gates strictly on required roles (<code style={styles.codeStyle}>roleId</code>), completely bypassing permission checks.
      </p>
      <p style={styles.textStyle}>
        2. **Organization Mode**:
        Enforces organization-scoped RBAC. The component strictly matches the target <code style={styles.codeStyle}>orgId</code> against the active organization (<code style={styles.codeStyle}>asOrg</code>) from <code style={styles.codeStyle}>useOrgMode()</code>. If there is a mismatch, the evaluation breaks immediately (fail-closed). If they match, it loads organization permissions and roles to check BOTH required roles (<code style={styles.codeStyle}>roleId</code>) and permissions (<code style={styles.codeStyle}>perm</code>).
      </p>
      <p style={styles.textStyle}>
        3. **Hook Context Retrieval**: It retrieves active organization and user information using the <code style={styles.codeStyle}>useOrgMode()</code> and <code style={styles.codeStyle}>useLogto()</code> context providers.
      </p>
      <p style={styles.textStyle}>
        4. **Organization Matching**: If <code style={styles.codeStyle}>orgName</code> is provided, it resolves the corresponding ID from the user organization list. It verifies that the active organization (asOrg) matches the target organization.
      </p>
      <p style={styles.textStyle}>
        5. **Permission Fetching**: It fetches active organization permission keys via a client-side effect. For organization scopes, it uses <code style={styles.codeStyle}>loadOrganizationPermissions(orgId)</code>. For personal scopes (orgId=&quot;self&quot;), it uses <code style={styles.codeStyle}>loadPersonalPermissions()</code>.
      </p>
      <p style={styles.textStyle}>
        6. **Array Searching**: Once retrieved, permission keys are stored in client-side state. The component performs array search checks (using <code style={styles.codeStyle}>includes</code>, <code style={styles.codeStyle}>every</code>, or <code style={styles.codeStyle}>some</code>) to match required permissions against active scopes.
      </p>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Strict Fallback Behavior:</strong> If permission loading fails, returns an error, or if there is an organization mismatch, the component fails closed. It defaults to clearing loaded permissions and rendering the fallback UI.
      </div>
    </div>
  );
}