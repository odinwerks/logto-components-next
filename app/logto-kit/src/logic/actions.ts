'use server';

import { getAccessToken, getLogtoContext } from '@logto/next/server-actions';
import { logtoConfig } from '../../../logto';
import type { DashboardResult, DashboardSuccess, UserData, MfaVerification, MfaType, MfaVerificationPayload } from './types';

// ============================================================================
// Environment Configuration
// ============================================================================

function getCleanEndpoint(): string {
  // Use the already validated and trimmed endpoint from logtoConfig
  const endpoint = logtoConfig.endpoint;
  if (!endpoint) {
    throw new Error(
      'ENDPOINT configuration is missing! ' +
        'Check your .env file and logto.ts configuration.'
    );
  }
  return endpoint.replace(/\/$/, '');
}

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
  const cleanEndpoint = getCleanEndpoint();
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

export async function fetchDashboardData(): Promise<DashboardResult> {
  try {
    const { isAuthenticated } = await getLogtoContext(logtoConfig);
    if (!isAuthenticated) {
      return { success: false, needsAuth: true };
    }

    const token = await getTokenForServerAction();
    const res = await makeRequest('/api/my-account');

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Logto API ${res.status}: ${errorText.substring(0, 200)}`);
    }

    const userData: UserData = await res.json();

    return {
      success: true,
      userData,
      accessToken: token,
    };
  } catch (error) {
    console.error('Dashboard data fetch error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
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
    throw new Error(`Basic info update failed ${res.status}: ${errorText.substring(0, 200)}`);
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
    throw new Error(`Profile update failed ${res.status}: ${errorText.substring(0, 200)}`);
  }
}

export async function updateUserCustomData(customData: Record<string, unknown>): Promise<void> {
  const res = await makeRequest('/api/my-account', {
    method: 'PATCH',
    body: { customData },
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Custom data update failed ${res.status}: ${errorText.substring(0, 200)}`);
  }
}

export async function updateAvatarUrl(avatarUrl: string): Promise<void> {
  const res = await makeRequest('/api/my-account', {
    method: 'PATCH',
    body: { avatar: avatarUrl },
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Avatar update failed ${res.status}: ${errorText.substring(0, 200)}`);
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
    throw new Error(`Password verification failed ${res.status}: ${errorText.substring(0, 200)}`);
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
    throw new Error(`Email verification send failed ${res.status}: ${errorText.substring(0, 200)}`);
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
    throw new Error(`Phone verification send failed ${res.status}: ${errorText.substring(0, 200)}`);
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
    throw new Error(`Verification failed ${res.status}: ${errorText.substring(0, 200)}`);
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
    throw new Error(`Email update failed ${res.status}: ${errorText.substring(0, 200)}`);
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
    throw new Error(`Phone update failed ${res.status}: ${errorText.substring(0, 200)}`);
  }
}

export async function removeUserEmail(identityVerificationRecordId: string): Promise<void> {
  const res = await makeRequest('/api/my-account/primary-email', {
    method: 'DELETE',
    extraHeaders: { 'logto-verification-id': identityVerificationRecordId },
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Email removal failed ${res.status}: ${errorText.substring(0, 200)}`);
  }
}

export async function removeUserPhone(identityVerificationRecordId: string): Promise<void> {
  const res = await makeRequest('/api/my-account/primary-phone', {
    method: 'DELETE',
    extraHeaders: { 'logto-verification-id': identityVerificationRecordId },
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Phone removal failed ${res.status}: ${errorText.substring(0, 200)}`);
  }
}

// ============================================================================
// MFA Management Actions
// ============================================================================

export async function getMfaVerifications(): Promise<MfaVerification[]> {
  const res = await makeRequest('/api/my-account/mfa-verifications');
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Get MFA verifications failed ${res.status}: ${errorText.substring(0, 200)}`);
  }

  return res.json();
}

export async function generateTotpSecret(): Promise<{ secret: string; secretQrCode: string }> {
  const res = await makeRequest('/api/my-account/mfa-verifications/totp-secret/generate', {
    method: 'POST',
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Generate TOTP secret failed ${res.status}: ${errorText.substring(0, 200)}`);
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
    throw new Error(`Add MFA verification failed ${res.status}: ${errorText.substring(0, 200)}`);
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
    throw new Error(`Delete MFA verification failed ${res.status}: ${errorText.substring(0, 200)}`);
  }
}

export async function generateBackupCodes(identityVerificationRecordId: string): Promise<{ codes: string[] }> {
  const res = await makeRequest('/api/my-account/mfa-verifications/backup-codes/generate', {
    method: 'POST',
    extraHeaders: { 'logto-verification-id': identityVerificationRecordId },
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Generate backup codes failed ${res.status}: ${errorText.substring(0, 200)}`);
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
    throw new Error(`Get backup codes failed ${res.status}: ${errorText.substring(0, 200)}`);
  }

  return res.json();
}
