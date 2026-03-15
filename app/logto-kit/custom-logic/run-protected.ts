'use server';

import { cookies } from 'next/headers';
import { getLogtoContext, getAccessToken, getOrganizationToken } from '@logto/next/server-actions';
import { logtoConfig } from '../../logto';
import { validateToken } from './token-validator';
import { introspectTokenWithOrg } from '../logic';
import type { ProtectedRequirements, ProtectedResult } from './types';

const ACTIVE_ORG_COOKIE = 'logto-active-org';

async function getActiveOrgIdFromCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(ACTIVE_ORG_COOKIE);
  return cookie?.value;
}

function checkPerms(
  tokenScopes: string[],
  requiredPerms: string | string[] | undefined,
  requireAll: boolean
): boolean {
  if (!requiredPerms) return true;

  const perms = Array.isArray(requiredPerms) ? requiredPerms : [requiredPerms];
  if (perms.length === 0) return true;

  if (requireAll) {
    return perms.every((p) => tokenScopes.includes(p));
  }
  return perms.some((p) => tokenScopes.includes(p));
}

function checkRoles(
  organizationRoles: string[] | undefined,
  requiredRoles: string | string[] | undefined,
  orgId: string | undefined,
  requireAll: boolean
): boolean {
  if (!requiredRoles) return true;
  if (!organizationRoles || organizationRoles.length === 0) return false;

  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  if (roles.length === 0) return true;

  const userRolesInOrg = organizationRoles
    .filter((r) => {
      if (!orgId) return true;
      const [roleOrgId] = r.split(':');
      return roleOrgId === orgId;
    })
    .map((r) => r.split(':')[1]);

  if (requireAll) {
    return roles.every((r) => userRolesInOrg.includes(r));
  }
  return roles.some((r) => userRolesInOrg.includes(r));
}

export async function runProtected<T>(
  requirements: ProtectedRequirements & {
    userId: string;
  },
  action: () => Promise<T>
): Promise<ProtectedResult<T>> {
  console.log('[RBAC] runProtected called');
  console.log('[RBAC] Requirements:', {
    userId: requirements.userId,
    orgId: requirements.orgId,
    perm: requirements.perm,
    role: requirements.role,
    requireAll: requirements.requireAll,
  });

  try {
    // Get user context for sub match
    const { claims: logtoClaims, isAuthenticated } = await getLogtoContext(logtoConfig);
    
    if (!isAuthenticated || !logtoClaims?.sub) {
      console.warn('[RBAC] Not authenticated or no sub');
      return { ok: false, reason: 'VALIDATION_ERROR', detail: 'Not authenticated' };
    }

    let orgId = requirements.orgId;

    if (orgId === undefined) {
      console.log('[RBAC] No orgId provided, reading from cookie...');
      orgId = await getActiveOrgIdFromCookie();
      console.log('[RBAC] Got orgId from cookie:', orgId);
    }

    const requireAll = requirements.requireAll ?? true;

    // Track results for each check type
    let permPassed = true;
    let rolePassed = true;
    let permError: string | undefined;
    let roleError: string | undefined;

    // === PERMISSION CHECK (JWT/JWKS path) ===
    if (requirements.perm) {
      console.log('[RBAC] Checking permissions (JWT/JWKS path)...');
      try {
        let token: string | null = null;

        // Get org token for permission check
        if (orgId !== null && orgId) {
          console.log('[RBAC] Getting organization token for org:', orgId);
          token = await getOrganizationToken(logtoConfig, orgId);
          console.log('[RBAC] Got org token:', token ? 'yes' : 'no');
        }

        if (!token) {
          console.log('[RBAC] No token for perm check');
          permPassed = false;
          permError = 'MISSING_PERM';
        } else {
          const claims = await validateToken(token);

          console.log('[RBAC] Token validated, checking subject match...');
          console.log('[RBAC] Expected userId:', requirements.userId);
          console.log('[RBAC] Token sub:', claims.sub);

          if (claims.sub !== requirements.userId && claims.sub !== logtoClaims.sub) {
            console.warn('[RBAC] SUBJECT_MISMATCH!');
            permPassed = false;
            permError = 'SUBJECT_MISMATCH';
          } else if (orgId !== null && orgId && claims.orgId !== orgId) {
            console.warn('[RBAC] ORG_MISMATCH!', { expected: orgId, actual: claims.orgId });
            permPassed = false;
            permError = 'ORG_MISMATCH';
          } else {
            console.log('[RBAC] Checking perms...', { required: requirements.perm, requireAll });
            if (!checkPerms(claims.scopes, requirements.perm, requireAll)) {
              console.warn('[RBAC] MISSING_PERM!');
              permPassed = false;
              permError = 'MISSING_PERM';
            }
          }
        }
      } catch (error) {
        console.error('[RBAC] Perm check error:', error);
        permPassed = false;
        permError = error instanceof Error ? error.message : 'Perm validation failed';
      }
    }

    // === ROLE CHECK (OIDC Introspection path) ===
    if (requirements.role) {
      console.log('[RBAC] Checking roles (OIDC Introspection path)...');
      try {
        // Get access token for introspection
        const accessToken = await getAccessToken(logtoConfig);
        if (!accessToken) {
          console.log('[RBAC] No access token for role check');
          rolePassed = false;
          roleError = 'TOKEN_INACTIVE';
        } else {
          const introspection = await introspectTokenWithOrg(accessToken);

          if (!introspection.active) {
            console.warn('[RBAC] Token not active!');
            rolePassed = false;
            roleError = 'TOKEN_INACTIVE';
          } else if (introspection.sub !== requirements.userId && introspection.sub !== logtoClaims.sub) {
            console.warn('[RBAC] SUBJECT_MISMATCH (introspection)!');
            rolePassed = false;
            roleError = 'SUBJECT_MISMATCH';
          } else {
            const organizationRoles = introspection.organization_roles as string[] | undefined;
            console.log('[RBAC] User org roles from introspection:', organizationRoles);

            // If orgId is provided, check the org matches
            if (orgId !== null && orgId) {
              const orgFromIntrospection = introspection.organization_id;
              if (orgFromIntrospection && orgFromIntrospection !== orgId) {
                console.warn('[RBAC] ORG_MISMATCH (introspection)!', { expected: orgId, actual: orgFromIntrospection });
                rolePassed = false;
                roleError = 'ORG_MISMATCH';
              }
            }

            if (rolePassed) {
              console.log('[RBAC] Checking roles...', { required: requirements.role, requireAll });
              if (!checkRoles(organizationRoles, requirements.role, orgId ?? undefined, requireAll)) {
                console.warn('[RBAC] MISSING_ROLE!');
                rolePassed = false;
                roleError = 'MISSING_ROLE';
              }
            }
          }
        }
      } catch (error) {
        console.error('[RBAC] Role check error:', error);
        rolePassed = false;
        roleError = error instanceof Error ? error.message : 'Role validation failed';
      }
    }

    // === COMBINE RESULTS ===
    let finalPass: boolean;
    let finalError: string | undefined;

    if (requirements.perm && requirements.role) {
      // Both provided
      finalPass = requireAll ? (permPassed && rolePassed) : (permPassed || rolePassed);
      if (!finalPass) {
        finalError = !permPassed ? permError : roleError;
      }
    } else if (requirements.perm) {
      finalPass = permPassed;
      finalError = permError;
    } else if (requirements.role) {
      finalPass = rolePassed;
      finalError = roleError;
    } else {
      // No checks requested - allow
      finalPass = true;
    }

    if (!finalPass) {
      console.warn('[RBAC] Final check failed:', finalError);
      return { ok: false, reason: finalError as 'MISSING_PERM' | 'MISSING_ROLE' | 'SUBJECT_MISMATCH' | 'ORG_MISMATCH' | 'TOKEN_INACTIVE' | 'VALIDATION_ERROR' };
    }

    console.log('[RBAC] All checks passed, executing action...');
    const data = await action();
    console.log('[RBAC] Action completed successfully');
    return { ok: true, data };
  } catch (error) {
    console.error('[RBAC] runProtected error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { ok: false, reason: 'VALIDATION_ERROR', detail: message };
  }
}
