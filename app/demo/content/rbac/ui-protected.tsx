'use client';

import { useDocStyles } from '../../components/useDocStyles';
import CodeBlock from '../../components/SyntaxBlock';
import { SectionWrap } from '../../components/SectionComponents';

export default function UiProtectedDoc() {
  const styles = useDocStyles();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <SectionWrap label="Protected Component Overview">
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
      </SectionWrap>

      <SectionWrap label="Component Props">
        <p style={styles.textStyle}>
          The component supports the following configuration props:
        </p>
        <table style={styles.tableStyle}>
          <thead>
            <tr>
              <th style={{ ...styles.thStyle, width: '20%' }}>Prop</th>
              <th style={{ ...styles.thStyle, width: '25%' }}>Type</th>
              <th style={{ ...styles.thStyle, width: '15%' }}>Default</th>
              <th style={{ ...styles.thStyle, width: '40%' }}>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.tdPropStyle}>perm</td>
              <td style={styles.tdTypeStyle}>string | string[]</td>
              <td style={styles.tdStyle}>-</td>
              <td style={styles.tdStyle}>Required permission keys to render children. If omitted, only organization membership is verified.</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>requireAll</td>
              <td style={styles.tdTypeStyle}>boolean</td>
              <td style={styles.tdStyle}>true</td>
              <td style={styles.tdStyle}>When multiple permissions are specified, determines whether all keys must be present (AND) or if any single key is sufficient (OR).</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>orgId</td>
              <td style={styles.tdTypeStyle}>string | null</td>
              <td style={styles.tdStyle}>undefined</td>
              <td style={styles.tdStyle}>Restricts rendering to a specific organization ID. When undefined, checks are performed against the active organization (asOrg). Setting this to "self" targets global/personal scope.</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>orgName</td>
              <td style={styles.tdTypeStyle}>string | null</td>
              <td style={styles.tdStyle}>undefined</td>
              <td style={styles.tdStyle}>Alternative to orgId: matches against the organization name within the user organization list.</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>fallback</td>
              <td style={styles.tdTypeStyle}>ReactNode</td>
              <td style={styles.tdStyle}>null</td>
              <td style={styles.tdStyle}>Optional UI element to render if the user lacks the required organization membership or permissions.</td>
            </tr>
          </tbody>
        </table>
      </SectionWrap>

      <SectionWrap label="Client-Side Permission Resolution">
        <p style={styles.textStyle}>
          The permission resolution process runs client-side inside a single React hook effect:
        </p>
        <p style={styles.textStyle}>
          1. **Hook Context Retrieval**: It retrieves active organization and user information using the <code style={styles.codeStyle}>useOrgMode()</code> and <code style={styles.codeStyle}>useLogto()</code> context providers.
        </p>
        <p style={styles.textStyle}>
          2. **Organization Matching**: If <code style={styles.codeStyle}>orgName</code> is provided, it resolves the corresponding ID from the user organization list. It verifies that the active organization (asOrg) matches the target organization.
        </p>
        <p style={styles.textStyle}>
          3. **Permission Fetching**: It fetches active organization permission keys via a client-side effect. For organization scopes, it uses <code style={styles.codeStyle}>loadOrganizationPermissions(orgId)</code>. For personal scopes (orgId="self"), it uses <code style={styles.codeStyle}>loadPersonalPermissions()</code>.
        </p>
        <p style={styles.textStyle}>
          4. **Array Searching**: Once retrieved, permission keys are stored in client-side state. The component performs array search checks (using <code style={styles.codeStyle}>includes</code>, <code style={styles.codeStyle}>every</code>, or <code style={styles.codeStyle}>some</code>) to match required permissions against active scopes.
        </p>
        <div style={styles.noteStyle}>
          <strong style={styles.strongNoteStyle}>Strict Fallback Behavior:</strong> If permission loading fails, returns an error, or if there is an organization mismatch, the component fails closed. It defaults to clearing loaded permissions and rendering the fallback UI.
        </div>
      </SectionWrap>
    </div>
  );
}
