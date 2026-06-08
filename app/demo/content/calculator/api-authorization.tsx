'use client';

import { useDocStyles } from '../../components/useDocStyles';
import CodeBlock from '../../components/SyntaxBlock';
import { useThemeMode } from '../../../logto-kit/components/providers/preferences';
import { slugify } from '../../components/SectionComponents';

export default function CalculatorApiAuthorizationDoc() {
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <h2 id={slugify("Server-Side Endpoint Verification")} style={{ ...h2Style, marginTop: 0 }}>Server-Side Endpoint Verification</h2>
      
      <p style={styles.textStyle}>
        All computation requests are sent as POST requests to the <code style={styles.codeSmStyle}>/api/protected</code> endpoint. 
        The endpoint acts as a secure proxy gateway, performing strict authentication and authorization checks before executing any registered actions.
      </p>
      <p style={styles.textStyle}>
        Authorization depends on OIDC customData token claims. The endpoint resolves the action from the registry, 
        retrieves the active user session token, performs token introspection, and verifies organization-scoped access, roles, and permission scopes.
      </p>

      <h2 id={slugify("Authentication and Verification Flow")} style={h2Style}>Authentication and Verification Flow</h2>
      
      <p style={styles.textStyle}>
        The simplified logic below highlights how incoming requests are authenticated, introspected, and verified against the action configuration:
      </p>
      <CodeBlock 
        title="app/api/protected/route.ts" 
        code={`export async function POST(request: NextRequest) {
  // Block cross-origin requests (CSRF protection)
  const originError = checkSameOrigin(request);
  if (originError) return originError;

  try {
    const body: ProtectedRequestBody = await request.json();
    const { action, payload } = body;

    if (!action) return apiError('MISSING_FIELDS', 400);

    // Step 1: Retrieve session token
    let token: string;
    try {
      token = await getTokenForServerAction();
    } catch (error) {
      return apiError('UNAUTHORIZED', 401);
    }

    // Step 2: Introspect token
    let introspection;
    try {
      introspection = await introspectToken(token);
    } catch (error) {
      return apiError('INTROSPECTION_ERROR', 401);
    }

    if (!introspection.active || !introspection.sub) {
      return apiError('TOKEN_INVALID', 401);
    }

    // Step 3: Resolve requested action and check configuration
    const actionConfig = await getAction(action);
    if (!actionConfig) return apiError('ACTION_NOT_FOUND', 404);

    if (!actionConfig.requiredOrgId || !actionConfig.requiredRoleId || !actionConfig.requiredPermId) {
      return apiError('IMPROPER_SETUP_ERROR', 500);
    }

    // Step 4: Verify organization access & active org matching
    const orgId = actionConfig.requiredOrgId;
    if (orgId !== 'self') {
      const asOrg = await fetchUserAsOrg(introspection.sub);
      if (asOrg !== orgId) {
        return apiError('ORG_NOT_MEMBER', 403);
      }
    }

    const { verifyOrgAccess } = await import('../../logto-kit/logic/actions');
    const result = await verifyOrgAccess(orgId === 'self' ? 'self' : orgId);
    if (!result.ok) {
      return apiError('ORG_NOT_MEMBER', 403);
    }

    const { roles, permissions } = result.data;

    // Step 5: Verify role membership
    const requiredRoles = Array.isArray(actionConfig.requiredRoleId)
      ? actionConfig.requiredRoleId
      : [actionConfig.requiredRoleId];
    const hasRole = requiredRoles.every(reqId => roles.some(r => r.id === reqId));
    if (!hasRole) return apiError('ROLE_DENIED', 403);

    // Step 6: Verify permission scope
    const requiredPerms = Array.isArray(actionConfig.requiredPermId)
      ? actionConfig.requiredPermId
      : [actionConfig.requiredPermId];
    const hasPermission = requiredPerms.every(perm => permissions.includes(perm));
    if (!hasPermission) return apiError('PERMISSION_DENIED', 403);

    // Step 7: Execute registered handler
    try {
      const handlerResult = await actionConfig.handler({
        userId: introspection.sub,
        orgId: actionConfig.requiredOrgId === 'self' ? null : actionConfig.requiredOrgId,
        payload: payload ?? {},
      });

      return NextResponse.json({ error: null, data: handlerResult });
    } catch (handlerError) {
      const msg = handlerError instanceof Error ? handlerError.message : '';
      if (msg.includes('INVALID_PAYLOAD')) {
        return apiError('INVALID_PAYLOAD', 400);
      }
      return apiError('INTERNAL_ERROR', 500);
    }
  } catch (error) {
    return apiError('INTERNAL_ERROR', 500);
  }
}`} 
      />

      <h2 id={slugify("API Error Codes Mapping")} style={h2Style}>API Error Codes Mapping</h2>
      
      <p style={styles.textStyle}>
        The endpoint responds with specific HTTP status codes and standard, plain error strings when validation or verification checks fail:
      </p>
      <table style={customTableStyle}>
        <thead>
          <tr>
            <th style={{ ...customThStyle, width: '15%' }}>Status</th>
            <th style={{ ...customThStyle, width: '35%' }}>Error Code</th>
            <th style={{ ...customThStyle, width: '50%' }}>Description and Triggers</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={customTdPropStyle}>400</td>
            <td style={customTdPropStyle}>MISSING_FIELDS</td>
            <td style={customTdStyle}>
              The request body is missing mandatory fields such as the action parameter.
            </td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>400</td>
            <td style={customTdPropStyle}>TOKEN_INVALID</td>
            <td style={customTdStyle}>
              The token is improperly formatted or failed basic user ID safety assertions.
            </td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>400</td>
            <td style={customTdPropStyle}>INVALID_PAYLOAD</td>
            <td style={customTdStyle}>
              The request parameters failed validation inside the mathematical handler (e.g. division by zero or invalid numbers).
            </td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>401</td>
            <td style={customTdPropStyle}>UNAUTHORIZED</td>
            <td style={customTdStyle}>
              No valid authenticated session token was found, or session principal verification failed.
            </td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>401</td>
            <td style={customTdPropStyle}>INTROSPECTION_ERROR</td>
            <td style={customTdStyle}>
              An error occurred during token introspection (e.g. invalid signature, connection issues, or missing issuer).
            </td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>403</td>
            <td style={customTdPropStyle}>ORG_NOT_MEMBER</td>
            <td style={customTdStyle}>
              The active user is not a member of the organization declared in the action configuration.
            </td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>403</td>
            <td style={customTdPropStyle}>ROLE_DENIED</td>
            <td style={customTdStyle}>
              The user does not possess the specific role required by the requested action config.
            </td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>403</td>
            <td style={customTdPropStyle}>PERMISSION_DENIED</td>
            <td style={customTdStyle}>
              The active token does not contain the required permission scope.
            </td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>500</td>
            <td style={customTdPropStyle}>IMPROPER_SETUP_ERROR</td>
            <td style={customTdStyle}>
              The requested action configuration is missing mandatory check fields (org ID, role ID, or permissions).
            </td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>500</td>
            <td style={customTdPropStyle}>INTERNAL_ERROR</td>
            <td style={customTdStyle}>
              An unexpected server or handler exception occurred during execution.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
