import { describe, it, expect, vi } from 'vitest';
import { loadOrganizationUserRoles } from './index';
import { ValidationError } from '../logic/validation';

vi.mock('../logic/actions', () => ({
  getOrganizationUserRoles: vi.fn().mockResolvedValue({ ok: true, data: [] }),
  getUserRoles: vi.fn(),
  getUserScopes: vi.fn(),
  getOrganizationUserPermissions: vi.fn(),
  getOrgPermissionsWithDescriptions: vi.fn(),
}));

describe('loadOrganizationUserRoles', () => {
  it('allows safe Logto IDs', async () => {
    const result = await loadOrganizationUserRoles('valid-org-id');
    expect(result).toEqual({ ok: true, data: [] });
  });

  it('rejects unsafe Logto IDs with ValidationError', async () => {
    await expect(loadOrganizationUserRoles('../invalid/path')).rejects.toThrow(ValidationError);
  });
});
