export interface ValidatedTokenClaims {
  sub: string;
  scopes: string[];
  tokenType: 'org-non-api' | 'org-api-resource' | 'global';
  orgId?: string;
  aud: string | string[];
}

export interface OrganizationData {
  id: string;
  name: string;
  description?: string;
}
