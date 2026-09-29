import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { getCleanEndpoint, introspectToken } from './utils';
import { assertSafeLogtoId } from './guards';
import type { OidcIntrospectionResponse, ProtectedAuthContext } from './types';

const AUTOMATION_ALLOWED_ORIGINS_ENV = 'PROTECTED_AUTOMATION_ALLOWED_ORIGINS';
const AUTOMATION_RESOURCE_ENV = 'PROTECTED_API_RESOURCE';

export const AUTOMATION_CORS_MAX_AGE = '600';

export interface ProtectedAutomationCorsPolicy {
  mode: 'wildcard' | 'exact';
  origins: ReadonlySet<string>;
}

export interface ProtectedAutomationCorsDecision {
  allowed: boolean;
  requestOrigin?: string;
  allowOrigin?: string;
}

/**
 * Parses the private runtime CORS allowlist. A malformed setting is an error,
 * rather than a reason to silently fall back to the rollout wildcard.
 */
export function parseProtectedAutomationAllowedOrigins(
  rawValue: string | undefined = process.env[AUTOMATION_ALLOWED_ORIGINS_ENV],
): ProtectedAutomationCorsPolicy {
  const value = rawValue?.trim() || '*';
  if (value === '*') {
    return { mode: 'wildcard', origins: new Set() };
  }

  const entries = value.split(',').map(entry => entry.trim());
  if (entries.length === 0 || entries.some(entry => !entry || entry.includes('*'))) {
    throw new Error('Invalid protected automation CORS allowlist');
  }

  const origins = new Set<string>();
  for (const entry of entries) {
    const parsed = parseExactOrigin(entry);
    if (!parsed || parsed === '*') {
      throw new Error('Invalid protected automation CORS allowlist');
    }
    origins.add(parsed);
  }

  return { mode: 'exact', origins };
}

function parseExactOrigin(value: string): string | null {
  if (!value || value.includes('*') || value.includes('?') || value.includes('#')) return null;
  if (!/^https?:\/\//i.test(value)) return null;
  if (/[\\\u0000-\u001F\u007F-\u009F]/.test(value)) return null;

  // Do not let URL normalization turn a path such as `/.` into `/` and make
  // it look like a valid origin. The only optional slash allowed is the root
  // slash immediately following the authority.
  const schemeEnd = value.indexOf('://');
  const authorityEnd = schemeEnd >= 0 ? value.indexOf('/', schemeEnd + 3) : -1;
  if (authorityEnd >= 0 && value.slice(authorityEnd) !== '/') return null;
  const authority = value.slice(schemeEnd + 3, authorityEnd >= 0 ? authorityEnd : value.length);
  if (authority.includes('@') || authority.endsWith(':')) return null;

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }

  if (
    (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') ||
    !parsed.hostname ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    parsed.pathname !== '/'
  ) {
    return null;
  }

  // URL.origin is the canonical scheme/host/port form. A trailing slash is
  // accepted as the URL spelling of the same origin, but no other path is.
  return parsed.origin;
}

export function evaluateProtectedAutomationCors(
  requestOrigin: string | null,
  policy: ProtectedAutomationCorsPolicy,
): ProtectedAutomationCorsDecision {
  // A missing Origin denotes a CLI/server request. It still must pass bearer
  // authentication, but it is not subject to browser CORS reflection.
  if (!requestOrigin) return { allowed: true };

  if (policy.mode === 'wildcard') {
    return { allowed: true, requestOrigin, allowOrigin: '*' };
  }

  if (policy.origins.has(requestOrigin)) {
    return { allowed: true, requestOrigin, allowOrigin: requestOrigin };
  }

  return { allowed: false, requestOrigin };
}

/** Adds only a previously-approved CORS origin to a response. */
export function applyProtectedAutomationCors(
  response: Response,
  policy: ProtectedAutomationCorsPolicy,
  decision: ProtectedAutomationCorsDecision,
): Response {
  if (decision.allowOrigin) {
    response.headers.set('Access-Control-Allow-Origin', decision.allowOrigin);
  }
  if (policy.mode === 'exact') {
    response.headers.set('Vary', 'Origin');
  }
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

interface ProtectedJwtClaims extends JWTPayload {
  scope?: unknown;
  organization_id?: unknown;
}

export type AutomationAuthenticationResult =
  | { ok: true; context: ProtectedAuthContext }
  | { ok: false; code: 'UNAUTHORIZED' | 'INTERNAL_ERROR' };

/**
 * Authenticates an exchanged Logto API-resource access token.
 *
 * The direct JWT verification is deliberately performed before introspection:
 * it rejects opaque values (including raw PATs) and establishes the issuer,
 * signature, expiration, and API-resource audience. Introspection then remains
 * the active-status and server-side subject check.
 */
export async function authenticateProtectedAutomationBearer(
  token: string,
): Promise<AutomationAuthenticationResult> {
  const resource = process.env[AUTOMATION_RESOURCE_ENV]?.trim();
  if (!resource) return { ok: false, code: 'INTERNAL_ERROR' };

  // A PAT is an input to Logto's token exchange, never a credential for this
  // endpoint. Do not introspect it, log it, or include it in any response.
  if (token.startsWith('pat_')) return { ok: false, code: 'UNAUTHORIZED' };

  let verifiedClaims: ProtectedJwtClaims;
  try {
    // The endpoint must receive a signed JWT with a verifiable API audience;
    // this compact-shape check also prevents opaque tokens from reaching the
    // remote JWKS resolver.
    if (token.split('.').length !== 3) return { ok: false, code: 'UNAUTHORIZED' };

    const endpoint = getCleanEndpoint();
    const jwks = createRemoteJWKSet(new URL(`${endpoint}/oidc/jwks`));
    const verification = await jwtVerify(token, jwks, {
      issuer: endpoint,
      audience: resource,
    });
    verifiedClaims = verification.payload as ProtectedJwtClaims;

    // jose validates an exp claim when present. Require one as an additional
    // fail-closed check so an otherwise valid, non-expiring token is not used
    // as an automation credential.
    if (
      typeof verifiedClaims.exp !== 'number' ||
      verifiedClaims.exp <= Math.floor(Date.now() / 1000) ||
      typeof verifiedClaims.sub !== 'string'
    ) {
      return { ok: false, code: 'UNAUTHORIZED' };
    }
    assertSafeLogtoId(verifiedClaims.sub, 'userId');
  } catch {
    return { ok: false, code: 'UNAUTHORIZED' };
  }

  let introspectionResult: unknown;
  try {
    introspectionResult = await introspectToken(token);
  } catch {
    return { ok: false, code: 'UNAUTHORIZED' };
  }

  // `introspectToken` normally returns the typed response from Logto, but the
  // upstream response is still untrusted at this boundary. Validate the
  // required fields before reading them so malformed mocks, adapters, or
  // upstream JSON fail as a fixed authentication denial rather than a 500.
  if (
    typeof introspectionResult !== 'object' ||
    introspectionResult === null ||
    Array.isArray(introspectionResult)
  ) {
    return { ok: false, code: 'UNAUTHORIZED' };
  }

  const introspection = introspectionResult as OidcIntrospectionResponse;
  if (typeof introspection.active !== 'boolean') {
    return { ok: false, code: 'UNAUTHORIZED' };
  }

  // Keep inactive-token handling identical even when Logto omits `sub` from
  // the inactive response. An active response must have a usable subject for
  // the exact agreement check below.
  if (!introspection.active) {
    return { ok: false, code: 'UNAUTHORIZED' };
  }
  if (typeof introspection.sub !== 'string' || introspection.sub.length === 0) {
    return { ok: false, code: 'UNAUTHORIZED' };
  }

  if (
    introspection.sub !== verifiedClaims.sub
  ) {
    return { ok: false, code: 'UNAUTHORIZED' };
  }

  const scopes = typeof verifiedClaims.scope === 'string'
    ? verifiedClaims.scope.split(' ').filter(Boolean)
    : [];
  const organizationId = typeof verifiedClaims.organization_id === 'string'
    ? verifiedClaims.organization_id
    : undefined;

  return {
    ok: true,
    context: {
      source: 'bearer',
      token,
      userId: verifiedClaims.sub,
      ...(typeof verifiedClaims.sid === 'string' ? { sid: verifiedClaims.sid } : {}),
      scopes,
      ...(organizationId ? { organizationId } : {}),
      introspection,
    },
  };
}

/** Extracts exactly one non-empty Bearer credential without cookie fallback. */
export function extractProtectedAutomationBearer(request: Request): string | null {
  const value = request.headers.get('authorization');
  if (!value) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(value);
  return match?.[1] || null;
}
