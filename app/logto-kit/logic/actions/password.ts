'use server';

import { makeRequest } from './request';
import { isDev } from '../dev-mode';
import { getTokenForServerAction } from './tokens';
import { introspectToken } from '../utils';

/**
 * Changes the authenticated user's password.
 * Error messages are sanitised in production to prevent enumeration.
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
    if (isDev) {
      const errorText = await res.text();
      let detail = errorText.substring(0, 400);
      try {
        const parsed = JSON.parse(errorText);
        if (parsed?.message) detail = parsed.message;
      } catch { /* not JSON */ }
      throw new Error(`PASSWORD_UPDATE_FAILED ${res.status}: ${detail}`);
    }
    throw new Error('PASSWORD_UPDATE_FAILED');
  }

  // Audit (best-effort — failure must not break the main action)
  try {
    const { audit } = await import('../audit');
    const sessionToken = await getTokenForServerAction();
    const introspection = await introspectToken(sessionToken);
    await audit({ actor: introspection.sub ?? 'unknown', action: 'password.change' });
  } catch { /* audit is best-effort; never surface to caller */ }
}
