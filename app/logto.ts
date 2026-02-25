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
  // Check multiple fallbacks in order
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

  console.log(`[Logto Config] Loaded ${name}: ${value.slice(0, 10)}...`);
  return value;
}

function buildAccountApiResource(endpoint: string): string {
  // Verify URL protocol
  if (!endpoint.startsWith('http')) {
    throw new Error(`ENDPOINT must start with http:// or https://. Got: "${endpoint}"`);
  }

  // Remove trailing slashes and ensure clean format
  const cleanEndpoint = endpoint.replace(/\/+$/, '');
  const resource = `${cleanEndpoint}/api`;

  console.log(`[Logto Config] Built resource: ${resource}`);
  return resource;
}

function parseScopes(scopeString: string): string[] {
  if (!scopeString) {
    return [];
  }

  // Handle comma-separated or space-separated
  const scopes = scopeString
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => SCOPE_MAP[s] || s)
    .filter(Boolean);

  console.log(`[Logto Config] Parsed scopes: ${scopes.join(', ')}`);
  return scopes;
}

export const logtoConfig = (() => {
  try {
    console.log('[Logto Config] ==== INITIALIZING ====');

    const appId = getEnvVar('APP_ID');
    const appSecret = getEnvVar('APP_SECRET');
    const endpoint = getEnvVar('ENDPOINT');
    const baseUrl = getEnvVar('BASE_URL');
    const cookieSecret = getEnvVar('COOKIE_SECRET');
    const scopeString = getEnvVar('SCOPES', false);

    const nodeEnv = process.env.NODE_ENV || 'development';

    // Build resources
    const resources = [buildAccountApiResource(endpoint)];

    // Build scopes
    const defaultScopes = [
      UserScope.Profile,
      UserScope.CustomData,
      UserScope.Email,
      UserScope.Phone,
      UserScope.Identities,
    ];

    const customScopes = parseScopes(scopeString || '');
    const allScopes = [...new Set([...defaultScopes, ...customScopes])];

    console.log('[Logto Config] Final config:', {
      appId: appId.slice(0, 8) + '...',
      endpoint,
      baseUrl,
      resources,
      scopesCount: allScopes.length,
      nodeEnv,
    });

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

    // CRITICAL: Validate resources are present
    if (!config.resources || config.resources.length === 0) {
      throw new Error('Resources array is empty - Account API will fail');
    }

    return config;
  } catch (error) {
    console.error('[Logto Config] Fatal error:', error);
    throw error;
  }
})();
