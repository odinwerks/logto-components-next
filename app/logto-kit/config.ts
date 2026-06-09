import 'server-only';

import { UserScope } from '@logto/next';
import { readEnv } from './logic/env';
import { warn } from './logic/log';
import { parseCountryList } from './logic/country-list-filter';

// Map SCOPES string to Logto enum
const SCOPE_MAP: Record<string, string> = {
  profile: UserScope.Profile,
  custom_data: UserScope.CustomData,
  email: UserScope.Email,
  phone: UserScope.Phone,
  identities: UserScope.Identities,
  sessions: UserScope.Sessions,
  organizations: UserScope.Organizations,
  organization_roles: UserScope.OrganizationRoles,
  roles: UserScope.Roles,
  openid: 'openid',
  offline_access: 'offline_access',
};

// whitespace and validation
const PRIVATE_ENV_VARS = new Set([
  'APP_SECRET', 'COOKIE_SECRET', 'LOGTO_M2M_APP_SECRET',
  'LOGTO_M2M_APP_ID', 'S3_SECRET_ACCESS_KEY', 'SUPABASE_SERVICE_ROLE_KEY',
  'COUNTRY_CODE_ALLOW_LIST', 'COUNTRY_CODE_BLOCK_LIST',
]);

function getEnvVar(name: string, required = true): string {
  const allowPublic = !PRIVATE_ENV_VARS.has(name);
  const valueRaw = readEnv(name, allowPublic);

  const isNextBuild = process.env.npm_lifecycle_event === 'build' || process.env.NEXT_PHASE !== undefined;
  const isBuildTime = (isNextBuild && process.env.NODE_ENV === 'production' && !valueRaw) || !!process.env.VITEST;
  if (required && !valueRaw && !isBuildTime) {
    throw new Error(`Missing required environment variable: ${name} (or NEXT_PUBLIC_${name})`);
  }

  // AGGRESSIVE trim: remove ALL whitespace, newlines, tabs (unless name is 'SCOPES')
  const value = name === 'SCOPES'
    ? (valueRaw?.toString().trim() || '')
    : (valueRaw?.toString().replace(/\s+/g, '').trim() || '');

  if (required && !value && !isBuildTime) {
    throw new Error(`Environment variable ${name} is empty after aggressive trimming`);
  }

  return value;
}

function parseScopes(scopeString: string): string[] {
  if (!scopeString) return [];

  const scopes = scopeString
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const mapped = SCOPE_MAP[s];
      // Custom scopes (e.g., calc:basic) pass through unchanged — they are
      // valid resource-specific scopes defined in Logto Console.
      return mapped || s;
    })
    .filter(Boolean);

  return scopes;
}

export const logtoConfig = (() => {
  const appId = getEnvVar('APP_ID', false);
  const appSecret = getEnvVar('APP_SECRET', true);
  const endpoint = getEnvVar('ENDPOINT', false);
  const baseUrl = getEnvVar('BASE_URL', false);
  const cookieSecret = getEnvVar('COOKIE_SECRET', false);
  const scopeString = getEnvVar('SCOPES', false);

  const allowList = parseCountryList(process.env.COUNTRY_CODE_ALLOW_LIST);
  const blockList = parseCountryList(process.env.COUNTRY_CODE_BLOCK_LIST);
  if (allowList.length > 0 && blockList.length > 0) {
    const isNextBuild = process.env.npm_lifecycle_event === 'build' || process.env.NEXT_PHASE !== undefined;
    const msg = 'COUNTRY_CODE_ALLOW_LIST and COUNTRY_CODE_BLOCK_LIST are set - they are mutually exclusive.';
    if (isNextBuild) {
      warn(`[Logto Config] ${msg} Falling back to allow list.`);
    } else {
      throw new Error(`Configuration Error: ${msg}`);
    }
  }

  if (!appId || !appSecret || !endpoint || !baseUrl || !cookieSecret) {
    warn('[Logto Config] Missing required environment variables. Build will continue but runtime will fail if not configured.');
  }

  const nodeEnv = process.env.NODE_ENV || 'development';

  // NOTE: Account API tokens use the canonical getAccessToken(config) call.
  // urn:logto:resource:organizations helps the auth server track org scopes
  // so refreshed org tokens include the user's current organization permissions.
  const resources: string[] = ['urn:logto:resource:organizations'];

  const allScopes = parseScopes(scopeString);

  const config = {
    appId: appId || 'build-placeholder',
    appSecret: appSecret || 'build-placeholder',
    endpoint: endpoint || 'https://placeholder.logto.app',
    baseUrl: baseUrl || 'http://localhost:3000',
    cookieSecret: cookieSecret || 'build-placeholder',
    cookieSecure: nodeEnv === 'production',
    resources,
    scopes: allScopes,
  };

  // Runtime guard: prevent serving with placeholder secrets in production.
  // During `next build` (esp. Docker), env files are excluded from the build
  // context, so placeholders are expected. The guard re-runs at server start.
  const isNextBuild = process.env.npm_lifecycle_event === 'build' || process.env.NEXT_PHASE !== undefined;
  if (config.appSecret === 'build-placeholder' && nodeEnv === 'production' && !isNextBuild) {
    throw new Error(
      'FATAL: appSecret is still "build-placeholder" at runtime in production. ' +
      'Set APP_SECRET environment variable before starting the server.'
    );
  }
  if (config.cookieSecret === 'build-placeholder' && nodeEnv === 'production' && !isNextBuild) {
    throw new Error(
      'FATAL: cookieSecret is still "build-placeholder" at runtime in production. ' +
      'Set COOKIE_SECRET environment variable before starting the server.'
    );
  }

  // Runtime guard: enforce HTTPS for sensitive URLs in production (protects secrets in transit)
  const isNextBuildForHttps = process.env.npm_lifecycle_event === 'build' || process.env.NEXT_PHASE !== undefined;
  if (nodeEnv === 'production' && !isNextBuildForHttps) {
    function assertHttpsInProduction(url: string | undefined, name: string): void {
      if (!url) return; // Let existing required checks handle missing values
      try {
        const parsed = new URL(url);
        const isLocalhost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
        if (parsed.protocol !== 'https:' && !isLocalhost) {
          throw new Error(
            `${name} must use HTTPS in production - secrets must not be ` +
            'transmitted over unencrypted connections.'
          );
        }
      } catch (e) {
        if (e instanceof Error && e.message.includes('must use HTTPS')) throw e;
        throw new Error(`${name} is not a valid URL`);
      }
    }

    // Validate LOGTO_INTROSPECTION_URL
    assertHttpsInProduction(process.env.LOGTO_INTROSPECTION_URL, 'LOGTO_INTROSPECTION_URL');

    // Validate ENDPOINT
    if (config.endpoint && config.endpoint !== 'https://placeholder.logto.app') {
      assertHttpsInProduction(config.endpoint, 'ENDPOINT');
    }

    // Validate LOGTO_M2M_RESOURCE if set
    assertHttpsInProduction(process.env.LOGTO_M2M_RESOURCE, 'LOGTO_M2M_RESOURCE');
  }

  return config;
})();

export const getLogtoConfig = () => logtoConfig;

// ============================================================================
// Management API Token Helper
// ============================================================================

/**
 * Fetches a short-lived Management API access token via the client-credentials
 * grant using a dedicated M2M application.
 *
 * Required env vars (add to your .env):
 *   LOGTO_M2M_APP_ID - App ID of the M2M application in Logto Console
 *   LOGTO_M2M_APP_SECRET - App Secret of the M2M application
 *
 * The M2M app must have the "User data" → Write permission assigned under
 * Management API access in the Logto Console.
 */
// In-memory cache for the M2M token (serverless-safe: per-process, no shared state)
let cachedM2MToken: { token: string; expiresAt: number } | null = null;

export async function getManagementApiToken(): Promise<string> {
  // Return cached token if still valid (with 10-minute buffer before expiry)
  if (cachedM2MToken && Date.now() < cachedM2MToken.expiresAt) {
    return cachedM2MToken.token;
  }

  const appId = process.env.LOGTO_M2M_APP_ID?.trim();
  const appSecret = process.env.LOGTO_M2M_APP_SECRET?.trim();

  if (!appId || !appSecret) {
    throw new Error(
      'LOGTO_M2M_APP_ID and LOGTO_M2M_APP_SECRET must be set for Management API access. ' +
        'Create an M2M application in the Logto Console and add these env vars.'
    );
  }

  const cleanEndpoint = getLogtoConfig().endpoint.replace(/\/$/, '');
  const resource = process.env.LOGTO_M2M_RESOURCE || 'https://default.logto.app/api';
  const tokenEndpoint = `${cleanEndpoint}/oidc/token`;

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    resource,
    // 'all' here requests every management scope granted to this M2M app in the
    // Logto Console. The actual blast radius is determined by Console permissions,
    // NOT this string. To minimise risk, ensure the M2M app in Console has ONLY
    // the "User data → Delete user" permission assigned.
    // See SECURITY.md for setup instructions.
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
    warn(`[M2M Token] HTTP ${res.status}: ${errorText.substring(0, 200)}`);
    throw new Error('Management API token request failed');
  }

  const data = await res.json();
  if (!data.access_token) {
    throw new Error(
      `Management API token response missing access_token. Got keys: [${Object.keys(data).join(', ')}]`
    );
  }

  // Cache the token with a 50-minute TTL (tokens typically last 1 hour)
  cachedM2MToken = {
    token: data.access_token as string,
    expiresAt: Date.now() + 50 * 60 * 1000,
  };

  return cachedM2MToken.token;
}

// ============================================================================
// Backend Type and Country Filter Configurations
// ============================================================================

export type BackendType = 'blacktop' | 'upstream';
export type AvatarBackend = 'logto' | 's3';

function parseEnvChoice<T extends string>(
  envVarName: string,
  allowed: readonly T[],
  fallback: T,
): T {
  const raw = readEnv(envVarName);
  const normalized = raw?.trim().toLowerCase();
  if (!normalized) return fallback;

  if ((allowed as readonly string[]).includes(normalized)) {
    return normalized as T;
  }

  warn(
    `[config] Invalid ${envVarName}="${raw}". Must be one of: ${allowed.join(', ')}. Falling back to '${fallback}'.`
  );
  return fallback;
}

export function getBackendType(): BackendType {
  // Safe default: upstream
  return parseEnvChoice('BACKEND_TYPE', ['blacktop', 'upstream'], 'upstream');
}

function getAvatarBackendFromEnv(): AvatarBackend {
  // Safe default: S3-compatible storage
  return parseEnvChoice('PFP_BACKEND', ['logto', 's3'], 's3');
}

export function getAvatarBackend(): AvatarBackend {
  const backendType = getBackendType();
  const configured = getAvatarBackendFromEnv();

  if (backendType === 'upstream') {
    if (configured !== 's3') {
      warn(`[config] BACKEND_TYPE=upstream forces PFP_BACKEND='s3' (received '${configured}').`);
    }
    return 's3';
  }

  return configured;
}

export function getCountryFilter(): { mode: 'allow' | 'block' | 'none'; codes: string[] } {
  const allow = parseCountryList(process.env.COUNTRY_CODE_ALLOW_LIST);
  const block = parseCountryList(process.env.COUNTRY_CODE_BLOCK_LIST);

  if (allow.length > 0 && block.length > 0) {
    warn('[config] Both COUNTRY_CODE_ALLOW_LIST and COUNTRY_CODE_BLOCK_LIST are set - they are mutually exclusive. Falling back to allow list.');
    return { mode: 'allow', codes: allow };
  }
  if (allow.length > 0) {
    return { mode: 'allow', codes: allow };
  }
  if (block.length > 0) {
    return { mode: 'block', codes: block };
  }
  return { mode: 'none', codes: [] };
}
