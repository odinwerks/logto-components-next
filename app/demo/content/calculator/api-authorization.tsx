'use client';

import { useDocStyles } from '../../components/useDocStyles';
import CodeBlock from '../../components/SyntaxBlock';
import { SectionWrap } from '../../components/SectionComponents';

export default function CalculatorApiAuthorizationDoc() {
  const styles = useDocStyles();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <SectionWrap label="Server-Side Endpoint Verification">
        <p style={styles.textStyle}>
          All computation requests are sent as POST requests to the <code style={styles.codeSmStyle}>/api/protected</code> endpoint. 
          The endpoint acts as a secure proxy gateway, performing strict authentication and authorization checks before executing any registered actions.
        </p>
        <p style={styles.textStyle}>
          Authorization depends on OIDC customData token claims. The endpoint resolves the action from the registry, 
          retrieves the active user session or bearer token, performs token introspection, and verifies organization-scoped access, roles, and permission scopes.
        </p>
      </SectionWrap>

      <SectionWrap label="Authentication and Verification Flow">
        <p style={styles.textStyle}>
          The simplified logic below highlights how incoming requests are authenticated, introspected, and verified against the action configuration:
        </p>
        <CodeBlock 
          title="app/api/protected/route.ts" 
          code={`export async function POST(request: NextRequest) {
  try {
    const body: ProtectedRequestBody = await request.json();
    const { action, payload } = body;

    if (!action) return apiError('MISSING_FIELDS', 400);

    // Step 1: Retrieve session token
    let token: string;
    try {
      token = await getTokenForServerAction();
    } catch {
      const authHeader = request.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      } else {
        return apiError('UNAUTHORIZED', 401);
      }
    }

    // Step 2: Introspect token
    const introspection = await introspectToken(token);
    if (!introspection.active || !introspection.sub) {
      return apiError('TOKEN_INVALID', 401);
    }

    // Step 3: Resolve requested action and check configuration
    const actionConfig = await getAction(action);
    if (!actionConfig) return apiError('ACTION_NOT_FOUND', 404);

    if (!actionConfig.requiredOrgId || !actionConfig.requiredRoleId || !actionConfig.requiredPermId) {
      return apiError('IMPROPER_SETUP_ERROR', 500);
    }

    // Step 4: Verify organization access
    const { verifyOrgAccess } = await import('../../logto-kit/logic/actions');
    const result = await verifyOrgAccess(actionConfig.requiredOrgId);
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
    const handlerResult = await actionConfig.handler({
      userId: introspection.sub,
      orgId: actionConfig.requiredOrgId,
      payload: payload ?? {},
    });

    return NextResponse.json({ error: null, data: handlerResult });
  } catch (error) {
    return apiError('INTERNAL_ERROR', 500);
  }
}`} 
        />
      </SectionWrap>

      <SectionWrap label="API Error Codes Mapping">
        <p style={styles.textStyle}>
          The endpoint responds with specific HTTP status codes and standard, plain error strings when validation or verification checks fail:
        </p>
        <table style={styles.tableStyle}>
          <thead>
            <tr>
              <th style={{ ...styles.thStyle, width: '15%' }}>Status</th>
              <th style={{ ...styles.thStyle, width: '35%' }}>Error Code</th>
              <th style={{ ...styles.thStyle, width: '50%' }}>Description and Triggers</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.tdPropStyle}>400</td>
              <td style={styles.tdPropStyle}>MISSING_FIELDS</td>
              <td style={styles.tdStyle}>
                The request body is missing mandatory fields such as the action parameter.
              </td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>400</td>
              <td style={styles.tdPropStyle}>TOKEN_INVALID</td>
              <td style={styles.tdStyle}>
                The token is improperly formatted or failed basic user ID safety assertions.
              </td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>401</td>
              <td style={styles.tdPropStyle}>UNAUTHORIZED</td>
              <td style={styles.tdStyle}>
                No valid session cookie or bearer token was found, or token signature validation failed.
              </td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>403</td>
              <td style={styles.tdPropStyle}>ORG_NOT_MEMBER</td>
              <td style={styles.tdStyle}>
                The active user is not a member of the organization declared in the action configuration.
              </td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>403</td>
              <td style={styles.tdPropStyle}>ROLE_DENIED</td>
              <td style={styles.tdStyle}>
                The user does not possess the specific role required by the requested action config.
              </td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>403</td>
              <td style={styles.tdPropStyle}>PERMISSION_DENIED</td>
              <td style={styles.tdStyle}>
                The active token does not contain the required permission scope.
              </td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>500</td>
              <td style={styles.tdPropStyle}>IMPROPER_SETUP_ERROR</td>
              <td style={styles.tdStyle}>
                The requested action configuration is missing mandatory check fields (org ID, role ID, or permissions).
              </td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>500</td>
              <td style={styles.tdPropStyle}>INTERNAL_ERROR</td>
              <td style={styles.tdStyle}>
                An unexpected server or handler exception occurred during execution.
              </td>
            </tr>
          </tbody>
        </table>
      </SectionWrap>
    </div>
  );
}
