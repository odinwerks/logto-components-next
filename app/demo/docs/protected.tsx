'use client';

import CodeBlock from '../utils/CodeBlock';
import { SectionContainer, Section } from '../utils/Section';
import { Protected } from '../../logto-kit/custom-logic';
import PresidentControlPanel from '../logic/PresidentControlPanel';

// ─── Shared styles ──────────────────────────────────────────────────────────

const twoColLayoutStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '16px',
  alignItems: 'start',
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

const tdTypeStyle: React.CSSProperties = {
  ...tdStyle,
  color: '#4ec9b0',
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: '0.625rem',
};

const chipStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '2px 6px',
  borderRadius: '3px',
  fontSize: '0.5625rem',
  fontFamily: "'IBM Plex Mono', monospace",
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: 'rgba(255,255,255,0.45)',
  letterSpacing: '0.03em',
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
// Page 1: Overview + Protected Component
// ═══════════════════════════════════════════════════════════════════════════════

function RbacOverviewSection() {
  return (
    <SectionWrap label="RBAC Overview">
      <p style={textStyle}>
        Permission-Based Access Control (PBAC) is implemented through Logto's organization permission system.
        Permissions are granted based on organization permissions assigned to users.
      </p>
      <CodeBlock title="RBAC Flow" code={`// 1. User selects organization (stored in customData.Preferences.asOrg)
// 2. Permissions are checked from organization tokens via getOrganizationUserPermissions()
// 3. Protected component/API checks permissions before rendering/executing`} />
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Component</th>
            <th style={thStyle}>Purpose</th>
            <th style={thStyle}>Scope</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdPropStyle}>{`<Protected />`}</td>
            <td style={tdStyle}>Conditional UI rendering</td>
            <td style={tdStyle}>Server-side</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>POST /api/protected</td>
            <td style={tdStyle}>Protected server actions</td>
            <td style={tdStyle}>API endpoint</td>
          </tr>
        </tbody>
      </table>
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Demo:</strong>{' '}
        The app includes a President Control Panel that only appears for users with "kidnap:kids" permission in organization "government".
        Try switching organizations to see permission-based access control in action!
      </div>
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Organization Context:</strong>{' '}
        All RBAC checks require an active organization selection. Use{' '}
        <code style={codeSmStyle}>useOrgMode()</code> or OrgSwitcher to manage this.
      </div>
    </SectionWrap>
  );
}

function ProtectedComponentSection() {
  return (
    <SectionWrap label="Protected Component">
      <p style={textStyle}>
        A Server Component that conditionally renders children based on permission checks.
        Performs validation server-side before page rendering.
      </p>
      <CodeBlock title="Basic Usage" code={`import { Protected } from './logto-kit';

export default function AdminPage() {
  return (
    <Protected perm="admin">
      <div>Admin-only content</div>
    </Protected>
  );
}`} />
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Prop</th>
            <th style={thStyle}>Type</th>
            <th style={thStyle}>Default</th>
            <th style={thStyle}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdPropStyle}>children</td>
            <td style={tdTypeStyle}>React.ReactNode</td>
            <td style={tdStyle}>-</td>
            <td style={tdStyle}>Content to render if access granted</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>perm</td>
            <td style={tdTypeStyle}>string | string[]</td>
            <td style={tdStyle}>-</td>
            <td style={tdStyle}>Required permission(s) to check</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>orgId</td>
            <td style={tdTypeStyle}>string | null</td>
            <td style={tdStyle}>undefined</td>
            <td style={tdStyle}>Override org context (uses user's stored org if undefined)</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>requireAll</td>
            <td style={tdTypeStyle}>boolean</td>
            <td style={tdStyle}>true</td>
            <td style={tdStyle}>Require ALL permissions (AND) vs ANY (OR)</td>
          </tr>
        </tbody>
      </table>
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Best Practice — Separate Concerns:</strong>{' '}
        Avoid wrapping protected content inline in your main page files. Instead, create a dedicated component
        file for the protected UI and wrap it with <code style={codeSmStyle}>{`<Protected />`}</code> there.
        This keeps permission logic co-located with the component it guards.
      </div>
      <CodeBlock title="Recommended Pattern" code={`// app/admin/admin-panel.tsx
import { Protected } from '../../logto-kit';
import { AdminDashboard } from './admin-dashboard';

export function AdminPanel() {
  return (
    <Protected perm="read:users">
      <AdminDashboard />
    </Protected>
  );
}

// app/page.tsx
import { AdminPanel } from './admin/admin-panel';

// Just import and use — permissions are encapsulated
<AdminPanel />`} />
    </SectionWrap>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page 2: Protected Actions API
// ═══════════════════════════════════════════════════════════════════════════════

function ProtectedApiSection() {
  return (
    <SectionWrap label="Protected Actions API">
      <p style={textStyle}>
        Secure API endpoint for executing permission-gated server actions from the client.
        Validates tokens, checks organization membership, and verifies permissions before execution.
      </p>
      <CodeBlock title="Endpoint" code={`POST /api/protected`} />
      <CodeBlock title="Request Format" code={`const response = await fetch('/api/protected', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    token: accessToken,        // User's access token
    id: userId,               // User ID (must match token.sub)
    action: 'action-name',    // Registered action name
    payload: { /* optional data */ }
  })
});`} />
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Field</th>
            <th style={thStyle}>Type</th>
            <th style={thStyle}>Required</th>
            <th style={thStyle}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdPropStyle}>token</td>
            <td style={tdTypeStyle}>string</td>
            <td style={tdStyle}>Yes</td>
            <td style={tdStyle}>Valid JWT access token</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>id</td>
            <td style={tdTypeStyle}>string</td>
            <td style={tdStyle}>Yes</td>
            <td style={tdStyle}>User ID (validated against token.sub)</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>action</td>
            <td style={tdTypeStyle}>string</td>
            <td style={tdStyle}>Yes</td>
            <td style={tdStyle}>Name of registered action</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>payload</td>
            <td style={tdTypeStyle}>unknown</td>
            <td style={tdStyle}>No</td>
            <td style={tdStyle}>Data passed to action handler (defaults to `{}` if omitted)</td>
          </tr>
        </tbody>
      </table>
    </SectionWrap>
  );
}

function ApiResponseSection() {
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
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Error Code</th>
            <th style={thStyle}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdPropStyle}>MISSING_FIELDS</td>
            <td style={tdStyle}>Required fields (token, id, action) missing</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>TOKEN_INVALID</td>
            <td style={tdStyle}>Token inactive, expired, or userId mismatch</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>INTROSPECTION_ERROR</td>
            <td style={tdStyle}>Failed to validate token via OIDC introspection</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>USER_DATA_ERROR</td>
            <td style={tdStyle}>Failed to fetch user RBAC data</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>NO_ORG_SELECTED</td>
            <td style={tdStyle}>User has no active organization selected</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>ORG_NOT_MEMBER</td>
            <td style={tdStyle}>User not member of selected organization</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>ACTION_NOT_FOUND</td>
            <td style={tdStyle}>Requested action not registered</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>PERMISSION_DENIED</td>
            <td style={tdStyle}>User lacks required permission in active organization</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>INTERNAL_ERROR</td>
            <td style={tdStyle}>Unexpected server error (catch-all)</td>
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
  return (
    <SectionWrap label="Action Registration">
      <p style={textStyle}>
        Actions are registered in <code style={codeStyle}>app/logto-kit/custom-actions/index.ts</code>{' '}
        with required permissions and handler functions.
      </p>
      <CodeBlock title="Registration Example" code={`import type { ActionRegistry } from './index';

const actions: ActionRegistry = {
  'send-notification': {
    requiredPermission: 'send-notifications',
    handler: async ({ userId, orgId, payload }) => {
      // Business logic here
      const { message } = payload as { message: string };
      await sendNotification(userId, orgId, message);
      return { sent: true, timestamp: Date.now() };
    },
  },
};

export async function getAction(actionName: string) {
  return actions[actionName];
}`} />
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Handler Parameter</th>
            <th style={thStyle}>Type</th>
            <th style={thStyle}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdPropStyle}>userId</td>
            <td style={tdTypeStyle}>string</td>
            <td style={tdStyle}>Authenticated user ID</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>orgId</td>
            <td style={tdTypeStyle}>string</td>
            <td style={tdStyle}>Active organization ID</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>payload</td>
            <td style={tdTypeStyle}>unknown</td>
            <td style={tdStyle}>Client-provided data</td>
          </tr>
        </tbody>
      </table>
    </SectionWrap>
  );
}

function ExamplesSection() {
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

// Organization + Permission combination (like President demo)
<Protected orgId="government" perm="kidnap:kids">
  <PresidentControlPanel />
</Protected>

// Specific organization override
<Protected perm="manage-org" orgId="org-specific-id">
  <OrgManagement />
</Protected>`} />
      <CodeBlock title="Protected Actions API Example" code={`// Client-side call (like in PresidentControlPanel)
const result = await fetch('/api/protected', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    token: accessToken,        // User's access token
    id: userId,               // User ID (must match token.sub)
    action: 'destroy-economy', // Registered action name
    payload: { inflation: 0 }  // Current counter value
  })
});

const data = await result.json();
if (data.ok) {
  console.log('Action succeeded:', data.data);
  // Update UI with new counter: data.data.inflation
} else {
  console.error('Action failed:', data.error, data.message);
}`} />
    </SectionWrap>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page 4: Permission System + Troubleshooting
function PermissionSystemSection() {
  return (
    <SectionWrap label="Permission System">
      <p style={textStyle}>
        The system uses Logto's organization permissions for access control.
        Permissions like "kidnap:kids" and "steal:taxes" are defined in Logto Console
        organization templates and assigned to roles.
      </p>
      <CodeBlock title="Using Permissions in Components" code={`// Check for specific permissions:
<Protected orgId="org-123-actual-id" perm="manage:users">
  <Component />
</Protected>

// Multiple permissions (require all):
<Protected perm={["read:documents", "write:documents"]}>
  <Editor />
</Protected>

// Multiple permissions (require any):
<Protected perm={["read:documents", "write:documents"]} requireAll={false}>
  <Viewer />
</Protected>
`} />
    </SectionWrap>
  );
}

function DemoExplanationSection() {
  return (
    <SectionWrap label="Live RBAC Demo">
      <div style={twoColLayoutStyle}>
        <div style={colLeftStyle}>
          <p style={textStyle}>
            Test the Protected Actions API with curl. Get your token from the browser console.
          </p>
          <CodeBlock title="Get Token" code={`// In browser console:
console.log(logto.accessToken)`} />
          <CodeBlock title="Test with Curl" code={`curl -X POST localhost:3000/api/protected \\
  -H "Content-Type: application/json" \\
  -d '{
    "token": "YOUR_ACCESS_TOKEN",
    "id": "YOUR_USER_ID",
    "action": "destroy-economy",
    "payload": { "inflation": 0 }
  }'`} />
          <div style={{ marginBottom: '12px' }}>
            <div style={{ ...thStyle, paddingBottom: '8px' }}>Available Actions:</div>
            <div style={noteStyle}>
              <span style={codeSmStyle}>destroy-economy</span> → requires <span style={codeSmStyle}>steal:taxes</span><br />
              <span style={codeSmStyle}>steal-tax-dollars</span> → requires <span style={codeSmStyle}>steal:taxes</span><br />
              <span style={codeSmStyle}>kidnap-children</span> → requires <span style={codeSmStyle}>kidnap:kids</span><br />
              <span style={codeSmStyle}>launch-nuke</span> → requires <span style={codeSmStyle}>launch:nuke</span>
            </div>
          </div>
          <CodeBlock title="Success Response (200)" code={`{
  "ok": true,
  "data": {
    "success": true,
    "message": "Inflated the economy! ...",
    "data": { "inflation": 10 }
  }
}`} />
          <CodeBlock title="Error Responses" code={`// 401 - Invalid/expired token
{ "ok": false, "error": "TOKEN_INVALID", "message": "..." }

// 403 - Missing permission
{ "ok": false, "error": "PERMISSION_DENIED", "message": "User lacks required permission: steal:taxes" }

// 404 - Action not found
{ "ok": false, "error": "ACTION_NOT_FOUND", "message": "Action \\"foo\\" not found" }`} />
        </div>
        <div style={colLeftStyle}>
          <p style={textStyle}>
            The panel below demonstrates organization-based access control. Switch to the 
            "government" organization to see it appear.
          </p>
          <PresidentControlPanel />
          <div style={noteStyle}>
            <strong style={{ color: 'rgba(255,255,255,0.55)' }}>How it works:</strong>{' '}
            The component wraps <code style={codeSmStyle}>PresidentControlPanelClient</code> with{' '}
            <code style={codeSmStyle}>Protected</code> at the export stage — this is the recommended pattern.
            Wrap your component in its own file, export the protected version, and use it in your app.
            Clicking the buttons calls <code style={codeSmStyle}>POST /api/protected</code> with the registered actions.
          </div>
        </div>
      </div>
    </SectionWrap>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export default function ProtectedDoc() {
  return (
    <SectionContainer>
      {/* Page 1: Overview + Protected Component */}
      <Section id={1}>
        <div style={{ ...twoColLayoutStyle, height: '100%', padding: '16px' }}>
          <div style={colLeftStyle}>
            <RbacOverviewSection />
          </div>
          <div style={colLeftStyle}>
            <ProtectedComponentSection />
          </div>
        </div>
      </Section>

      {/* Page 2: Protected Actions API */}
      <Section id={2}>
        <div style={{ ...twoColLayoutStyle, height: '100%', padding: '16px' }}>
          <div style={colLeftStyle}>
            <ProtectedApiSection />
          </div>
          <div style={colLeftStyle}>
            <ApiResponseSection />
          </div>
        </div>
      </Section>

      {/* Page 3: Action Registration + Examples */}
      <Section id={3}>
        <div style={{ ...twoColLayoutStyle, height: '100%', padding: '16px' }}>
          <div style={colLeftStyle}>
            <ActionRegistrationSection />
          </div>
          <div style={colLeftStyle}>
            <ExamplesSection />
          </div>
        </div>
      </Section>

      {/* Page 4: Permission System + Live Demo */}
      <Section id={4}>
        <div style={{ ...twoColLayoutStyle, height: '100%', padding: '16px' }}>
          <div style={colLeftStyle}>
            <PermissionSystemSection />
          </div>
          <div style={colLeftStyle}>
            <DemoExplanationSection />
          </div>
        </div>
      </Section>
    </SectionContainer>
  );
}