import { isDev } from '../dev-mode';

function truncateError(text: string, maxLength = 200): string {
  return text.substring(0, maxLength);
}

/**
 * Throws an error if the API response is not OK.
 * In production: throws a generic label only (no upstream detail leakage).
 * In development: throws the full upstream error text for easy debugging.
 */
export async function throwOnApiError(res: Response, label: string): Promise<void> {
  if (!res.ok) {
    let detail = '';
    try { detail = await res.text(); } catch { detail = res.statusText; }
    // Always log full detail server-side for operators.
    console.warn(`[${label}] HTTP ${res.status}: ${truncateError(detail, 400)}`);
    if (isDev) {
      throw new Error(`${label} ${res.status}: ${truncateError(detail)}`);
    }
    throw new Error(label);
  }
}

/**
 * Patches the user's account with the given body.
 */
export async function patchMyAccount(body: unknown, label: string): Promise<void> {
  const { makeRequest } = await import('./request');
  const res = await makeRequest('/api/my-account', { method: 'PATCH', body });
  await throwOnApiError(res, label);
}
