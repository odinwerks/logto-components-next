'use client';

import CodeBlock from '../utils/CodeBlock';
import { SectionContainer, Section } from '../utils/Section';
import { useDocStyles } from '../utils/useDocStyles';
import { SectionHeader, SectionWrap } from '../utils/SectionComponents';
import { Protected } from '../../logto-kit/custom-logic';
import PresidentControlPanel from '../logic/PresidentControlPanel';

// ═══════════════════════════════════════════════════════════════════════════════
// Page 1: Overview + Protected Component
// ═══════════════════════════════════════════════════════════════════════════════

function RbacOverviewSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="RBAC Overview">
      <p style={styles.textStyle}>
        Permission-Based Access Control (PBAC) is implemented through Logto's organization permission system.
        Permissions are granted based on organization roles assigned to users within an organization.
      </p>
      <CodeBlock title="RBAC Flow" code={`// 1. User selects organization (stored in customData.Preferences.asOrg)
customData.Preferences.asOrg = "government"

// 2. loadOrganizationPermissions(orgId) fetches perms from Logto
// 3. Protected component checks permissions client-side before rendering`} />
      <table style={styles.tableStyle}>
        <thead>
          <tr>
            <th style={styles.thStyle}>Component</th>
            <th style={styles.thStyle}>Purpose</th>
            <th style={styles.thStyle}>Scope</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tdPropStyle}>{`<Protected />`}</td>
            <td style={styles.tdStyle}>Conditional UI rendering</td>
            <td style={styles.tdStyle}>Client-side</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>POST /api/protected</td>
            <td style={styles.tdStyle}>Protected server actions</td>
            <td style={styles.tdStyle}>Server-side</td>
          </tr>
        </tbody>
      </table>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Demo:</strong>{' '}
        The app includes a President Control Panel that only appears for users with <code style={styles.codeSmStyle}>kidnap:kids</code> permission in organization <code style={styles.codeSmStyle}>government</code> (org id: <code style={styles.codeSmStyle}>5b6sw6p5uzti</code>).
        Try switching organizations to see permission-based access control in action!
      </div>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Organization Context:</strong>{' '}
        All RBAC checks require an active organization selection. Use the OrgSwitcher or dashboard to select an organization.
        When "Be yourself" is selected, organization permissions are cleared and org-gated content is hidden.
      </div>
    </SectionWrap>
  );
}

function ProtectedComponentSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Protected Component">
      <p style={styles.textStyle}>
        A client-side component that conditionally renders children based on permission checks.
        Fetches organization permissions via <code style={styles.codeSmStyle}>loadOrganizationPermissions(orgId)</code> and checks them against <code style={styles.codeSmStyle}>useOrgMode().asOrg</code>.
      </p>
      <CodeBlock title="Basic Usage" code={`import { Protected } from './logto-kit';

export default function AdminPage() {
  return (
    <Protected perm="admin">
      <div>Admin-only content</div>
    </Protected>
  );
}`} />
      <table style={styles.tableStyle}>
        <thead>
          <tr>
            <th style={styles.thStyle}>Prop</th>
            <th style={styles.thStyle}>Type</th>
            <th style={styles.thStyle}>Default</th>
            <th style={styles.thStyle}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tdPropStyle}>children</td>
            <td style={styles.tdTypeStyle}>React.ReactNode</td>
            <td style={styles.tdStyle}>-</td>
            <td style={styles.tdStyle}>Content to render if access granted</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>perm</td>
            <td style={styles.tdTypeStyle}>string | string[]</td>
            <td style={styles.tdStyle}>-</td>
            <td style={styles.tdStyle}>Required permission(s) to check</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>orgId</td>
            <td style={styles.tdTypeStyle}>string | null</td>
            <td style={styles.tdStyle}>undefined</td>
            <td style={styles.tdStyle}>Gated to specific org; uses <code style={styles.codeSmStyle}>asOrg</code> if undefined</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>orgName</td>
            <td style={styles.tdTypeStyle}>string | null</td>
            <td style={styles.tdStyle}>undefined</td>
            <td style={styles.tdStyle}>Look up org by name from userData.organizations</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>requireAll</td>
            <td style={styles.tdTypeStyle}>boolean</td>
            <td style={styles.tdStyle}>true</td>
            <td style={styles.tdStyle}>Require ALL permissions (AND) vs ANY (OR)</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>fallback</td>
            <td style={styles.tdTypeStyle}>ReactNode</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>null</code></td>
            <td style={styles.tdStyle}>Placeholder shown while loading or when access denied</td>
          </tr>
        </tbody>
      </table>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Client-side only:</strong>{' '}
        <code style={styles.codeSmStyle}>{`<Protected />`}</code> is a client component (<code style={styles.codeSmStyle}>'use client'</code>). It uses <code style={styles.codeSmStyle}>useOrgMode()</code> and <code style={styles.codeSmStyle}>useLogto()</code> hooks.
        It fetches permissions via <code style={styles.codeSmStyle}>loadOrganizationPermissions</code> and checks if <code style={styles.codeSmStyle}>asOrg</code> matches the required <code style={styles.codeSmStyle}>orgId</code>.
      </div>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Best Practice — Separate Concerns:</strong>{' '}
        Avoid wrapping protected content inline in your main page files. Instead, create a dedicated component
        file for the protected UI and wrap it with <code style={styles.codeSmStyle}>{`<Protected />`}</code> there.
        This keeps permission logic co-located with the component it guards.
      </div>
      <CodeBlock title="Recommended Pattern" code={`// app/admin/admin-panel.tsx
import { Protected } from '../../logto-kit';
import { AdminDashboard } from './admin-dashboard';

export function AdminPanel() {
  return (
    <Protected 
      perm="read:users"
      fallback={<div className="animate-pulse">Loading...</div>}
    >
      <AdminDashboard />
    </Protected>
  );
}

// app/page.tsx
import { AdminPanel } from './admin/admin-panel';

<AdminPanel />`} />
    </SectionWrap>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page 2: Protected Actions API
// ═══════════════════════════════════════════════════════════════════════════════

function ProtectedApiSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Protected Actions API">
      <p style={styles.textStyle}>
        Server-side API endpoint for executing permission-gated actions from the client.
        Validates tokens via OIDC introspection, checks organization membership, and verifies permissions before executing the action handler.
      </p>
      <CodeBlock title="Endpoint" code={`POST /api/protected`} />
      <CodeBlock title="Request Format" code={`const response = await fetch('/api/protected', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    token: accessToken,      // User's access token (from useLogto().accessToken)
    id: userId,             // User ID (must match token.sub)
    action: 'action-name',  // Registered action name
    payload: { /* optional data */ }
  })
});`} />
      <table style={styles.tableStyle}>
        <thead>
          <tr>
            <th style={styles.thStyle}>Field</th>
            <th style={styles.thStyle}>Type</th>
            <th style={styles.thStyle}>Required</th>
            <th style={styles.thStyle}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tdPropStyle}>token</td>
            <td style={styles.tdTypeStyle}>string</td>
            <td style={styles.tdStyle}>Yes</td>
            <td style={styles.tdStyle}>Valid JWT access token</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>id</td>
            <td style={styles.tdTypeStyle}>string</td>
            <td style={styles.tdStyle}>Yes</td>
            <td style={styles.tdStyle}>User ID (validated against token.sub)</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>action</td>
            <td style={styles.tdTypeStyle}>string</td>
            <td style={styles.tdStyle}>Yes</td>
            <td style={styles.tdStyle}>Name of registered action</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>payload</td>
            <td style={styles.tdTypeStyle}>unknown</td>
            <td style={styles.tdStyle}>No</td>
            <td style={styles.tdStyle}>Data passed to action handler (defaults to <code style={styles.codeSmStyle}>{}</code> if omitted)</td>
          </tr>
        </tbody>
      </table>
    </SectionWrap>
  );
}

function ApiResponseSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="API Response & Errors">
      <CodeBlock title="Success Response" code={`{
  "ok": true,
  "data": /* handler return value */
}`} />
      <CodeBlock title="Error Response" code={`{
  "ok": false,
  "error": "ERROR_CODE",
  "message": "Human-readable message"
}`} />
      <table style={styles.tableStyle}>
        <thead>
          <tr>
            <th style={styles.thStyle}>Error Code</th>
            <th style={styles.thStyle}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tdPropStyle}>MISSING_FIELDS</td>
            <td style={styles.tdStyle}>Required fields (token, id, action) missing</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>TOKEN_INVALID</td>
            <td style={styles.tdStyle}>Token inactive, expired, or userId mismatch</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>INTROSPECTION_ERROR</td>
            <td style={styles.tdStyle}>Failed to validate token via OIDC introspection</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>USER_DATA_ERROR</td>
            <td style={styles.tdStyle}>Failed to fetch user RBAC data</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>NO_ORG_SELECTED</td>
            <td style={styles.tdStyle}>User has no active organization selected</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>ORG_NOT_MEMBER</td>
            <td style={styles.tdStyle}>User not member of selected organization</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>ACTION_NOT_FOUND</td>
            <td style={styles.tdStyle}>Requested action not registered</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>PERMISSION_DENIED</td>
            <td style={styles.tdStyle}>User lacks required permission in active organization</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>INTERNAL_ERROR</td>
            <td style={styles.tdStyle}>Unexpected server error (catch-all)</td>
          </tr>
        </tbody>
      </table>
    </SectionWrap>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page 3: Action Registration + Examples
// ═══════════════════════════════════════════════════════════════════════════════

function ActionRegistrationSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Action Registration">
      <p style={styles.textStyle}>
        Actions are registered in <code style={styles.codeStyle}>app/logto-kit/custom-actions/index.ts</code>{' '}
        as async functions that return <code style={styles.codeStyle}>{`{ requiredPerm, handler }`}</code>.
        Each action has a unique name, required permission(s), and a handler function.
      </p>
      <CodeBlock title="Registration Example" code={`// app/logto-kit/custom-actions/my-actions/do-something.ts
'use server';

export async function getDoSomething() {
  return {
    requiredPerm: 'do:something',
    handler: async ({ userId, orgId, payload }: { userId: string; orgId: string; payload: unknown }) => {
      // Business logic here
      return { success: true };
    },
  };
}

// app/logto-kit/custom-actions/index.ts
import { getDoSomething } from './my-actions/do-something';

const actions: ActionRegistry = {
  'do-something': (await getDoSomething()),
};

export async function getAction(actionName: string) {
  return actions[actionName];
}`} />
      <table style={styles.tableStyle}>
        <thead>
          <tr>
            <th style={styles.thStyle}>Handler Parameter</th>
            <th style={styles.thStyle}>Type</th>
            <th style={styles.thStyle}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tdPropStyle}>userId</td>
            <td style={styles.tdTypeStyle}>string</td>
            <td style={styles.tdStyle}>Authenticated user ID</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>orgId</td>
            <td style={styles.tdTypeStyle}>string</td>
            <td style={styles.tdStyle}>Active organization ID</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>payload</td>
            <td style={styles.tdTypeStyle}>unknown</td>
            <td style={styles.tdStyle}>Client-provided data</td>
          </tr>
        </tbody>
      </table>
    </SectionWrap>
  );
}

function ExamplesSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Usage Examples">
      <CodeBlock title="Protected Component Examples" code={`// Single permission
<Protected perm="read-reports">
  <ReportsDashboard />
</Protected>

// Multiple permissions (require all)
<Protected perm={['read-users', 'write-users']}>
  <UserManagement />
</Protected>

// Multiple permissions (require any)
<Protected perm={['read-users', 'read-reports']} requireAll={false}>
  <ReadOnlyDashboard />
</Protected>

// Permission-based access
<Protected perm="manage:users">
  <AdminPanel />
</Protected>

// Organization + Permission combination (President demo)
<Protected orgId="5b6sw6p5uzti" perm="kidnap:kids">
  <PresidentControlPanel />
</Protected>

// Specific organization by name
<Protected orgName="government" perm="steal:taxes">
  <EvilDashboard />
</Protected>`} />
      <CodeBlock title="Protected Actions API Example" code={`// Client-side call (like in PresidentControlPanel)
const result = await fetch('/api/protected', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    token: accessToken,       // from useLogto().accessToken
    id: userData.id,          // must match token.sub
    action: 'destroy-economy', // registered action name
    payload: { inflation: 0 }  // current counter value
  })
});

const data = await result.json();
if (data.ok) {
  console.log('Action succeeded:', data.data);
} else {
  console.error('Action failed:', data.error, data.message);
}`} />
    </SectionWrap>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page 4: Permission System + Live Demo (new layout)
// ═══════════════════════════════════════════════════════════════════════════════

function PermissionSystemSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Permission System">
      <p style={styles.textStyle}>
        The system uses Logto's organization permissions for access control.
        Permissions like <code style={styles.codeSmStyle}>kidnap:kids</code> and <code style={styles.codeSmStyle}>steal:taxes</code> are defined in Logto Console
        organization templates and assigned to roles within organizations.
      </p>
      <p style={styles.textStyle}>
        When a user selects an organization (sets <code style={styles.codeSmStyle}>asOrg</code> in <code style={styles.codeSmStyle}>customData.Preferences</code>),
        the <code style={styles.codeSmStyle}>Protected</code> component and <code style={styles.codeSmStyle}>/api/protected</code> endpoint fetch that org's permissions
        via <code style={styles.codeSmStyle}>getOrganizationUserPermissions(orgId)</code> and check them against required permissions.
      </p>
      <div style={{ marginBottom: '12px' }}>
        <div style={{ ...styles.thStyle, paddingBottom: '8px' }}>Available Actions &amp; Required Permissions:</div>
        <div style={styles.noteStyle}>
          <span style={styles.codeSmStyle}>destroy-economy</span> → requires <span style={styles.codeSmStyle}>steal:taxes</span><br />
          <span style={styles.codeSmStyle}>steal-tax-dollars</span> → requires <span style={styles.codeSmStyle}>steal:taxes</span><br />
          <span style={styles.codeSmStyle}>kidnap-children</span> → requires <span style={styles.codeSmStyle}>kidnap:kids</span><br />
          <span style={styles.codeSmStyle}>launch-nuke</span> → requires <span style={styles.codeSmStyle}>launch:nuke</span>
        </div>
      </div>
      <CodeBlock title="Permission Flow" code={`// 1. User selects org in OrgSwitcher or dashboard
//    → setAsOrg(orgId) updates customData.Preferences.asOrg

// 2. Protected component (client-side):
//    → loadOrganizationPermissions(asOrg) fetches perms
//    → checks: perms.includes(requiredPerm) && asOrg === orgId

// 3. POST /api/protected (server-side):
//    → introspectToken(token) validates JWT
//    → fetchUserRbacData(token) gets org + perms
//    → validateOrgMembership(orgs, asOrg) checks membership
//    → getOrganizationUserPermissions(asOrg) fetches perms
//    → checks: requiredPerms.every(p => userPermissions.includes(p))`} />
    </SectionWrap>
  );
}

function LiveRbacDemoSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Live RBAC Demo">
      <p style={styles.textStyle}>
        Test the Protected Actions API with curl. Get your token from the browser console using the dashboard.
      </p>
      <CodeBlock title="Get Token (from dashboard)" code={`// Open the dashboard (click user button → Dashboard)
// Go to Dev tab → click "Reveal" on the Access Token → copy`} />
      <CodeBlock title="Test with Curl" code={`curl -X POST localhost:3000/api/protected \\
  -H "Content-Type: application/json" \\
  -d '{
    "token": "YOUR_ACCESS_TOKEN",
    "id": "YOUR_USER_ID",
    "action": "destroy-economy",
    "payload": { "inflation": 0 }
  }'`} />
      <CodeBlock title="Success Response (200)" code={`{
  "ok": true,
  "data": {
    "success": true,
    "message": "Inflated the economy! Dollar worth 10% less.",
    "data": { "inflation": 10 }
  }
}`} />
      <CodeBlock title="Error Responses" code={`// 401 - Invalid/expired token
{ "ok": false, "error": "TOKEN_INVALID", "message": "..." }

// 403 - Missing permission
{ "ok": false, "error": "PERMISSION_DENIED", "message": "User lacks required permission: steal:taxes" }

// 404 - Action not found
{ "ok": false, "error": "ACTION_NOT_FOUND", "message": "Action \\"foo\\" not found" }

// 403 - No org selected
{ "ok": false, "error": "NO_ORG_SELECTED", "message": "User has no organization selected" }`} />
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>How Protected works with PresidentControlPanel:</strong>{' '}
        <code style={styles.codeSmStyle}>PresidentControlPanel.tsx</code> wraps{' '}
        <code style={styles.codeSmStyle}>PresidentControlPanelClient</code> with{' '}
        <code style={styles.codeSmStyle}>{`<Protected orgId="5b6sw6p5uzti" perm="kidnap:kids">`}</code>.
        This pattern (wrapping in a dedicated file) is recommended — permission logic stays co-located with the guarded component.
        The buttons call <code style={styles.codeSmStyle}>POST /api/protected</code> with registered actions.
      </div>
    </SectionWrap>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export default function ProtectedDoc() {
  const styles = useDocStyles();
  return (
    <SectionContainer>
      {/* Page 1: Overview + Protected Component */}
      <Section id={1}>
        <div style={{ ...styles.twoColLayoutStyle, height: '100%', padding: '16px', boxSizing: 'border-box', width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
          <div style={styles.colLeftStyle}>
            <RbacOverviewSection />
          </div>
          <div style={styles.colLeftStyle}>
            <ProtectedComponentSection />
          </div>
        </div>
      </Section>

      {/* Page 2: Protected Actions API */}
      <Section id={2}>
        <div style={{ ...styles.twoColLayoutStyle, height: '100%', padding: '16px', boxSizing: 'border-box', width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
          <div style={styles.colLeftStyle}>
            <ProtectedApiSection />
          </div>
          <div style={styles.colLeftStyle}>
            <ApiResponseSection />
          </div>
        </div>
      </Section>

      {/* Page 3: Action Registration + Examples */}
      <Section id={3}>
        <div style={{ ...styles.twoColLayoutStyle, height: '100%', padding: '16px', boxSizing: 'border-box', width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
          <div style={styles.colLeftStyle}>
            <ActionRegistrationSection />
          </div>
          <div style={styles.colLeftStyle}>
            <ExamplesSection />
          </div>
        </div>
      </Section>

      {/* Page 4: Permission System + Live Demo (new layout) */}
      <Section id={4}>
        <div style={{ padding: '16px', boxSizing: 'border-box', width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
          {/* Row 1: Permission System (left) + PresidentControlPanel (right) */}
          <div style={{ ...styles.twoColLayoutStyle, marginBottom: '16px' }}>
            <div style={styles.colLeftStyle}>
              <PermissionSystemSection />
            </div>
            <div style={styles.colLeftStyle}>
              <SectionWrap label="President Control Panel (Live Demo)">
                <p style={styles.textStyle}>
                  The panel below demonstrates organization-based access control. Switch to the
                  "government" organization to see it appear.
                </p>
                <PresidentControlPanel />
              </SectionWrap>
            </div>
          </div>
          {/* Row 2: Live RBAC Demo (full width below) */}
          <LiveRbacDemoSection />
        </div>
      </Section>
    </SectionContainer>
  );
}
