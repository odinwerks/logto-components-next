import { cookies } from 'next/headers';
import { getLogtoContext, getAccessToken, getOrganizationToken } from '@logto/next/server-actions';
import { logtoConfig } from '../../logto';
import { validateToken } from './token-validator';
import { introspectTokenWithOrg } from '../logic';

const ACTIVE_ORG_COOKIE = 'logto-active-org';

interface ProtectedProps {
  children: React.ReactNode;
  perm?: string | string[];
  role?: string | string[];
  orgId?: string | null;
  requireAll?: boolean;
}

async function getActiveOrgIdFromCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(ACTIVE_ORG_COOKIE);
  return cookie?.value;
}

async function introspectToken(token: string) {
  console.log('[RBAC] Protected: OIDC introspecting token...');
  return introspectTokenWithOrg(token);
}

export async function Protected({ children, perm, role, orgId, requireAll = true }: ProtectedProps) {
  console.log('[RBAC] Protected component rendering');
  console.log('[RBAC] Protected props:', { perm, role, orgId, requireAll });

  try {
    console.log('[RBAC] Protected: Getting Logto context...');
    const { claims, isAuthenticated } = await getLogtoContext(logtoConfig);

    console.log('[RBAC] Protected: isAuthenticated:', isAuthenticated, 'sub:', claims?.sub);

    if (!isAuthenticated || !claims?.sub) {
      console.log('[RBAC] Protected: Not authenticated or no sub, returning null');
      return null;
    }

    let targetOrgId = orgId;

    if (targetOrgId === undefined) {
      console.log('[RBAC] Protected: No orgId in props, reading from cookie...');
      targetOrgId = await getActiveOrgIdFromCookie();
      console.log('[RBAC] Protected: Got orgId from cookie:', targetOrgId);
    }

    const reqRequireAll = requireAll ?? true;

    // Track results for each check type
    let permPassed = true;
    let rolePassed = true;

    // === PERMISSION CHECK (JWT/JWKS path) ===
    if (perm) {
      console.log('[RBAC] Protected: Checking permissions (JWT/JWKS path)...');

      let token: string | null = null;

      if (targetOrgId !== null) {
        if (targetOrgId) {
          console.log('[RBAC] Protected: Getting organization token for org:', targetOrgId);
          token = await getOrganizationToken(logtoConfig, targetOrgId);
          console.log('[RBAC] Protected: Got org token:', token ? 'yes' : 'no');
        }
      }

      if (!token) {
        console.log('[RBAC] Protected: No token for perm check, returning null');
        permPassed = false;
      } else {
        console.log('[RBAC] Protected: Validating token...');
        const claims_ = await validateToken(token);

        console.log('[RBAC] Protected: Token validated, sub:', claims_.sub);
        if (claims_.sub !== claims.sub) {
          console.warn('[RBAC] Protected: Subject mismatch!');
          permPassed = false;
        } else if (targetOrgId !== null && targetOrgId && claims_.orgId !== targetOrgId) {
          console.warn('[RBAC] Protected: Org mismatch!', { expected: targetOrgId, actual: claims_.orgId });
          permPassed = false;
        } else {
          console.log('[RBAC] Protected: Checking perms...', { perm, requireAll: reqRequireAll });
          const perms = Array.isArray(perm) ? perm : [perm];
          const hasPerm = reqRequireAll
            ? perms.every((p) => claims_.scopes.includes(p))
            : perms.some((p) => claims_.scopes.includes(p));
          if (!hasPerm) {
            console.log('[RBAC] Protected: Missing perms, returning null');
            permPassed = false;
          }
        }
      }
    }

    // === ROLE CHECK (OIDC Introspection path) ===
    if (role) {
      console.log('[RBAC] Protected: Checking roles (OIDC Introspection path)...');

      // Get access token for introspection
      const accessToken = await getAccessToken(logtoConfig);
      if (!accessToken) {
        console.log('[RBAC] Protected: No access token for role check, returning null');
        rolePassed = false;
      } else {
        try {
          const introspection = await introspectToken(accessToken);

          if (!introspection.active) {
            console.warn('[RBAC] Protected: Token not active!');
            rolePassed = false;
          } else if (introspection.sub !== claims.sub) {
            console.warn('[RBAC] Protected: SUBJECT_MISMATCH (introspection)!');
            rolePassed = false;
          } else {
            const organizationRoles = introspection.organization_roles as string[] | undefined;
            console.log('[RBAC] Protected: User org roles from introspection:', organizationRoles);

            // If orgId is provided, check the org matches
            if (targetOrgId !== null && targetOrgId) {
              const orgFromIntrospection = introspection.organization_id;
              if (orgFromIntrospection && orgFromIntrospection !== targetOrgId) {
                console.warn('[RBAC] Protected: ORG_MISMATCH (introspection)!', { expected: targetOrgId, actual: orgFromIntrospection });
                rolePassed = false;
              }
            }

            if (rolePassed) {
              if (!organizationRoles || organizationRoles.length === 0) {
                console.log('[RBAC] Protected: No org roles from introspection, returning null');
                rolePassed = false;
              } else {
                console.log('[RBAC] Protected: Checking roles...', { role, requireAll: reqRequireAll });
                const roles = Array.isArray(role) ? role : [role];
                const userRolesInOrg = organizationRoles
                  .filter((r) => {
                    if (!targetOrgId) return true;
                    const [roleOrgId] = r.split(':');
                    return roleOrgId === targetOrgId;
                  })
                  .map((r) => r.split(':')[1]);

                const hasRole = reqRequireAll
                  ? roles.every((r) => userRolesInOrg.includes(r))
                  : roles.some((r) => userRolesInOrg.includes(r));

                if (!hasRole) {
                  console.log('[RBAC] Protected: Missing role, returning null');
                  rolePassed = false;
                }
              }
            }
          }
        } catch (error) {
          console.error('[RBAC] Protected: Role introspection error:', error);
          rolePassed = false;
        }
      }
    }

    // === COMBINE RESULTS ===
    let finalPass: boolean;

    if (perm && role) {
      // Both provided
      finalPass = reqRequireAll ? (permPassed && rolePassed) : (permPassed || rolePassed);
    } else if (perm) {
      finalPass = permPassed;
    } else if (role) {
      finalPass = rolePassed;
    } else {
      // No checks requested - allow
      finalPass = true;
    }

    if (!finalPass) {
      console.log('[RBAC] Protected: Final check failed, returning null');
      return null;
    }

    console.log('[RBAC] Protected: All checks passed, rendering children');
    return <>{children}</>;
  } catch (error) {
    console.error('[RBAC] Protected error:', error);
    return null;
  }
}
