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

describe('server-actions/index module (BUG-M13)', () => {
  it('has "use server" as the first line', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const filePath = path.resolve(__dirname, 'index.ts');
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content.trimStart().startsWith("'use server'")).toBe(true);
  });
});
