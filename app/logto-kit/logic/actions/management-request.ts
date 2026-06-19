/**
 * Shared helper for direct Management API fetch calls.
 *
 * Prevents the 13 duplicate timeout additions required by BUG-M-010.
 * Applies AbortSignal.timeout(15000), Authorization header, and JSON
 * content-type automatically for all Management API calls.
 */

export async function makeManagementFetch(
  url: string,
  options: {
    method?: string;
    token: string;
    body?: unknown;
    signal?: AbortSignal;
  },
): Promise<Response> {
  const { method = 'GET', token, body, signal } = options;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  return fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: 'no-store',
    signal: signal ?? AbortSignal.timeout(15000),
  });
}
