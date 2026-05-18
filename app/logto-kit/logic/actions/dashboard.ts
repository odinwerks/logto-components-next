'use server';

import 'server-only';

import { getLogtoContext } from '@logto/next/server-actions';
import type { DashboardResult, DashboardSuccess, UserData } from '../types';
import { getLogtoConfig } from '../../../logto';
import { getCleanEndpoint } from '../utils';
import { debugLog } from '../debug';
import { getTokenForServerAction } from './tokens';
import { makeRequest } from './request';
import { throwOnApiError } from '../errors';
import { redirect } from 'next/navigation';
import { warn, error, log } from '../log';

// ============================================================================
// Constants
// ============================================================================

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

const AUTH_ERROR_PATTERNS = [
  'Cookies can only be modified',
  'Unauthorized',
  '401',
  'needsAuth',
];

// ============================================================================
// Helper Functions
// ============================================================================

function isAuthError(error: unknown): boolean {
  if (error instanceof Error) {
    return AUTH_ERROR_PATTERNS.some(p => error.message.includes(p));
  }
  return false;
}

const TRANSIENT_ERROR_PATTERNS = [
  '429', '500', '502', '503', '504',
  'fetch failed', 'ECONNREFUSED', 'ETIMEDOUT', 'ECONNRESET',
];

function isTransientError(error: unknown): boolean {
  if (error instanceof Error) {
    return TRANSIENT_ERROR_PATTERNS.some(p => error.message.includes(p));
  }
  return false;
}

async function fetchWithTimeout<T>(fn: () => Promise<T>, timeoutMs = 10_000): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out')), timeoutMs)
    ),
  ]);
}

async function fetchWithRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  let lastError: Error | unknown = new Error('fetchWithRetry: all retries exhausted');
  
  for (let i = 0; i < retries; i++) {
    try {
      return await fetchWithTimeout(fn);
    } catch (error) {
      lastError = error;
      if (isAuthError(error)) {
        warn(`[fetchWithRetry] Auth error on attempt ${i + 1}, not retrying:`, error instanceof Error ? error.message : error);
        break;
      }
      if (i < retries - 1 && isTransientError(error)) {
        const delay = BASE_DELAY_MS * (i + 1);
        log(`[fetchWithRetry] Transient error on attempt ${i + 1}, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        if (!isTransientError(error)) {
          warn(`[fetchWithRetry] Non-transient error on attempt ${i + 1}, not retrying:`, error instanceof Error ? error.message : error);
        }
        break;
      }
    }
  }
  
  throw lastError;
}

/**
 * Handles authentication fetch errors by redirecting to sign-in or wiping cookies.
 * @param error - The error that occurred.
 * @param label - A label for error context.
 */
function handleAuthFetchError(err: unknown, label: string): never {
  error(`${label}:`, err);
  const msg = err instanceof Error ? err.message : String(err);
  // Stale cookies → redirect to sign-in for fresh authentication.
  if (msg.includes('Cookies can only be modified')) redirect('/api/auth/sign-in');
  redirect('/api/auth/sign-in');
}

// ============================================================================
// Dashboard Data Fetching
// ============================================================================

/**
 * Fetches dashboard data for the authenticated user.
 * Used in RSC (React Server Components).
 * @returns DashboardResult containing user data (no access token — kept server-side).
 */
export async function fetchDashboardData(): Promise<DashboardResult> {
  try {
    const result = await fetchWithRetry(async (): Promise<DashboardSuccess> => {
      // Removed redundant getTokenForServerAction() — getLogtoContext handles refresh internally
      const { claims, userInfo } = await getLogtoContext(getLogtoConfig(), { fetchUserInfo: true });

      if (!claims?.sub) {
        return { success: false, needsAuth: true } as any;
      }

      if (!userInfo) {
        throw new Error('Failed to fetch user info');
      }


      // Extract activeOrgId from customData.Preferences.asOrg
      const customData = userInfo.custom_data as Record<string, unknown> | undefined;
      const prefs = customData?.Preferences as { asOrg?: string | null } | undefined;
      const activeOrgId = prefs?.asOrg ?? undefined;

      // Map OIDC response to UserData format
      const userData: UserData = {
        id: claims.sub!,
        name: (userInfo.name as string) || undefined,
        username: (userInfo.username as string) || undefined,
        avatar: (userInfo.picture as string) || undefined,
        primaryEmail: (userInfo.email as string) || undefined,
        primaryPhone: (userInfo.phone_number as string) || undefined,
        customData: (userInfo.custom_data as Record<string, unknown>) || {},
        identities: (userInfo.identities as Record<string, { userId: string; details?: Record<string, unknown> }>) || {},
        profile: {
          givenName: (userInfo.given_name as string) || undefined,
          familyName: (userInfo.family_name as string) || undefined,
        },
        createdAt: (userInfo.created_at as string | number) || undefined,
        updatedAt: (userInfo.updated_at as string | number) || undefined,
        lastSignInAt: (userInfo.last_sign_in_at as string | number) || undefined,

        // Organization data from userInfo — use organization_data if available, otherwise fall back to IDs
        organizations: (() => {
          const orgData = userInfo?.organization_data as Array<{ id: string; name: string }> | undefined;
          return orgData
            ? orgData.map(org => ({ id: org.id, name: org.name }))
            : (userInfo?.organizations as string[] || []).map(orgId => ({ id: orgId, name: orgId }));
        })(),

        // Organization roles from userInfo (format: "org_id:role_name")
        organizationRoles: (userInfo?.organization_roles as string[] || []).map(roleStr => {
          const [orgId, ...rest] = roleStr.split(':');
          const roleName = rest.join(':') || roleStr;
          return {
            id: roleStr,
            name: roleName,
            organizationId: orgId || '',
          };
        }),

        // Organization permissions will be loaded separately when needed
        organizationPermissions: [],
      };

      return {
        success: true,
        userData,
        activeOrgId,
      };
    });

    return result;
  } catch (error) {
    if (isAuthError(error)) {
      handleAuthFetchError(error, 'Dashboard data fetch error');
    }
    // For non-auth errors, return a fetch error instead of redirecting
    warn('[fetchDashboardData] Non-auth error:', error instanceof Error ? error.message : error);
    return { success: false, error: 'FETCH_FAILED' };
  }
}

// ============================================================================
// Lightweight User Data Fetch (For UserButton/UserBadge standalone usage)
// ============================================================================

/**
 * Fetches lightweight user data for UserBadge component.
 * @returns DashboardResult containing user data (no access token — kept server-side).
 */
export async function fetchUserBadgeData(): Promise<DashboardResult> {
  try {
    const result = await fetchWithRetry(async (): Promise<DashboardSuccess> => {
      const res = await makeRequest('/api/my-account');

      await throwOnApiError(res, 'FETCH_FAILED', 'dashboard-fetch');

      return {
        success: true,
        userData: await res.json() as UserData,
      };
    });

    return result;
  } catch (error) {
    if (isAuthError(error)) {
      handleAuthFetchError(error, 'UserBadge data fetch error');
    }
    // For non-auth errors, return a fetch error instead of redirecting
    warn('[fetchUserBadgeData] Non-auth error:', error instanceof Error ? error.message : error);
    return { success: false, error: 'FETCH_FAILED' };
  }
}
