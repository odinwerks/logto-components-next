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
        Authorization depends on Management API user customData (read server-side via M2M) plus token introspection 
        for principal/audience verification. The endpoint resolves the action from the registry, retrieves the active 
        user session token, performs token introspection, checks the audience, rate-limits per user, and verifies 
        organization-scoped access, roles, and permission scopes.
      </p>

      <h2 id={slugify("Authentication and Verification Flow")} style={h2Style}>Authentication and Verification Flow</h2>
      
      <p style={styles.textStyle}>
        The simplified logic below highlights how incoming requests are authenticated, introspected, and verified against the action configuration:
      </p>
      <CodeBlock 
        title="app/api/protected/route.ts" 
        code={`export async function POST(request: NextRequest) {
  // Block cross-origin requests (CSRF protection).
  const originError = checkSameOrigin(request);
  if (originError) return originError;

  try {
    // Step 0: Verify session token BEFORE body parse (BUG-011).
    // The session token comes from the SDK cookie, so auth runs before
    // buffering the request body. This prevents unauthenticated same-origin
    // requests from consuming memory and bypassing the rate limiter (which is
    // keyed on introspection.sub and therefore only runs after auth).
    let token: string;
    try {
      token = await getTokenForServerAction();
    } catch (error) {
      return apiError('UNAUTHORIZED', 401);
    }

    let introspection;
    try {
      introspection = await introspectToken(token);
    } catch (error) {
      return apiError('INTROSPECTION_ERROR', 401);
    }

    if (!introspection.active) {
      return apiError('TOKEN_INVALID', 401);
    }

    const id = introspection.sub;
    if (!id) {
      return apiError('TOKEN_INVALID', 401);
    }

    // Verify token audience matches this application's client_id (BUG-H02).
    const logtoConfig = getLogtoConfig();
    if (!introspection.client_id || introspection.client_id !== logtoConfig.appId) {
      return apiError('TOKEN_INVALID', 401);
    }

    const expectedPrincipal = introspection.sid
      ? { sub: id, sid: introspection.sid }
      : { sub: id };

    try {
      assertSafeLogtoId(id, 'userId');
    } catch {
      return apiError('TOKEN_INVALID', 400);
    }

    // Per-user rate limiting (keyed on introspection.sub, runs AFTER auth).
    if (!(await protectedRouteRateLimiter.check(id))) {
      return NextResponse.json(
        { error: 'RATE_LIMITED', data: null },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    // Parse body with a real byte cap (BUG-011: 1 MiB max).
    let body: ProtectedRequestBody;
    try {
      body = (await readBodyWithByteCap(request, MAX_BODY_BYTES)) as ProtectedRequestBody;
    } catch (err) {
      if (err instanceof Error && err.message === 'PAYLOAD_TOO_LARGE') {
        return apiError('PAYLOAD_TOO_LARGE', 413);
      }
      return apiError('MISSING_FIELDS', 400);
    }

    const { action, payload } = body;
    if (!action) {
      return apiError('MISSING_FIELDS', 400);
    }

    // Resolve action from registry.
    const actionConfig = await getAction(action);
    if (!actionConfig) {
      return apiError('ACTION_NOT_FOUND', 404);
    }

    // Validate action configuration (all three check categories must be defined).
    try {
      validateActionConfig(actionConfig, action);
    } catch (validationError) {
      return apiError('IMPROPER_SETUP_ERROR', 500);
    }

    // ── RBAC verification: branch on "self" vs organization-scoped ──

    if (actionConfig.requiredOrgId === 'self') {
      // Personal scope: verify personal access, then check roles + permissions.
      const personalAccessResult = await verifyPersonalAccess(expectedPrincipal);
      if (!personalAccessResult.ok) {
        return apiError('UNAUTHORIZED', 401);
      }
      const { roles, permissions } = personalAccessResult.data;

      const requiredRoles = Array.isArray(actionConfig.requiredRoleId)
        ? actionConfig.requiredRoleId
        : [actionConfig.requiredRoleId];
      const hasRequiredRole = requiredRoles.every(reqId => roles.some(r => r.id === reqId));
      if (!hasRequiredRole) {
        return apiError('ROLE_DENIED', 403);
      }

      const requiredPerms = Array.isArray(actionConfig.requiredPermId)
        ? actionConfig.requiredPermId
        : [actionConfig.requiredPermId];
      const hasPermission = requiredPerms.every(perm => permissions.includes(perm));
      if (!hasPermission) {
        return apiError('PERMISSION_DENIED', 403);
      }
    } else {
      // Organization scope: verify org membership via Management API customData,
      // then check org roles + permissions.
      const orgId = actionConfig.requiredOrgId;
      const asOrg = await fetchUserAsOrg(id);
      if (asOrg !== orgId) {
        return apiError('ORG_NOT_MEMBER', 403);
      }

      const result = await verifyOrgAccess(orgId, expectedPrincipal);
      if (!result.ok) {
        if (result.error === 'UNAUTHORIZED') {
          return apiError('UNAUTHORIZED', 401);
        }
        return apiError('ORG_NOT_MEMBER', 403);
      }
      const { roles, permissions } = result.data;

      // Role and permission checks (identical logic to personal scope above).
      const requiredRoles = Array.isArray(actionConfig.requiredRoleId)
        ? actionConfig.requiredRoleId
        : [actionConfig.requiredRoleId];
      const hasRequiredRole = requiredRoles.every(reqId => roles.some(r => r.id === reqId));
      if (!hasRequiredRole) {
        return apiError('ROLE_DENIED', 403);
      }

      const requiredPerms = Array.isArray(actionConfig.requiredPermId)
        ? actionConfig.requiredPermId
        : [actionConfig.requiredPermId];
      const hasPermission = requiredPerms.every(perm => permissions.includes(perm));
      if (!hasPermission) {
        return apiError('PERMISSION_DENIED', 403);
      }
    }

    // ── Invoke registered handler ────────────────────────────────────────
    try {
      const result = await actionConfig.handler({
        userId: id,
        orgId: actionConfig.requiredOrgId === 'self' ? null : actionConfig.requiredOrgId,
        payload: payload ?? {},
      });
      return NextResponse.json({ error: null, data: result });
    } catch (handlerError) {
      const msg = handlerError instanceof Error ? handlerError.message : 'Invalid input';
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
              The request body is missing mandatory fields such as the action parameter, or the action name is empty or exceeds 128 characters.
            </td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>400 / 401</td>
            <td style={customTdPropStyle}>TOKEN_INVALID</td>
            <td style={customTdStyle}>
              The token is inactive, missing a subject claim, or has an audience mismatch with this application (401). Also returned as 400 when the user ID fails basic safety assertions (<code>assertSafeLogtoId</code>).
            </td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>400</td>
            <td style={customTdPropStyle}>INVALID_PAYLOAD</td>
            <td style={customTdStyle}>
              The request parameters failed validation inside the mathematical handler (e.g. division by zero or invalid number types).
            </td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>401</td>
            <td style={customTdPropStyle}>UNAUTHORIZED</td>
            <td style={customTdStyle}>
              No valid authenticated session token was found, or principal verification (personal access, org access) failed.
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
            <td style={customTdPropStyle}>404</td>
            <td style={customTdPropStyle}>ACTION_NOT_FOUND</td>
            <td style={customTdStyle}>
              The requested action is not registered in the action registry (<code>getAction()</code> returned <code>undefined</code>).
            </td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>413</td>
            <td style={customTdPropStyle}>PAYLOAD_TOO_LARGE</td>
            <td style={customTdStyle}>
              The request body exceeds the 1 MiB cap (enforced by <code>readBodyWithByteCap</code> reading the actual stream bytes, not the spoofable Content-Length header - BUG-011).
            </td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>429</td>
            <td style={customTdPropStyle}>RATE_LIMITED</td>
            <td style={customTdStyle}>
              The per-user rate limit (60 requests per 60-second window) has been exceeded. Response includes a <code>Retry-After: 60</code> header.
            </td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>403</td>
            <td style={customTdPropStyle}>ORG_NOT_MEMBER</td>
            <td style={customTdStyle}>
              The active user is not a member of the organization declared in the action configuration, or org access verification failed.
            </td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>403</td>
            <td style={customTdPropStyle}>ROLE_DENIED</td>
            <td style={customTdStyle}>
              The user does not possess the specific role required by the requested action config (checked in both personal and organization scope).
            </td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>403</td>
            <td style={customTdPropStyle}>PERMISSION_DENIED</td>
            <td style={customTdStyle}>
              The user does not have the required permission scope (checked in both personal and organization scope).
            </td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>500</td>
            <td style={customTdPropStyle}>IMPROPER_SETUP_ERROR</td>
            <td style={customTdStyle}>
              The requested action configuration failed validation (<code>validateActionConfig</code>) - missing mandatory check fields (org ID, role ID, or permissions).
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
