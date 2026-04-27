'use server';

import { getTokenForServerAction } from './tokens';
import { getCleanEndpoint } from '../utils';

/**
 * Makes an authenticated request to the Logto Account API.
 * @param path - The API path (e.g., '/api/my-account').
 * @param options - Request options including method, body, and extra headers.
 * @returns The fetch Response object.
 */
export async function makeRequest(
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
