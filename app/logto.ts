import { UserScope } from '@logto/next';

// Map SCOPES string to Logto enum
const SCOPE_MAP: Record<string, string> = {
  profile: UserScope.Profile,
  custom_data: UserScope.CustomData,
  email: UserScope.Email,
  phone: UserScope.Phone,
  identities: UserScope.Identities,
  organizations: UserScope.Organizations,
  organization_roles: UserScope.OrganizationRoles,
  openid: 'openid',
  offline_access: 'offline_access',
};

// AGGRESSIVE whitespace and validation
function getEnvVar(name: string, required = true): string {
  const valueRaw =
    process.env[name] || process.env[`NEXT_PUBLIC_${name}`] || process.env[`NEXT_PUBLIC_${name.toUpperCase()}`];

  if (required && !valueRaw) {
    throw new Error(`Missing required environment variable: ${name} (or NEXT_PUBLIC_${name})`);
  }

  // AGGRESSIVE trim: remove ALL whitespace, newlines, tabs
  const value = valueRaw?.toString().replace(/\s+/g, '').trim() || '';

  if (required && !value) {
    throw new Error(`Environment variable ${name} is empty after aggressive trimming`);
  }

  return value;
}

function buildAccountApiResource(endpoint: string): string {
  if (!endpoint.startsWith('http')) {
    throw new Error(`ENDPOINT must start with http:// or https://. Got: "${endpoint}"`);
  }

  const cleanEndpoint = endpoint.replace(/\/+$/, '');
  const resource = `${cleanEndpoint}/api`;

  return resource;
}

function parseScopes(scopeString: string): string[] {
  if (!scopeString) return [];

  const scopes = scopeString
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => SCOPE_MAP[s] || s)
    .filter(Boolean);

  return scopes;
}

export const logtoConfig = (() => {
  try {
    const appId = getEnvVar('APP_ID');
    const appSecret = getEnvVar('APP_SECRET');
    const endpoint = getEnvVar('ENDPOINT');
    const baseUrl = getEnvVar('BASE_URL');
    const cookieSecret = getEnvVar('COOKIE_SECRET');
    const scopeString = getEnvVar('SCOPES');

    const nodeEnv = process.env.NODE_ENV || 'development';

    const resources = [buildAccountApiResource(endpoint)];

    const allScopes = parseScopes(scopeString);

    const config = {
      appId,
      appSecret,
      endpoint,
      baseUrl,
      cookieSecret,
      cookieSecure: nodeEnv === 'production',
      resources,
      scopes: allScopes,
    };

    if (!config.resources || config.resources.length === 0) {
      throw new Error('Resources array is empty - Account API will fail');
    }

    return config;
  } catch (error) {
    console.error('[Logto Config] Fatal error:', error);
    throw error;
  }
})();

// ============================================================================
// Management API Token Helper
// ============================================================================

/**
 * Fetches a short-lived Management API access token via the client-credentials
 * grant using a dedicated M2M application.
 *
 * Required env vars (add to your .env):
 *   LOGTO_M2M_APP_ID     — App ID of the M2M application in Logto Console
 *   LOGTO_M2M_APP_SECRET — App Secret of the M2M application
 *
 * The M2M app must have the "User data" → Write permission assigned under
 * Management API access in the Logto Console.
 */
export async function getManagementApiToken(): Promise<string> {
  const appId = process.env.LOGTO_M2M_APP_ID?.trim();
  const appSecret = process.env.LOGTO_M2M_APP_SECRET?.trim();

  if (!appId || !appSecret) {
    throw new Error(
      'LOGTO_M2M_APP_ID and LOGTO_M2M_APP_SECRET must be set for Management API access. ' +
        'Create an M2M application in the Logto Console and add these env vars.'
    );
  }

  const cleanEndpoint = logtoConfig.endpoint.replace(/\/$/, '');
  const resource = process.env.LOGTO_M2M_RESOURCE || `${cleanEndpoint}/api`;
  const tokenEndpoint = `${cleanEndpoint}/oidc/token`;

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    resource,
    scope: 'all',
  });

  const res = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${appId}:${appSecret}`).toString('base64')}`,
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(
      `Management API token request failed ${res.status}: ${errorText.substring(0, 200)}`
    );
  }

  const data = await res.json();
  if (!data.access_token) {
    throw new Error(
      `Management API token response missing access_token. Got: ${JSON.stringify(data)}`
    );
  }

  return data.access_token as string;
}