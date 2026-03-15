import { createRemoteJWKSet, jwtVerify } from 'jose';
import { logtoConfig } from '../../logto';
import type { ValidatedTokenClaims } from './types';

let JWKS: ReturnType<typeof createRemoteJWKSet> | null = null;
let JWKS_LAST_REFRESH = 0;
const JWKS_REFRESH_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

function getJWKS() {
  const now = Date.now();
  if (!JWKS || now - JWKS_LAST_REFRESH > JWKS_REFRESH_INTERVAL_MS) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[RBAC] Lazy-initializing/refreshing JWKS...');
    }
    JWKS = createRemoteJWKSet(new URL(`${logtoConfig.endpoint}/oidc/jwks`));
    JWKS_LAST_REFRESH = now;
    if (process.env.NODE_ENV !== 'production') {
      console.log('[RBAC] JWKS initialized successfully');
    }
  }
  return JWKS;
}

export function invalidateJWKS(): void {
  JWKS = null;
  JWKS_LAST_REFRESH = 0;
}

export async function validateToken(token: string): Promise<ValidatedTokenClaims> {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[RBAC] validateToken called');
    console.log('[RBAC] Token prefix:', token.substring(0, 50) + '...');
  }

  try {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[RBAC] Getting JWKS...');
    }
    const jwks = getJWKS();
    if (process.env.NODE_ENV !== 'production') {
      console.log('[RBAC] JWKS obtained, verifying token...');
    }

    const { payload } = await jwtVerify(token, jwks, {
      issuer: `${logtoConfig.endpoint}/oidc`,
      audience: logtoConfig.appId,
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log('[RBAC] Token verified successfully');
      console.log('[RBAC] Token sub:', payload.sub);
      console.log('[RBAC] Token aud:', payload.aud);
      console.log('[RBAC] Token scope:', payload.scope);
      console.log('[RBAC] Token organization_id:', payload.organization_id);
    }

    const sub = payload.sub;
    if (!sub) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[RBAC] Token missing sub claim!');
      }
      throw new Error('Token missing sub claim');
    }

    const aud = payload.aud;
    const scope = typeof payload.scope === 'string' ? payload.scope : '';
    const scopes = scope.split(' ').filter(Boolean);

    const organizationId = payload.organization_id as string | undefined;

    let tokenType: ValidatedTokenClaims['tokenType'];
    let orgId: string | undefined;

    const audiences = Array.isArray(aud) ? aud : aud ? [aud] : [] as string[];

    const orgAudience = audiences.find((a) => String(a).startsWith('urn:logto:organization:'));

    if (orgAudience) {
      tokenType = 'org-non-api';
      orgId = String(orgAudience).replace('urn:logto:organization:', '');
      if (process.env.NODE_ENV !== 'production') {
        console.log('[RBAC] Detected org-non-api token, orgId:', orgId);
      }
    } else if (organizationId) {
      tokenType = 'org-api-resource';
      orgId = organizationId;
      if (process.env.NODE_ENV !== 'production') {
        console.log('[RBAC] Detected org-api-resource token, orgId:', orgId);
      }
    } else {
      tokenType = 'global';
      if (process.env.NODE_ENV !== 'production') {
        console.log('[RBAC] Detected global token');
      }
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('[RBAC] Validation complete, returning claims');
    }

    return {
      sub,
      scopes,
      tokenType,
      orgId,
      aud: aud ?? (typeof sub === 'string' ? logtoConfig.appId : []),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[RBAC] Token validation failed:', errorMessage);
    throw error;
  }
}
