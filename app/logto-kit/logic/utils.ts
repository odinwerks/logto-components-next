import { getLogtoConfig } from '../config';
import type { OidcIntrospectionResponse } from './types';
import { warn } from './log';
import { sanitize } from './errors';

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
  return endpoint.replace(/\/+$/, '');
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
  let clientId: string | undefined;
  let clientSecret: string | undefined;

  try {
    const config = getLogtoConfig();
    clientId = config.appId;
    clientSecret = config.appSecret;
  } catch {
    // If config resolution fails (e.g. missing required env vars), treat it as unconfigured
  }

  if (
    !url ||
    !clientId ||
    !clientSecret ||
    clientId === 'build-placeholder' ||
    clientSecret === 'build-placeholder'
  ) {
    throw new Error(
      'Logto introspection not configured - set LOGTO_INTROSPECTION_URL, ' +
        'APP_ID and APP_SECRET.'
    );
  }

  // RFC 7662 §2.1: client credentials MUST be sent via HTTP Basic Auth,
  // not in the request body, to avoid leaking secrets in server logs/proxies.
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const body = new URLSearchParams({ token });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`,
    },
    body: body.toString(),
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    let detail = '';
    try {
      const errBody = await res.json() as { error?: string; error_description?: string };
      detail = errBody.error_description ?? errBody.error ?? '';
    } catch {
      detail = await res.text().catch(() => '');
    }
    // Log full detail server-side
    warn(`[introspectToken] HTTP ${res.status}: ${detail}`);
    // Throw sanitized error - never leak upstream API details to clients
    throw sanitize(new Error(`Introspection failed: HTTP ${res.status}`), { fallback: 'UNAUTHORIZED' });
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


