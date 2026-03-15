'use server';

import { getAccessToken } from '@logto/next/server-actions';
import * as Minio from 'minio';
import { redirect } from 'next/navigation';
import { logtoConfig, getManagementApiToken } from '../../logto';
import type { DashboardResult, DashboardSuccess, UserData, MfaVerification, MfaType, MfaVerificationPayload } from './types';
import { getCleanEndpoint, truncateError, introspectToken, assertSafeUserId } from './utils';

// ============================================================================
// Environment Configuration
// ============================================================================

// getCleanEndpoint is now imported from ./utils

// ============================================================================
// Token Helper - ONLY used in Server Actions
// ============================================================================

async function getTokenForServerAction(): Promise<string> {
  const token = await getAccessToken(logtoConfig, '');
  if (!token) throw new Error('No access token available for Account API');
  return token;
}

// ============================================================================
// Request Helper
// ============================================================================

async function makeRequest(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
    body?: unknown;
    extraHeaders?: Record<string, string>;
  } = {}
): Promise<Response> {
  const token = await getTokenForServerAction();
  const cleanEndpoint = await getCleanEndpoint();
  const url = `${cleanEndpoint}${path.startsWith('/') ? '' : '/'}${path}`;
  
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...(options.body !== undefined && { 'Content-Type': 'application/json' }),
    ...options.extraHeaders,
  };
  
  return fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

// ============================================================================
// Dashboard Data Fetching (Used in RSC)
// ============================================================================

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000;

async function fetchWithRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  let lastError: Error | unknown = new Error('fetchWithRetry: all retries exhausted');
  
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < retries - 1) {
        const delay = BASE_DELAY_MS * (i + 1);
        console.log(`[fetchWithRetry] Attempt ${i + 1} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

export async function fetchDashboardData(): Promise<DashboardResult> {
  try {
    const result = await fetchWithRetry(async (): Promise<DashboardSuccess> => {
      // Always use global token - org context is managed via customData
      const token = await getTokenForServerAction();

      // Use /oidc/me for reading user data (single request for all user info including orgs)
      const cleanEndpoint = await getCleanEndpoint();
      const res = await fetch(`${cleanEndpoint}/oidc/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Logto OIDC ${res.status}: ${await truncateError(errorText)}`);
      }

      const userInfo = await res.json();

      // Extract activeOrgId from customData.Preferences.asOrg
      const customData = userInfo.custom_data as Record<string, unknown> | undefined;
      const prefs = customData?.Preferences as { asOrg?: string | null } | undefined;
      const activeOrgId = prefs?.asOrg ?? undefined;

      // Map OIDC response to UserData format
      const userData: UserData = {
        id: userInfo.sub,
        name: userInfo.name,
        avatar: userInfo.picture,
        primaryEmail: userInfo.email,
        primaryPhone: userInfo.phone_number,
        customData: userInfo.custom_data || {},
        identities: userInfo.identities || {},
        profile: {
          givenName: userInfo.given_name,
          familyName: userInfo.family_name,
        },
        createdAt: userInfo.created_at || Date.now(),
        updatedAt: userInfo.updated_at || Date.now(),
        lastSignInAt: userInfo.last_sign_in_at,
        // Organization data from OIDC
        organizations: userInfo.organization_data?.map((org: { id: string; name: string }) => ({
          id: org.id,
          name: org.name,
        })) || [],
        organizationRoles: userInfo.organization_roles?.map((roleStr: string) => {
          const [organizationId, name] = roleStr.split(':');
          return { id: roleStr, organizationId, name: name || roleStr };
        }) || [],
      };

      return {
        success: true,
        userData,
        accessToken: token,
        activeOrgId,
      };
    });

    return result;
  } catch (error) {
    console.error('Dashboard data fetch error:', error);
    
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    // Stale cookie error → wipe cookies and let user retry (real session is still valid)
    if (errorMsg.includes('Cookies can only be modified')) {
      redirect('/api/wipe');
    }
    
    // All other errors → redirect to sign-in
      redirect('/api/auth/sign-in');
  }
}

// ============================================================================
// Lightweight User Data Fetch (For UserButton/UserBadge standalone usage)
// ============================================================================

export async function fetchUserBadgeData(): Promise<DashboardResult> {
  try {
    const result = await fetchWithRetry(async (): Promise<DashboardSuccess> => {
      const token = await getTokenForServerAction();
      const res = await makeRequest('/api/my-account');

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Logto API ${res.status}: ${await truncateError(errorText)}`);
      }

      return {
        success: true,
        userData: await res.json() as UserData,
        accessToken: token,
      };
    });

    return result;
  } catch (error) {
    console.error('UserBadge data fetch error:', error);
    
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    if (errorMsg.includes('Cookies can only be modified')) {
      redirect('/api/wipe');
    }
    
    redirect('/api/auth/sign-in');
  }
}

// ============================================================================
// Authentication Actions
// ============================================================================

export async function signOutUser(): Promise<void> {
  const { signOut } = await import('@logto/next/server-actions');
  await signOut(logtoConfig);
}

// ============================================================================
// Profile Management Actions
// ============================================================================

export async function updateUserBasicInfo(updates: {
  name?: string;
  username?: string;
  avatar?: string;
}): Promise<void> {
  const cleanUpdates = Object.fromEntries(
    Object.entries(updates).filter(([_, v]) => v !== undefined && v !== '')
  );

  if (Object.keys(cleanUpdates).length === 0) return;

  const res = await makeRequest('/api/my-account', {
    method: 'PATCH',
    body: cleanUpdates,
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Basic info update failed ${res.status}: ${await truncateError(errorText)}`);
  }
}

export async function updateUserProfile(profile: {
  givenName?: string;
  familyName?: string;
}): Promise<void> {
  const res = await makeRequest('/api/my-account/profile', {
    method: 'PATCH',
    body: profile,
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Profile update failed ${res.status}: ${await truncateError(errorText)}`);
  }
}

export async function updateUserCustomData(customData: Record<string, unknown>): Promise<void> {
  const res = await makeRequest('/api/my-account', {
    method: 'PATCH',
    body: { customData },
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Custom data update failed ${res.status}: ${await truncateError(errorText)}`);
  }
}

export async function updateAvatarUrl(avatarUrl: string): Promise<void> {
  const res = await makeRequest('/api/my-account', {
    method: 'PATCH',
    body: { avatar: avatarUrl || null },
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Avatar update failed ${res.status}: ${await truncateError(errorText)}`);
  }
}

// ============================================================================
// Verification Actions
// ============================================================================

export async function verifyPasswordForIdentity(password: string): Promise<{ verificationRecordId: string }> {
  const res = await makeRequest('/api/verifications/password', {
    method: 'POST',
    body: { password },
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Password verification failed ${res.status}: ${await truncateError(errorText)}`);
  }
  
  const parsed = await res.json();
  if (!parsed.verificationRecordId) {
    throw new Error(`API didn't return verificationRecordId. Got: ${JSON.stringify(parsed)}`);
  }
  
  return { verificationRecordId: parsed.verificationRecordId };
}

export async function sendEmailVerificationCode(email: string): Promise<{ verificationId: string }> {
  const res = await makeRequest('/api/verifications/verification-code', {
    method: 'POST',
    body: { identifier: { type: 'email', value: email } },
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Email verification send failed ${res.status}: ${await truncateError(errorText)}`);
  }
  
  const parsed = await res.json();
  if (!parsed.verificationRecordId) {
    throw new Error(`API didn't return verificationRecordId. Got: ${JSON.stringify(parsed)}`);
  }
  
  return { verificationId: parsed.verificationRecordId };
}

export async function sendPhoneVerificationCode(phone: string): Promise<{ verificationId: string }> {
  const res = await makeRequest('/api/verifications/verification-code', {
    method: 'POST',
    body: { identifier: { type: 'phone', value: phone } },
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Phone verification send failed ${res.status}: ${await truncateError(errorText)}`);
  }
  
  const parsed = await res.json();
  if (!parsed.verificationRecordId) {
    throw new Error(`API didn't return verificationRecordId. Got: ${JSON.stringify(parsed)}`);
  }
  
  return { verificationId: parsed.verificationRecordId };
}

export async function verifyVerificationCode(
  type: 'email' | 'phone',
  value: string,
  verificationId: string,
  code: string
): Promise<{ verificationRecordId: string }> {
  const res = await makeRequest('/api/verifications/verification-code/verify', {
    method: 'POST',
    body: { identifier: { type, value }, verificationId, code },
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Verification failed ${res.status}: ${await truncateError(errorText)}`);
  }
  
  const parsed = await res.json();
  if (!parsed.verificationRecordId) {
    throw new Error(`API didn't return verificationRecordId. Got: ${JSON.stringify(parsed)}`);
  }
  
  return { verificationRecordId: parsed.verificationRecordId };
}

// ============================================================================
// Contact Information Updates (Require Verification)
// ============================================================================

export async function updateEmailWithVerification(
  email: string | null,
  newIdentifierVerificationRecordId: string,
  identityVerificationRecordId: string
): Promise<void> {
  const res = await makeRequest('/api/my-account/primary-email', {
    method: 'POST',
    body: { email, newIdentifierVerificationRecordId },
    extraHeaders: { 'logto-verification-id': identityVerificationRecordId },
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Email update failed ${res.status}: ${await truncateError(errorText)}`);
  }
}

export async function updatePhoneWithVerification(
  phone: string,
  newIdentifierVerificationRecordId: string,
  identityVerificationRecordId: string
): Promise<void> {
  const res = await makeRequest('/api/my-account/primary-phone', {
    method: 'POST',
    body: { phone, newIdentifierVerificationRecordId },
    extraHeaders: { 'logto-verification-id': identityVerificationRecordId },
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Phone update failed ${res.status}: ${await truncateError(errorText)}`);
  }
}

export async function removeUserEmail(identityVerificationRecordId: string): Promise<void> {
  const res = await makeRequest('/api/my-account/primary-email', {
    method: 'DELETE',
    extraHeaders: { 'logto-verification-id': identityVerificationRecordId },
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Email removal failed ${res.status}: ${await truncateError(errorText)}`);
  }
}

export async function removeUserPhone(identityVerificationRecordId: string): Promise<void> {
  const res = await makeRequest('/api/my-account/primary-phone', {
    method: 'DELETE',
    extraHeaders: { 'logto-verification-id': identityVerificationRecordId },
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Phone removal failed ${res.status}: ${await truncateError(errorText)}`);
  }
}

// ============================================================================
// MFA Management Actions
// ============================================================================

export async function getMfaVerifications(): Promise<MfaVerification[]> {
  const res = await makeRequest('/api/my-account/mfa-verifications');
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Get MFA verifications failed ${res.status}: ${await truncateError(errorText)}`);
  }

  return res.json();
}

export async function generateTotpSecret(): Promise<{ secret: string; secretQrCode: string }> {
  const res = await makeRequest('/api/my-account/mfa-verifications/totp-secret/generate', {
    method: 'POST',
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Generate TOTP secret failed ${res.status}: ${await truncateError(errorText)}`);
  }

  return res.json();
}

export async function addMfaVerification(
  verification: MfaVerificationPayload,
  identityVerificationRecordId: string
): Promise<void> {
  const { type, payload } = verification;
  const res = await makeRequest('/api/my-account/mfa-verifications', {
    method: 'POST',
    body: { type, ...payload },
    extraHeaders: { 'logto-verification-id': identityVerificationRecordId },
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Add MFA verification failed ${res.status}: ${await truncateError(errorText)}`);
  }
}

export async function deleteMfaVerification(
  verificationId: string,
  identityVerificationRecordId: string
): Promise<void> {
  const res = await makeRequest(`/api/my-account/mfa-verifications/${verificationId}`, {
    method: 'DELETE',
    extraHeaders: { 'logto-verification-id': identityVerificationRecordId },
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Delete MFA verification failed ${res.status}: ${await truncateError(errorText)}`);
  }
}

export async function generateBackupCodes(identityVerificationRecordId: string): Promise<{ codes: string[] }> {
  const res = await makeRequest('/api/my-account/mfa-verifications/backup-codes/generate', {
    method: 'POST',
    extraHeaders: { 'logto-verification-id': identityVerificationRecordId },
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Generate backup codes failed ${res.status}: ${await truncateError(errorText)}`);
  }

  return res.json();
}

export async function getBackupCodes(
  identityVerificationRecordId: string
): Promise<{ codes: Array<{ code: string; usedAt: string | null }> }> {
  const res = await makeRequest('/api/my-account/mfa-verifications/backup-codes', {
    extraHeaders: { 'logto-verification-id': identityVerificationRecordId },
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Get backup codes failed ${res.status}: ${await truncateError(errorText)}`);
  }

  return res.json();
}

// ============================================================================
// Password Management Actions
// ============================================================================

/**
 * Changes the authenticated user's password.
 *
 * Flow:
 *   1. Obtain a verificationRecordId via `verifyPasswordForIdentity` (current
 *      password) or the email/phone verification code flow.
 *   2. Pass that ID + the desired new password here.
 *
 * The new password must satisfy the policy configured in
 * Console > Security > Password policy. Logto returns structured validation
 * errors on failure — the thrown message is UI-safe.
 */
export async function updateUserPassword(
  newPassword: string,
  identityVerificationRecordId: string
): Promise<void> {
  const res = await makeRequest('/api/my-account/password', {
    method: 'POST',
    body: { password: newPassword },
    extraHeaders: { 'logto-verification-id': identityVerificationRecordId },
  });

  if (!res.ok) {
    const errorText = await res.text();
    let detail = errorText.substring(0, 400);
    try {
      const parsed = JSON.parse(errorText);
      if (parsed?.message) detail = parsed.message;
    } catch {
      // not JSON, use raw text
    }
    throw new Error(`Password update failed ${res.status}: ${detail}`);
  }
}

// ============================================================================
// Account Deletion Actions
// ============================================================================

/**
 * Permanently deletes the currently authenticated user's account.
 *
 * The Logto Account API has no self-delete endpoint — deletion goes through
 * the Management API. `getManagementApiToken` in logto.ts handles the
 * client-credentials grant so this action stays clean.
 *
 * Flow:
 *   1. Confirms the session is valid and reads `userId` from claims.
 *   2. Verifies the Account API still accepts the bearer token.
 *   3. Calls `getManagementApiToken()` from logto.ts.
 *   4. Deletes the user via `DELETE /api/users/{userId}`.
 *
 * IMPORTANT: This action deliberately does NOT call signOut() or redirect().
 * Calling signOut() inside a server action fires Next.js redirect() which races
 * with AuthWatcher's router.refresh() interval — the result is a cascade of
 * "failed to fetch" errors as AuthWatcher keeps hitting a torn-down session.
 *
 * Instead, this action returns cleanly and the CLIENT navigates to
 * /api/auth/sign-out via window.location.href. That route handler calls
 * signOut() in isolation, with no concurrent RSC re-renders in flight.
 */
export async function deleteUserAccount(
  identityVerificationRecordId: string,
  accessToken: string,
): Promise<void> {
  // This is a server action - proxy handles auth, we just need user ID from API
  // ── Step 1: get user data to find userId ────────────────────────────────
  const accountCheck = await makeRequest('/api/my-account');
  if (!accountCheck.ok) {
    throw new Error('Could not verify account session before deletion.');
  }

  const userData = await accountCheck.json();
  const userId = userData.id;

  if (!userId) {
    throw new Error('User ID not found.');
  }

  // ── Step 2: validate user token via introspection ────────────────────────
  await validateUserToken(accessToken, userId);

  // ── Step 3: get Management API token (M2M, lives in logto.ts) ────────────
  const mgmtToken = await getManagementApiToken();
  const cleanEndpoint = await getCleanEndpoint();

  // ── Step 4: delete via Management API ────────────────────────────────────
  const deleteRes = await fetch(`${cleanEndpoint}/api/users/${userId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${mgmtToken}`,
    },
  });

  if (!deleteRes.ok) {
    const errorText = await deleteRes.text();
    throw new Error(
      `Account deletion failed ${deleteRes.status}: ${await truncateError(errorText)}`
    );
  }

  // Return cleanly. The client (security.tsx handleDeleteAccount) is
  // responsible for navigating to /api/auth/sign-out after this resolves.
}

// ============================================================================
// Avatar Upload Functions
// ============================================================================

interface OidcIntrospectionResponse {
  active: boolean
  sub?: string
  client_id?: string
  exp?: number
  iat?: number
  iss?: string
  scope?: string
  token_type?: string
  organization_id?: string
  organization_roles?: string[]
}

async function uploadViaSupabase(
  bucket: string,
  key: string,
  bytes: Buffer,
  contentType: string,
): Promise<void> {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const rawEndpoint = process.env.S3_ENDPOINT;

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set.');
  }
  if (!rawEndpoint) throw new Error('S3_ENDPOINT is not set.');

  const restBase = rawEndpoint.replace(/\/s3\/?$/, '')
  const uploadUrl = `${restBase}/object/${bucket}/${key}`

  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=0, must-revalidate',
      'x-upsert': 'true',
    },
    body: bytes as unknown as BodyInit,
    cache: 'no-store',
  })

  if (!res.ok) {
    const body = await res.text().catch(() => res.statusText)
    throw new Error(`Supabase upload failed (HTTP ${res.status}): ${body}`)
  }
}

async function uploadViaMinIO(
  bucket: string,
  key: string,
  bytes: Buffer,
  contentType: string,
): Promise<void> {
  const accessKey = process.env.S3_ACCESS_KEY_ID
  const secretKey = process.env.S3_SECRET_ACCESS_KEY
  const rawEndpoint = process.env.S3_ENDPOINT

  if (!accessKey || !secretKey) {
    throw new Error('Set S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY.')
  }
  if (!rawEndpoint) throw new Error('S3_ENDPOINT is not set.')

  const parsed = new URL(rawEndpoint)
  const useSSL = parsed.protocol === 'https:'
  const endPoint = parsed.hostname
  const port = parsed.port ? parseInt(parsed.port, 10) : useSSL ? 443 : 80

  const minio = new Minio.Client({
    endPoint,
    port,
    useSSL,
    accessKey,
    secretKey,
    region: process.env.S3_REGION ?? 'auto',
  })

  await minio.putObject(bucket, key, bytes, bytes.length, {
    'Content-Type': contentType,
    'Cache-Control': 'public, max-age=0, must-revalidate',
  })
}

// introspectToken and assertSafeUserId are now imported from ./utils

async function validateUserToken(accessToken: string, userId: string): Promise<void> {
  await assertSafeUserId(userId);
  
  const introspection = await introspectToken(accessToken);
  
  if (!introspection.active) {
    throw new Error('UNAUTHORIZED: token is not active or has been revoked.');
  }
  
  if (introspection.sub !== userId) {
    throw new Error('UNAUTHORIZED: token subject does not match the provided userId.');
  }
}

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const
const MAX_BYTES = 2 * 1024 * 1024

export async function uploadAvatar(
  formData: FormData,
): Promise<{ url: string }> {
  const file = formData.get('file') as File | null
  const accessToken = formData.get('accessToken') as string | null
  const userId = formData.get('userId') as string | null

  if (!file || !accessToken || !userId) {
    throw new Error('Bad request — file, accessToken, and userId are all required.')
  }

  if (!(ALLOWED_MIME as readonly string[]).includes(file.type)) {
    throw new Error(`Invalid file type "${file.type}". Allowed: ${ALLOWED_MIME.join(', ')}.`)
  }

  if (file.size > MAX_BYTES) {
    throw new Error(`File is ${(file.size / 1024 / 1024).toFixed(2)} MB — limit is 2 MB.`)
  }

  await validateUserToken(accessToken, userId);

  const bucket = process.env.S3_BUCKET_NAME
  if (!bucket) throw new Error('S3_BUCKET_NAME is not set.')

  const key = `${userId}/you.png`
  const bytes = Buffer.from(await file.arrayBuffer())

  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    await uploadViaSupabase(bucket, key, bytes, file.type)
  } else {
    await uploadViaMinIO(bucket, key, bytes, file.type)
  }

  const publicBase = process.env.S3_PUBLIC_URL?.replace(/\/$/, '')
  if (!publicBase) {
    throw new Error(
      'S3_PUBLIC_URL is not set. It must be the public-facing base URL for ' +
        'reading objects — NOT the S3 API endpoint.',
    )
  }

  return { url: `${publicBase}/${key}?v=${Date.now()}` }
}

// ============================================================================
// Reusable Introspection (for RBAC)
// ============================================================================

export async function introspectTokenWithOrg(
  token: string,
): Promise<OidcIntrospectionResponse> {
  return introspectToken(token);
}