'use server';

import { getTokenForServerAction } from './tokens';
import { getCleanEndpoint } from '../utils';

/**
 * Makes an authenticated request to the Logto Account API.
 * @param path - The API path (e.g., '/api/my-account'). Must not contain '?', '#', or '..'.
 * @param options - Request options including method, body, extra headers, and query params.
 * @returns The fetch Response object.
 */
export async function makeRequest(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
    body?: unknown;
    extraHeaders?: Record<string, string>;
    /** Query parameters appended safely via URLSearchParams - never put these in `path`. */
    query?: Record<string, string>;
    signal?: AbortSignal;
  } = {}
): Promise<Response> {
  // Guard: only allow /api/ paths, no path traversal or query/fragment injection.
  // Query parameters must be passed via options.query, not embedded in path.
  if (!path.startsWith('/api/') || path.includes('..') || path.includes('?') || path.includes('#') || path.includes('//')) {
    throw new Error(`Invalid API path: ${path}`);
  }

  const token = await getTokenForServerAction();
  const cleanEndpoint = getCleanEndpoint();
  // path always starts with '/' because of the validation guard above
  const base = `${cleanEndpoint}${path}`;

  // Use URL + URLSearchParams so query values are encoded correctly and
  // can never bleed into the path segment.
  const url = new URL(base);
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      url.searchParams.set(key, value);
    }
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...(options.body !== undefined && { 'Content-Type': 'application/json' }),
    ...options.extraHeaders,
  };

  return fetch(url.toString(), {
    method: options.method || 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal ?? AbortSignal.timeout(15000),
  });
}
