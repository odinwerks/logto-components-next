'use server';

interface RbacValidationResult {
  ok: boolean;
  error?: 'NO_ORG_SELECTED' | 'ORG_NOT_MEMBER' | 'PERMISSION_DENIED' | 'ROLE_DENIED' | 'VALIDATION_ERROR' | 'ACTION_NOT_FOUND' | 'TOKEN_INVALID';
  detail?: string;
}

export async function validateOrgMembership(userOrgs: string[], asOrg: string | null): Promise<RbacValidationResult> {
  if (!asOrg) {
    return { ok: false, error: 'NO_ORG_SELECTED', detail: 'User has no organization selected' };
  }

  if (!userOrgs.includes(asOrg)) {
    return { ok: false, error: 'ORG_NOT_MEMBER', detail: 'Selected organization not in user orgs' };
  }

  return { ok: true };
}
