'use server';

import { assertSafeLogtoId, assertPasskeyName } from '../guards';
import { ValidationError } from '../validation';
import { makeRequest } from './request';
import { throwOnApiError } from '../errors';
import { getTokenForServerAction } from './tokens';
import { introspectToken } from '../utils';

/**
 * Step 1 of WebAuthn registration: requests registration options from Logto.
 * @returns Registration options (for @simplewebauthn/browser) and a verificationRecordId.
 */
export async function requestWebAuthnRegistration(): Promise<{
  registrationOptions: unknown;
  verificationRecordId: string;
}> {
  const res = await makeRequest('/api/verifications/web-authn/registration', {
    method: 'POST',
  });

  await throwOnApiError(res, 'MFA_ENROLL_FAILED', 'webauthn-registration-options');

  const data = await res.json();

  if (!data || typeof data.verificationRecordId !== 'string' || !data.registrationOptions || typeof data.registrationOptions !== 'object') {
    throw new Error('MFA_ENROLL_FAILED');
  }

  return {
    registrationOptions: data.registrationOptions,
    verificationRecordId: data.verificationRecordId,
  };
}

/**
 * Steps 2 and 3 of WebAuthn registration:
 *   1. Sends the browser ceremony result to Logto to verify the registration.
 *   2. Links the verified passkey to the user's account.
 *
 * @param payload - The RegistrationResponseJSON returned by @simplewebauthn/browser.
 * @param verificationRecordId - From requestWebAuthnRegistration().
 * @param identityVerificationRecordId - From verifyPasswordForIdentity().
 */
export async function verifyAndLinkWebAuthn(
  payload: unknown,
  verificationRecordId: string,
  identityVerificationRecordId: string,
): Promise<void> {
  assertSafeLogtoId(verificationRecordId, 'verificationRecordId');
  assertSafeLogtoId(identityVerificationRecordId, 'identityVerificationRecordId');

  if (!payload || typeof payload !== 'object') {
    throw new ValidationError('INVALID_INPUT', 'payload');
  }

  // Step 2: verify the browser ceremony result
  const verifyRes = await makeRequest('/api/verifications/web-authn/registration/verify', {
    method: 'POST',
    body: { payload, verificationRecordId },
  });

  await throwOnApiError(verifyRes, 'MFA_ENROLL_FAILED', 'webauthn-verify');

  // Step 3: link the passkey to the user's account
  const linkRes = await makeRequest('/api/my-account/mfa-verifications', {
    method: 'POST',
    body: { type: 'WebAuthn', newIdentifierVerificationRecordId: verificationRecordId },
    extraHeaders: { 'logto-verification-id': identityVerificationRecordId },
  });

  await throwOnApiError(linkRes, 'MFA_ENROLL_FAILED', 'webauthn-link');

  // Audit (best-effort — failure must not break the main action)
  try {
    const { audit } = await import('../audit');
    const _token = await getTokenForServerAction();
    const _intro = await introspectToken(_token);
    await audit({ actor: _intro.sub ?? 'unknown', action: 'mfa.webauthn.enroll' });
  } catch { /* audit is best-effort; never surface to caller */ }
}

/**
 * Renames a passkey.
 *
 * @param verificationId - The MFA verification ID of the passkey to rename.
 * @param name - The new display name (1–64 chars, no control characters).
 * @param identityVerificationRecordId - From verifyPasswordForIdentity().
 */
export async function renamePasskey(
  verificationId: string,
  name: string,
  identityVerificationRecordId: string,
): Promise<void> {
  assertSafeLogtoId(verificationId, 'verificationId');
  assertSafeLogtoId(identityVerificationRecordId, 'identityVerificationRecordId');
  const trimmedName = typeof name === 'string' ? name.trim() : name;
  assertPasskeyName(trimmedName);

  const res = await makeRequest(
    `/api/my-account/mfa-verifications/${encodeURIComponent(verificationId)}/name`,
    {
      method: 'PATCH',
      body: { name: trimmedName },
      extraHeaders: { 'logto-verification-id': identityVerificationRecordId },
    },
  );

  await throwOnApiError(res, 'MFA_ENROLL_FAILED', 'webauthn-rename');

  // Audit (best-effort — failure must not break the main action)
  try {
    const { audit } = await import('../audit');
    const _token = await getTokenForServerAction();
    const _intro = await introspectToken(_token);
    await audit({ actor: _intro.sub ?? 'unknown', action: 'mfa.webauthn.rename', resource: verificationId });
  } catch { /* audit is best-effort; never surface to caller */ }
}
