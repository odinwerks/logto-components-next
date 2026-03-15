export interface ProtectedRequirements {
  perm?: string | string[];
  role?: string | string[];
  orgId?: string | null;
  requireAll?: boolean;
  // Removed: userId (now gets from claims)
  // Removed: userData (now fetched internally)
}

export interface ValidatedTokenClaims {
  sub: string;
  scopes: string[];
  tokenType: 'org-non-api' | 'org-api-resource' | 'global';
  orgId?: string;
  aud: string | string[];
}

export type ProtectedResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: ProtectedFailReason; detail?: string };

export type ProtectedFailReason =
  | 'TOKEN_INACTIVE'
  | 'SUBJECT_MISMATCH'
  | 'ORG_MISMATCH'
  | 'MISSING_PERM'
  | 'MISSING_ROLE'
  | 'VALIDATION_ERROR';

export interface OrganizationData {
  id: string;
  name: string;
  description?: string;
}
