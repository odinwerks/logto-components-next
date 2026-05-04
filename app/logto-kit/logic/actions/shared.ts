import { throwOnApiError } from '../errors';

export { throwOnApiError };

/**
 * Patches the user's account with the given body.
 */
export async function patchMyAccount(body: unknown, label: string): Promise<void> {
  const { makeRequest } = await import('./request');
  const res = await makeRequest('/api/my-account', { method: 'PATCH', body });
  await throwOnApiError(res, 'UPDATE_FAILED', label);
}
