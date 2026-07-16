import { throwOnApiError } from '../errors';

export { throwOnApiError };

/**
 * Patches the user's account with the given body.
 *
 * @param extraHeaders - Optional extra headers forwarded to `makeRequest`.
 *   Used by callers that need to send the `logto-verification-id` header
 *   (e.g. username changes via `updateUserBasicInfo`).
 */
export async function patchMyAccount(
  body: unknown,
  label: string,
  extraHeaders?: Record<string, string>,
): Promise<void> {
  const { makeRequest } = await import('./request');
  const res = await makeRequest('/api/my-account', { method: 'PATCH', body, extraHeaders });
  await throwOnApiError(res, 'UPDATE_FAILED', label, true);
}
