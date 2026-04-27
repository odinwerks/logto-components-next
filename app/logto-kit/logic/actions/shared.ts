import { redirect } from 'next/navigation';

/**
 * Truncates error text to prevent massive error messages.
 */
function truncateError(text: string, maxLength = 200): string {
  return text.substring(0, maxLength);
}

/**
 * Throws an error if the API response is not OK.
 * @param res - The fetch Response object.
 * @param label - A label for error context.
 */
export async function throwOnApiError(res: Response, label: string): Promise<void> {
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`${label} ${res.status}: ${truncateError(errorText)}`);
  }
}

/**
 * Patches the user's account with the given body.
 * @param body - The request body.
 * @param label - A label for error context.
 */
export async function patchMyAccount(body: unknown, label: string): Promise<void> {
  const { makeRequest } = await import('./request');
  const res = await makeRequest('/api/my-account', { method: 'PATCH', body });
  await throwOnApiError(res, label);
}
