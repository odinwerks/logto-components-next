import { getLogtoConfig } from '../../logto';
import type { OidcIntrospectionResponse } from './types';

/**
 * Retrieves the Logto endpoint from configuration and removes any trailing slash.
 * @returns The clean endpoint URL without trailing slash.
 * @throws Error if endpoint is missing from configuration.
 */
export function getCleanEndpoint(): string {
  const endpoint = getLogtoConfig().endpoint;
  if (!endpoint) {
    throw new Error(
      'ENDPOINT configuration is missing! ' +
        'Check your .env file and logto.ts configuration.'
    );
  }
  return endpoint.replace(/\/$/, '');
}

/**
 * Truncates a string to a maximum length.
 * @param text - The text to truncate.
 * @param maxLength - Maximum length (default: 200).
 * @returns The truncated text.
 */
export function truncateError(text: string, maxLength = 200): string {
  return text.substring(0, maxLength);
}

/**
 * Introspects an OIDC token to validate its active status and claims.
 * @param token - The access token to introspect.
 * @returns The OIDC introspection response containing active status and claims.
 * @throws Error if introspection URL, APP_ID, or APP_SECRET are not configured.
 * @throws Error if the introspection request fails.
 */
export async function introspectToken(token: string): Promise<OidcIntrospectionResponse> {
  const url = process.env.LOGTO_INTROSPECTION_URL;
  const clientId = process.env.APP_ID;
  const clientSecret = process.env.APP_SECRET;

  if (!url || !clientId || !clientSecret) {
    throw new Error(
      'Logto introspection not configured — set LOGTO_INTROSPECTION_URL, ' +
        'APP_ID and APP_SECRET.'
    );
  }

  const body = new URLSearchParams({
    token,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    cache: 'no-store',
  });

  if (!res.ok) {
    let detail = '';
    try {
      const errBody = await res.json() as { error?: string; error_description?: string };
      detail = errBody.error_description ?? errBody.error ?? '';
    } catch {
      detail = await res.text().catch(() => '');
    }
    throw new Error(
      `Introspection endpoint returned HTTP ${res.status}` +
        (detail ? `: ${detail}` : '. Check LOGTO_INTROSPECTION_URL.')
    );
  }

  try {
    return (await res.json()) as OidcIntrospectionResponse;
  } catch {
    throw new Error(
      'Introspection endpoint returned a non-JSON body. ' +
        'Check LOGTO_INTROSPECTION_URL points to the correct endpoint.'
    );
  }
}


