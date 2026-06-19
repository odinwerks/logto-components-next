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
 * @param options - Optional configuration.
 * @param options.assertAudience - When true, verifies the token's client_id matches
 *   this app's appId (defense-in-depth for multi-app tenants). Fail-closed: tokens
 *   without client_id are also rejected (BUG-H02). Defaults to false for backward
 *   compatibility.
 * @returns The OIDC introspection response containing active status and claims.
 * @throws Error if introspection URL, APP_ID, or APP_SECRET are not configured.
 * @throws Error if the introspection request fails.
 * @throws Error if assertAudience is true and client_id is absent or mismatched.
 */
export async function introspectToken(
  token: string,
  options?: { assertAudience?: boolean },
): Promise<OidcIntrospectionResponse> {
  let introspectionUrl = process.env.LOGTO_INTROSPECTION_URL;
  let clientId: string | undefined;
  let clientSecret: string | undefined;

  try {
    const config = getLogtoConfig();
    clientId = config.appId;
    clientSecret = config.appSecret;
  } catch {
    // If config resolution fails (e.g. missing required env vars), treat it as unconfigured
  }

  // Derive introspection URL from endpoint when LOGTO_INTROSPECTION_URL is not set.
  // LOGTO_INTROSPECTION_URL is optional — see .env.example.
  if (!introspectionUrl) {
    try {
      introspectionUrl = `${getCleanEndpoint()}/oidc/token/introspection`;
    } catch {
      // endpoint also unavailable — will fail the guard below
    }
  }

  if (
    !introspectionUrl ||
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

  const url = introspectionUrl;

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
    const result = (await res.json()) as OidcIntrospectionResponse;

    // Audience / client_id check (defense-in-depth for multi-app tenants).
    // When assertAudience is true, verify the token was issued for this app.
    // Fail-closed: tokens without client_id are also rejected (BUG-H02).
    if (options?.assertAudience) {
      let appId: string | undefined;
      try {
        appId = getLogtoConfig().appId;
      } catch {
        // Config unavailable during build/test — skip check
      }
      if (appId && (!result.client_id || result.client_id !== appId)) {
        warn(`[introspectToken] client_id mismatch: expected ${appId}, got ${result.client_id ?? 'absent'}`);
        throw sanitize(new Error('Audience mismatch'), { fallback: 'UNAUTHORIZED' });
      }
    }

    return result;
  } catch (err) {
    // Re-throw SanitizedError from audience check
    if (err instanceof Error && err.name === 'SanitizedError') throw err;
    throw new Error(
      'Introspection endpoint returned a non-JSON body. ' +
        'Check LOGTO_INTROSPECTION_URL points to the correct endpoint.'
    );
  }
}


