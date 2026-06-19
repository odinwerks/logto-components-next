import 'server-only';

import { getLogtoContext } from '@logto/next/server-actions';
import type { DashboardResult, UserData } from './types';
import { getLogtoConfig } from '../config';
import { isAuthError, isTransientError } from './errors';
import { redirect } from 'next/navigation';
import { warn, error, log } from './log';

// ============================================================================
// Constants
// ============================================================================

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

// ============================================================================
// Helper Functions
// ============================================================================

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
    } catch (err) {
      lastError = err;
      if (isAuthError(err)) {
        warn(`[fetchWithRetry] Auth error on attempt ${i + 1}, not retrying:`, err instanceof Error ? err.message : err);
        break;
      }
      if (i < retries - 1 && isTransientError(err)) {
        const delay = BASE_DELAY_MS * (i + 1);
        log(`[fetchWithRetry] Transient error on attempt ${i + 1}, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        if (!isTransientError(err)) {
          warn(`[fetchWithRetry] Non-transient error on attempt ${i + 1}, not retrying:`, err instanceof Error ? err.message : err);
        }
        break;
      }
    }
  }

  throw lastError;
}

/**
 * Handles authentication fetch errors by redirecting to sign-in.
 * @param err - The error that occurred.
 * @param label - A label for error context.
 */
function handleAuthFetchError(err: unknown, label: string): never {
  error(`${label}:`, err);
  redirect('/api/auth/sign-in');
}

// ============================================================================
// Dashboard Data Core (plain async function — safe to wrap with React.cache)
// ============================================================================

/**
 * Core implementation of dashboard data fetching.
 * This is a plain `server-only` module function (NOT a Server Action).
 * It is safe to wrap with `React.cache()` for per-request deduplication.
 *
 * @param opts.tolerateAuthErrors - When true, auth errors return `{ success: false, needsAuth: true }`
 *   instead of redirecting. Use in layouts that render for both authenticated and
 *   unauthenticated users (e.g., root layout, public pages).
 * @returns DashboardResult containing user data (no access token - kept server-side).
 */
export async function fetchDashboardDataCore(
  opts?: { tolerateAuthErrors?: boolean },
): Promise<DashboardResult> {
  const tolerateAuthErrors = opts?.tolerateAuthErrors ?? false;
  try {
    const result = await fetchWithRetry(async (): Promise<DashboardResult> => {
      // Removed redundant getTokenForServerAction() - getLogtoContext handles refresh internally
      const { claims, userInfo } = await getLogtoContext(getLogtoConfig(), { fetchUserInfo: true });

      if (!claims?.sub) {
        return { success: false, needsAuth: true };
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
      // BUG-M08: Allowlist only safe display fields from identity.details.
      // Strip all other fields (tokens, raw_data, etc.) that Logto may include.
      // Fields used by identityDetail() in identities.tsx: email, username, name, login.
      identities: Object.fromEntries(
        Object.entries(
          (userInfo.identities as Record<string, { userId?: string; details?: Record<string, unknown> }>) || {}
        ).map(([provider, identity]) => {
          const raw = identity?.details ?? {};
          const safeDetails: Record<string, unknown> = {};
          const SAFE_DETAIL_KEYS = ['userId', 'email', 'username', 'name', 'login'] as const;
          for (const key of SAFE_DETAIL_KEYS) {
            if (key in raw) safeDetails[key] = raw[key];
          }
          return [provider, {
            userId: identity?.userId ?? '',
            details: safeDetails,
          }];
        })
      ),
        profile: {
          givenName: (userInfo.given_name as string) || undefined,
          familyName: (userInfo.family_name as string) || undefined,
        },
        createdAt: (userInfo.created_at as string | number) || undefined,
        updatedAt: (userInfo.updated_at as string | number) || undefined,
        lastSignInAt: (userInfo.last_sign_in_at as string | number) || undefined,

        // Organization data from userInfo - use organization_data if available, otherwise fall back to IDs
        organizations: (() => {
          const orgData = userInfo?.organization_data as Array<{ id: string; name: string; description?: string }> | undefined;
          return orgData
            ? orgData.map(org => ({ id: org.id, name: org.name, description: org.description }))
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
  } catch (err) {
    if (isAuthError(err)) {
      if (tolerateAuthErrors) {
        // In auth-tolerant mode (e.g., root layout for public pages), return needsAuth
        // instead of redirecting so the page can render in anonymous mode.
        warn('[fetchDashboardDataCore] Auth error tolerated (anonymous mode):', err instanceof Error ? err.message : err);
        return { success: false, needsAuth: true };
      }
      handleAuthFetchError(err, 'Dashboard data fetch error');
    }
    // For non-auth errors, return a fetch error instead of redirecting
    warn('[fetchDashboardDataCore] Non-auth error:', err instanceof Error ? err.message : err);
    return { success: false, error: 'FETCH_FAILED' };
  }
}
