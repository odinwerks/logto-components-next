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

// ============================================================================
// Constants
// ============================================================================

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000;

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

async function fetchWithRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  let lastError: Error | unknown = new Error('fetchWithRetry: all retries exhausted');
  
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (isAuthError(error)) {
        console.warn(`[fetchWithRetry] Auth error on attempt ${i + 1}, not retrying:`, error instanceof Error ? error.message : error);
        break;
      }
      if (i < retries - 1) {
        const delay = BASE_DELAY_MS * (i + 1);
        console.log(`[fetchWithRetry] Attempt ${i + 1} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
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
function handleAuthFetchError(error: unknown, label: string): never {
  console.error(`${label}:`, error);
  const msg = error instanceof Error ? error.message : String(error);
  // /api/wipe is POST-only; broken-cookie state gets cleared by sign-in redirect.
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
      // First, ensure we have a valid token (this is a Server Action, can modify cookies)
      // Doing this first may prevent the SDK from triggering a refresh inside getLogtoContext
      await getTokenForServerAction();

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
        avatar: (userInfo.picture as string) || undefined,
        primaryEmail: (userInfo.email as string) || undefined,
        primaryPhone: (userInfo.phone_number as string) || undefined,
        customData: (userInfo.custom_data as Record<string, unknown>) || {},
        identities: (userInfo.identities as Record<string, { userId: string; details?: Record<string, unknown> }>) || {},
        profile: {
          givenName: (userInfo.given_name as string) || undefined,
          familyName: (userInfo.family_name as string) || undefined,
        },
        createdAt: (userInfo.created_at as string | number) || Date.now(),
        updatedAt: (userInfo.updated_at as string | number) || Date.now(),
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
          const [orgId, roleName] = roleStr.split(':');
          return {
            id: roleStr,
            name: roleName || roleStr,
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
    handleAuthFetchError(error, 'Dashboard data fetch error');
  }
  // This is unreachable because handleAuthFetchError always redirects or throws
  return { success: false, needsAuth: true };
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
    handleAuthFetchError(error, 'UserBadge data fetch error');
  }
  // This is unreachable because handleAuthFetchError always redirects or throws
  return { success: false, needsAuth: true };
}
