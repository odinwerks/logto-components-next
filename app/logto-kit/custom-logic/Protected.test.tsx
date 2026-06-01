import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

// Mock helpers/hoisted values if needed, or simply mock using standard vi.mock
const mockUseOrgMode = vi.fn();
const mockUseLogto = vi.fn();
const mockLoadPersonalPermissions = vi.fn();
const mockLoadPersonalRoles = vi.fn();
const mockLoadOrganizationUserRoles = vi.fn();
const mockLoadOrganizationPermissions = vi.fn();

vi.mock('../components/providers/preferences', () => ({
  useOrgMode: () => mockUseOrgMode(),
}));

vi.mock('../components/providers/logto-provider', () => ({
  useLogto: () => mockUseLogto(),
}));

vi.mock('../server-actions/load-personal-permissions', () => ({
  loadPersonalPermissions: () => mockLoadPersonalPermissions(),
}));

vi.mock('../server-actions/load-personal-roles', () => ({
  loadPersonalRoles: () => mockLoadPersonalRoles(),
}));

vi.mock('../server-actions/load-org-roles', () => ({
  loadOrganizationUserRoles: (orgId: string) => mockLoadOrganizationUserRoles(orgId),
}));

vi.mock('../server-actions/load-org-permissions', () => ({
  loadOrganizationPermissions: (orgId: string) => mockLoadOrganizationPermissions(orgId),
}));

import { Protected } from './Protected';

describe('Protected component (Dual-RBAC & strict asOrg)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('When orgId === "self" (Self/User RBAC mode)', () => {
    it('ONLY calls loadPersonalRoles and does NOT call loadPersonalPermissions', async () => {
      mockUseOrgMode.mockReturnValue({ asOrg: null });
      mockUseLogto.mockReturnValue({
        userData: { id: 'user_123', organizations: [] },
      });
      mockLoadPersonalRoles.mockResolvedValue({ ok: true, data: [{ id: 'role_admin' }] });

      render(
        <Protected orgId="self" roleId="role_admin">
          <div>Secret Personal Content</div>
        </Protected>
      );

      await waitFor(() => {
        expect(screen.getByText('Secret Personal Content')).toBeInTheDocument();
      });

      expect(mockLoadPersonalRoles).toHaveBeenCalledTimes(1);
      expect(mockLoadPersonalPermissions).not.toHaveBeenCalled();
    });

    it('denies access if the user does not have the required roleId', async () => {
      mockUseOrgMode.mockReturnValue({ asOrg: null });
      mockUseLogto.mockReturnValue({
        userData: { id: 'user_123', organizations: [] },
      });
      mockLoadPersonalRoles.mockResolvedValue({ ok: true, data: [{ id: 'role_user' }] });

      render(
        <Protected orgId="self" roleId="role_admin" fallback={<div>Access Denied</div>}>
          <div>Secret Personal Content</div>
        </Protected>
      );

      await waitFor(() => {
        expect(screen.getByText('Access Denied')).toBeInTheDocument();
        expect(screen.queryByText('Secret Personal Content')).not.toBeInTheDocument();
      });
    });

    it('ignores permission (perm) check in personal scope', async () => {
      mockUseOrgMode.mockReturnValue({ asOrg: null });
      mockUseLogto.mockReturnValue({
        userData: { id: 'user_123', organizations: [] },
      });
      mockLoadPersonalRoles.mockResolvedValue({ ok: true, data: [{ id: 'role_admin' }] });

      render(
        <Protected orgId="self" roleId="role_admin" perm="some_perm">
          <div>Secret Personal Content</div>
        </Protected>
      );

      await waitFor(() => {
        expect(screen.getByText('Secret Personal Content')).toBeInTheDocument();
      });

      expect(mockLoadPersonalPermissions).not.toHaveBeenCalled();
    });
  });

  describe('When orgId !== "self" (Organization RBAC mode)', () => {
    it('breaks immediately and fetches nothing if asOrg !== orgId', async () => {
      mockUseOrgMode.mockReturnValue({ asOrg: 'org_different' });
      mockUseLogto.mockReturnValue({
        userData: {
          id: 'user_123',
          organizations: [{ id: 'org_123', name: 'Org 123' }],
        },
      });

      render(
        <Protected orgId="org_123" fallback={<div>Mismatch</div>}>
          <div>Org Content</div>
        </Protected>
      );

      await waitFor(() => {
        expect(screen.getByText('Mismatch')).toBeInTheDocument();
      });

      expect(mockLoadOrganizationUserRoles).not.toHaveBeenCalled();
      expect(mockLoadOrganizationPermissions).not.toHaveBeenCalled();
    });

    it('fetches both organization roles and permissions in parallel if asOrg === orgId', async () => {
      mockUseOrgMode.mockReturnValue({ asOrg: 'org_123' });
      mockUseLogto.mockReturnValue({
        userData: {
          id: 'user_123',
          organizations: [{ id: 'org_123', name: 'Org 123' }],
        },
      });
      mockLoadOrganizationUserRoles.mockResolvedValue({ ok: true, data: [{ id: 'org_role_admin' }] });
      mockLoadOrganizationPermissions.mockResolvedValue({ ok: true, data: ['org_perm_edit'] });

      render(
        <Protected orgId="org_123" roleId="org_role_admin" perm="org_perm_edit">
          <div>Secret Org Content</div>
        </Protected>
      );

      await waitFor(() => {
        expect(screen.getByText('Secret Org Content')).toBeInTheDocument();
      });

      expect(mockLoadOrganizationUserRoles).toHaveBeenCalledWith('org_123');
      expect(mockLoadOrganizationPermissions).toHaveBeenCalledWith('org_123');
    });

    it('denies access if user has correct role but incorrect permission', async () => {
      mockUseOrgMode.mockReturnValue({ asOrg: 'org_123' });
      mockUseLogto.mockReturnValue({
        userData: {
          id: 'user_123',
          organizations: [{ id: 'org_123', name: 'Org 123' }],
        },
      });
      
      mockLoadOrganizationUserRoles.mockResolvedValue({ ok: true, data: [{ id: 'org_role_admin' }] });
      mockLoadOrganizationPermissions.mockResolvedValue({ ok: true, data: [] });

      render(
        <Protected orgId="org_123" roleId="org_role_admin" perm="org_perm_edit" fallback={<div>Denied</div>}>
          <div>Secret Org Content</div>
        </Protected>
      );

      await waitFor(() => {
        expect(screen.getByText('Denied')).toBeInTheDocument();
      });
    });

    it('denies access if user has correct permission but incorrect role', async () => {
      mockUseOrgMode.mockReturnValue({ asOrg: 'org_123' });
      mockUseLogto.mockReturnValue({
        userData: {
          id: 'user_123',
          organizations: [{ id: 'org_123', name: 'Org 123' }],
        },
      });

      mockLoadOrganizationUserRoles.mockResolvedValue({ ok: true, data: [] });
      mockLoadOrganizationPermissions.mockResolvedValue({ ok: true, data: ['org_perm_edit'] });

      render(
        <Protected orgId="org_123" roleId="org_role_admin" perm="org_perm_edit" fallback={<div>Denied</div>}>
          <div>Secret Org Content</div>
        </Protected>
      );

      await waitFor(() => {
        expect(screen.getByText('Denied')).toBeInTheDocument();
      });
    });

    it('allows access if user has both the correct role and permission', async () => {
      mockUseOrgMode.mockReturnValue({ asOrg: 'org_123' });
      mockUseLogto.mockReturnValue({
        userData: {
          id: 'user_123',
          organizations: [{ id: 'org_123', name: 'Org 123' }],
        },
      });

      mockLoadOrganizationUserRoles.mockResolvedValue({ ok: true, data: [{ id: 'org_role_admin' }] });
      mockLoadOrganizationPermissions.mockResolvedValue({ ok: true, data: ['org_perm_edit'] });

      render(
        <Protected orgId="org_123" roleId="org_role_admin" perm="org_perm_edit" fallback={<div>Denied</div>}>
          <div>Secret Org Content</div>
        </Protected>
      );

      await waitFor(() => {
        expect(screen.getByText('Secret Org Content')).toBeInTheDocument();
      });
    });
  });
});
