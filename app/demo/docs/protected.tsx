'use client';

import CodeBlock from '../utils/CodeBlock';
import { SectionContainer, Section } from '../utils/Section';
import { useDocStyles } from '../utils/useDocStyles';
import { SectionWrap } from '../utils/SectionComponents';

// ═══════════════════════════════════════════════════════════════════════════════
// Page 1: Overview + Protected Component
// ═══════════════════════════════════════════════════════════════════════════════

function RbacOverviewSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="RBAC Overview">
      <p style={styles.textStyle}>
        Permission-Based Access Control via Logto's organization permission system.
        Permissions are granted based on organization roles assigned to users.
      </p>
      <CodeBlock title="RBAC Flow" code={`// 1. User selects organization (stored in customData.Preferences.asOrg)
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
      <div style={{ ...styles.noteStyle, marginBottom: 0 }}>
        <strong style={styles.strongNoteStyle}>Organization Context:</strong>{' '}
        All RBAC checks require an active org selection. When "Be yourself" is selected,
        org permissions are cleared and org-gated content is hidden.
      </div>
    </SectionWrap>
  );
}

function ProtectedComponentSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Protected Component">
      <p style={styles.textStyle}>
        Conditionally renders children based on org permission checks.
        Fetches permissions via <code style={styles.codeSmStyle}>loadOrganizationPermissions(orgId)</code>.
      </p>
      <CodeBlock title="Usage" code={`import { Protected } from './logto-kit';

// Single permission
<Protected perm="admin">
  <AdminPanel />
</Protected>

// Multiple (require all / require any)
<Protected perm={['read-users', 'write-users']}>...</Protected>
<Protected perm={['read-users', 'read-reports']} requireAll={false}>...</Protected>

// Specific org by ID or name
<Protected orgId="your-org-id" perm="calc:basic">...</Protected>
<Protected orgName="Mathinators" perm="calc:scientific">...</Protected>`} />
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
            <td style={styles.tdPropStyle}>perm</td>
            <td style={styles.tdTypeStyle}>string | string[]</td>
            <td style={styles.tdStyle}>—</td>
            <td style={styles.tdStyle}>Required permission(s)</td>
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
            <td style={styles.tdStyle}>Require ALL (AND) vs ANY (OR)</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>fallback</td>
            <td style={styles.tdTypeStyle}>ReactNode</td>
            <td style={styles.tdStyle}>null</td>
            <td style={styles.tdStyle}>Shown while loading or access denied</td>
          </tr>
        </tbody>
      </table>
      <div style={{ ...styles.noteStyle, marginBottom: 0 }}>
        <strong style={styles.strongNoteStyle}>Client-side only:</strong>{' '}
        Uses <code style={styles.codeSmStyle}>useOrgMode()</code> and <code style={styles.codeSmStyle}>useLogto()</code> hooks — must be inside <code style={styles.codeSmStyle}>LogtoProvider</code>.
      </div>
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
        Server-side endpoint for permission-gated actions. Validates token via OIDC introspection,
        checks org membership, verifies permissions, then runs the handler.
      </p>
      <CodeBlock title="POST /api/protected" code={`const freshToken = await getFreshAccessToken();
const { userData } = useLogto();

const response = await fetch('/api/protected', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    token: freshToken,      // fresh access token
    id: userData.id,        // must match token.sub
    action: 'action-name',  // registered action name
    payload: { /* optional */ }
  })
});`} />
      <table style={styles.tableStyle}>
        <thead>
          <tr>
            <th style={styles.thStyle}>Field</th>
            <th style={styles.thStyle}>Required</th>
            <th style={styles.thStyle}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tdPropStyle}>token</td>
            <td style={styles.tdStyle}>Yes</td>
            <td style={styles.tdStyle}>Valid JWT access token</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>id</td>
            <td style={styles.tdStyle}>Yes</td>
            <td style={styles.tdStyle}>User ID (validated against token.sub)</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>action</td>
            <td style={styles.tdStyle}>Yes</td>
            <td style={styles.tdStyle}>Name of registered action</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>payload</td>
            <td style={styles.tdStyle}>No</td>
            <td style={styles.tdStyle}>Data passed to handler (defaults to {`{}`})</td>
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
      <CodeBlock title="Responses" code={`// Success
{ "ok": true, "data": /* handler return value */ }

// Error
{ "ok": false, "error": "ERROR_CODE", "message": "..." }`} />
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
            <td style={styles.tdStyle}>token, id, or action missing</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>TOKEN_INVALID</td>
            <td style={styles.tdStyle}>Inactive, expired, or userId mismatch</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>INTROSPECTION_ERROR</td>
            <td style={styles.tdStyle}>Failed OIDC token validation</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>NO_ORG_SELECTED</td>
            <td style={styles.tdStyle}>No active organization selected</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>ORG_NOT_MEMBER</td>
            <td style={styles.tdStyle}>Not a member of selected org</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>ACTION_NOT_FOUND</td>
            <td style={styles.tdStyle}>Action not registered</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>PERMISSION_DENIED</td>
            <td style={styles.tdStyle}>Lacks required permission</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>INTERNAL_ERROR</td>
            <td style={styles.tdStyle}>Unexpected server error</td>
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
        as async functions returning <code style={styles.codeStyle}>{`{ requiredPerm, handler }`}</code>.
      </p>
      <CodeBlock title="Example action" code={`// custom-actions/my-actions/do-something.ts
'use server';

export async function getDoSomething() {
  return {
    requiredPerm: 'do:something',
    handler: async ({ userId, orgId, payload }) => {
      // Business logic here
      return { success: true };
    },
  };
}

// custom-actions/index.ts
const actions: ActionRegistry = {
  'do-something': (await getDoSomething()),
};`} />
      <table style={styles.tableStyle}>
        <thead>
          <tr>
            <th style={styles.thStyle}>Handler param</th>
            <th style={styles.thStyle}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tdPropStyle}>userId</td>
            <td style={styles.tdStyle}>Authenticated user ID</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>orgId</td>
            <td style={styles.tdStyle}>Active organization ID</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>payload</td>
            <td style={styles.tdStyle}>Client-provided data</td>
          </tr>
        </tbody>
      </table>
    </SectionWrap>
  );
}

function PermissionSystemSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Permission flow">
      <p style={styles.textStyle}>
        Both <code style={styles.codeSmStyle}>{`<Protected />`}</code> and{' '}
        <code style={styles.codeSmStyle}>/api/protected</code> follow the same steps —
        just client-side vs server-side:
      </p>
      <CodeBlock title="Steps" code={`// 1. Resolve active org (asOrg from customData.Preferences)

// 2. <Protected> (client-side):
//    loadOrganizationPermissions(asOrg) → check includes(requiredPerm)

// 3. POST /api/protected (server-side):
//    introspectToken(token) → fetchUserRbacData(token)
//    → validateOrgMembership → getOrganizationUserPermissions(asOrg)
//    → requiredPerms.every(p => userPermissions.includes(p))`} />
    </SectionWrap>
  );
}

function LiveRbacDemoSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Test with curl">
      <p style={styles.textStyle}>
        Get your token from the Dev tab in the dashboard (click Reveal on Access Token).
      </p>
      <CodeBlock title="curl" code={`curl -X POST localhost:3000/api/protected \\
  -H "Content-Type: application/json" \\
  -d '{
    "token": "YOUR_ACCESS_TOKEN",
    "id": "YOUR_USER_ID",
    "action": "my-action",
    "payload": { "foo": "bar" }
  }'`} />
      <CodeBlock title="Responses" code={`// 200 success
{ "ok": true, "data": { ... } }

// 401 invalid token
{ "ok": false, "error": "TOKEN_INVALID", "message": "..." }

// 403 no permission
{ "ok": false, "error": "PERMISSION_DENIED", "message": "User lacks required permission: my:perm" }

// 404 action not found
{ "ok": false, "error": "ACTION_NOT_FOUND", "message": "Action \\"foo\\" not found" }`} />
    </SectionWrap>
  );
}

export default function ProtectedDoc() {
  const styles = useDocStyles();
  return (
    <SectionContainer>
      <Section id={1}>
        <div style={{ ...styles.twoColLayoutStyle, minHeight: '100%', padding: '16px', boxSizing: 'border-box', width: '100%', maxWidth: '100%' }}>
          <div style={styles.colLeftStyle}>
            <RbacOverviewSection />
          </div>
          <div style={styles.colLeftStyle}>
            <ProtectedComponentSection />
          </div>
        </div>
      </Section>

      <Section id={2}>
        <div style={{ ...styles.twoColLayoutStyle, minHeight: '100%', padding: '16px', boxSizing: 'border-box', width: '100%', maxWidth: '100%' }}>
          <div style={styles.colLeftStyle}>
            <ProtectedApiSection />
          </div>
          <div style={styles.colLeftStyle}>
            <ApiResponseSection />
          </div>
        </div>
      </Section>

      <Section id={3}>
        <div style={{ ...styles.twoColLayoutStyle, minHeight: '100%', padding: '16px', boxSizing: 'border-box', width: '100%', maxWidth: '100%' }}>
          <div style={styles.colLeftStyle}>
            <ActionRegistrationSection />
          </div>
          <div style={styles.colLeftStyle}>
            <PermissionSystemSection />
            <LiveRbacDemoSection />
          </div>
        </div>
      </Section>
    </SectionContainer>
  );
}
