import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';

// Mock helpers/hoisted values if needed, or simply mock using standard vi.mock
const mockUseOrgMode = vi.fn();
const mockUseUserDataContext = vi.fn();
const mockLoadPersonalPermissions = vi.fn();
const mockLoadPersonalRoles = vi.fn();
const mockLoadOrganizationUserRoles = vi.fn();
const mockLoadOrganizationPermissions = vi.fn();

vi.mock('../components/providers/preferences', () => ({
  useOrgMode: () => mockUseOrgMode(),
}));

vi.mock('../components/providers/user-data-context', () => ({
  useUserDataContext: () => mockUseUserDataContext(),
}));

vi.mock('../server-actions', () => ({
  loadPersonalPermissions: () => mockLoadPersonalPermissions(),
  loadPersonalRoles: () => mockLoadPersonalRoles(),
  loadOrganizationUserRoles: (orgId: string) => mockLoadOrganizationUserRoles(orgId),
  loadOrganizationPermissions: (orgId: string) => mockLoadOrganizationPermissions(orgId),
}));

// Mock useToast — Protected now fires denial toasts via the unified toast context.
vi.mock('../components/providers/toast-provider', () => ({
  useToast: () => ({
    showToast: vi.fn(),
    dismissToast: vi.fn(),
    dismissAll: vi.fn(),
    mapErrorToast: vi.fn((code: string) => code),
    setSuppressAll: vi.fn(),
  }),
}));

import { Protected } from '../logic/Protected';

describe('Protected component (Dual-RBAC & strict asOrg)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('When orgId === "self" (Self/User RBAC mode)', () => {
    it('calls both loadPersonalRoles and loadPersonalPermissions concurrently', async () => {
      mockUseOrgMode.mockReturnValue({ asOrg: null });
      mockUseUserDataContext.mockReturnValue({
        id: 'user_123',
        organizations: [],
      });
      mockLoadPersonalRoles.mockResolvedValue({ ok: true, data: [{ id: 'role_admin' }] });
      mockLoadPersonalPermissions.mockResolvedValue({ ok: true, data: [] });

      render(
        <Protected orgId="self" roleId="role_admin">
          <div>Secret Personal Content</div>
        </Protected>
      );

      await waitFor(() => {
        expect(screen.getByText('Secret Personal Content')).toBeInTheDocument();
      });

      expect(mockLoadPersonalRoles).toHaveBeenCalledTimes(1);
      expect(mockLoadPersonalPermissions).toHaveBeenCalledTimes(1);
    });

    it('denies access if the user does not have the required roleId', async () => {
      mockUseOrgMode.mockReturnValue({ asOrg: null });
      mockUseUserDataContext.mockReturnValue({
        id: 'user_123',
        organizations: [],
      });
      mockLoadPersonalRoles.mockResolvedValue({ ok: true, data: [{ id: 'role_user' }] });
      mockLoadPersonalPermissions.mockResolvedValue({ ok: true, data: [] });

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

    it('validates permission (perm) check in personal scope', async () => {
      mockUseOrgMode.mockReturnValue({ asOrg: null });
      mockUseUserDataContext.mockReturnValue({
        id: 'user_123',
        organizations: [],
      });
      mockLoadPersonalRoles.mockResolvedValue({ ok: true, data: [{ id: 'role_admin' }] });
      mockLoadPersonalPermissions.mockResolvedValue({ ok: true, data: [{ scope: 'some_perm' }] });

      render(
        <Protected orgId="self" roleId="role_admin" perm="some_perm">
          <div>Secret Personal Content</div>
        </Protected>
      );

      await waitFor(() => {
        expect(screen.getByText('Secret Personal Content')).toBeInTheDocument();
      });

      expect(mockLoadPersonalPermissions).toHaveBeenCalledTimes(1);
    });

    it('denies access if the user lacks the required personal permission', async () => {
      mockUseOrgMode.mockReturnValue({ asOrg: null });
      mockUseUserDataContext.mockReturnValue({
        id: 'user_123',
        organizations: [],
      });
      mockLoadPersonalRoles.mockResolvedValue({ ok: true, data: [{ id: 'role_admin' }] });
      mockLoadPersonalPermissions.mockResolvedValue({ ok: true, data: [{ scope: 'other_perm' }] });

      render(
        <Protected orgId="self" perm="some_perm" fallback={<div>Access Denied</div>}>
          <div>Secret Personal Content</div>
        </Protected>
      );

      await waitFor(() => {
        expect(screen.getByText('Access Denied')).toBeInTheDocument();
        expect(screen.queryByText('Secret Personal Content')).not.toBeInTheDocument();
      });
    });

    it('supports personal roles and personal permissions when orgId is omitted', async () => {
      mockUseOrgMode.mockReturnValue({ asOrg: null });
      mockUseUserDataContext.mockReturnValue({
        id: 'user_123',
        organizations: [],
      });
      mockLoadPersonalRoles.mockResolvedValue({ ok: true, data: [{ id: 'role_admin' }] });
      mockLoadPersonalPermissions.mockResolvedValue({ ok: true, data: [{ scope: 'some_perm' }] });

      render(
        <Protected roleId="role_admin" perm="some_perm">
          <div>Secret Personal Content</div>
        </Protected>
      );

      await waitFor(() => {
        expect(screen.getByText('Secret Personal Content')).toBeInTheDocument();
      });

      expect(mockLoadPersonalRoles).toHaveBeenCalledTimes(1);
      expect(mockLoadPersonalPermissions).toHaveBeenCalledTimes(1);
    });

    it('denies access when orgId is omitted and user lacks required personal roles or permissions', async () => {
      mockUseOrgMode.mockReturnValue({ asOrg: null });
      mockUseUserDataContext.mockReturnValue({
        id: 'user_123',
        organizations: [],
      });
      mockLoadPersonalRoles.mockResolvedValue({ ok: true, data: [{ id: 'role_user' }] });
      mockLoadPersonalPermissions.mockResolvedValue({ ok: true, data: [{ scope: 'some_perm' }] });

      render(
        <Protected roleId="role_admin" perm="some_perm" fallback={<div>Access Denied</div>}>
          <div>Secret Personal Content</div>
        </Protected>
      );

      await waitFor(() => {
        expect(screen.getByText('Access Denied')).toBeInTheDocument();
        expect(screen.queryByText('Secret Personal Content')).not.toBeInTheDocument();
      });
    });
  });

  describe('When orgId !== "self" (Organization RBAC mode)', () => {
    it('breaks immediately and fetches nothing if asOrg !== orgId', async () => {
      mockUseOrgMode.mockReturnValue({ asOrg: 'org_different' });
      mockUseUserDataContext.mockReturnValue({
        id: 'user_123',
        organizations: [{ id: 'org_123', name: 'Org 123' }],
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
      mockUseUserDataContext.mockReturnValue({
        id: 'user_123',
        organizations: [{ id: 'org_123', name: 'Org 123' }],
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
      mockUseUserDataContext.mockReturnValue({
        id: 'user_123',
        organizations: [{ id: 'org_123', name: 'Org 123' }],
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
      mockUseUserDataContext.mockReturnValue({
        id: 'user_123',
        organizations: [{ id: 'org_123', name: 'Org 123' }],
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
      mockUseUserDataContext.mockReturnValue({
        id: 'user_123',
        organizations: [{ id: 'org_123', name: 'Org 123' }],
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

  describe('BUG-014: children preserved during a subsequent in-flight permission load', () => {
    // Helper that returns a controllable never-resolving-by-default promise so a
    // load can be held "in-flight" while we assert the rendered output.
    function stalled<T>() {
      let resolve!: (v: T) => void;
      const promise = new Promise<T>((r) => { resolve = r; });
      return { promise, resolve };
    }

    const twoOrgs = [
      { id: 'org_A', name: 'A' },
      { id: 'org_B', name: 'B' },
    ];

    it('shows fallback (not children) during the FIRST in-flight load', async () => {
      mockUseOrgMode.mockReturnValue({ asOrg: 'org_A' });
      mockUseUserDataContext.mockReturnValue({ id: 'user_1', organizations: twoOrgs });

      const perms = stalled<{ ok: true; data: string[] }>();
      const roles = stalled<{ ok: true; data: { id: string }[] }>();
      mockLoadOrganizationPermissions.mockImplementationOnce(() => perms.promise);
      mockLoadOrganizationUserRoles.mockImplementationOnce(() => roles.promise);

      render(
        <Protected orgId="org_A" perm="perm_x" fallback={<div>Denied</div>}>
          <div>Hidden</div>
        </Protected>
      );

      // First load: hasLoadedOnce is false, so we must NOT reveal the children
      // early — fallback is shown while the load is in-flight.
      expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
      expect(screen.getByText('Denied')).toBeInTheDocument();

      // Release the pending promises so the test tears down cleanly (wrapped in
      // act() because resolving triggers a reducer dispatch / state update).
      await act(async () => {
        perms.resolve({ ok: true, data: ['perm_x'] });
        roles.resolve({ ok: true, data: [{ id: 'role_x' }] });
      });
    });

    it('keeps authorized children mounted during a subsequent in-flight load', async () => {
      // First scope (org_A): authorized.
      mockUseOrgMode.mockReturnValue({ asOrg: 'org_A' });
      mockUseUserDataContext.mockReturnValue({ id: 'user_1', organizations: twoOrgs });
      mockLoadOrganizationPermissions.mockResolvedValueOnce({ ok: true, data: ['perm_x'] });
      mockLoadOrganizationUserRoles.mockResolvedValueOnce({ ok: true, data: [{ id: 'role_x' }] });

      const { rerender } = render(
        <Protected orgId="org_A" perm="perm_x" fallback={<div>Denied</div>}>
          <div>Survivor</div>
        </Protected>
      );

      // Wait for the first authorization to commit.
      await waitFor(() => expect(screen.getByText('Survivor')).toBeInTheDocument());

      // Switch scope to org_B and stall its loaders so a load is in-flight.
      const perms = stalled<{ ok: true; data: string[] }>();
      const roles = stalled<{ ok: true; data: { id: string }[] }>();
      mockLoadOrganizationPermissions.mockImplementationOnce(() => perms.promise);
      mockLoadOrganizationUserRoles.mockImplementationOnce(() => roles.promise);

      mockUseOrgMode.mockReturnValue({ asOrg: 'org_B' });
      mockUseUserDataContext.mockReturnValue({ id: 'user_1', organizations: twoOrgs });

      rerender(
        <Protected orgId="org_B" perm="perm_x" fallback={<div>Denied</div>}>
          <div>Survivor</div>
        </Protected>
      );

      // During the in-flight load, the previously authorized children must stay
      // mounted instead of collapsing to the fallback (BUG-014).
      expect(screen.getByText('Survivor')).toBeInTheDocument();
      expect(screen.queryByText('Denied')).not.toBeInTheDocument();

      // Let the stalled load resolve to an authorized result and confirm the
      // children remain (cleanup so the test does not leak a pending promise).
      await act(async () => {
        perms.resolve({ ok: true, data: ['perm_x'] });
        roles.resolve({ ok: true, data: [{ id: 'role_x' }] });
      });
      await waitFor(() => expect(screen.getByText('Survivor')).toBeInTheDocument());
    });

    it('does NOT reveal previously-denied children during a subsequent in-flight load', async () => {
      // First scope (org_A): denied (lacks the required permission).
      mockUseOrgMode.mockReturnValue({ asOrg: 'org_A' });
      mockUseUserDataContext.mockReturnValue({ id: 'user_1', organizations: twoOrgs });
      mockLoadOrganizationPermissions.mockResolvedValueOnce({ ok: true, data: [] });
      mockLoadOrganizationUserRoles.mockResolvedValueOnce({ ok: true, data: [] });

      const { rerender } = render(
        <Protected orgId="org_A" perm="perm_x" fallback={<div>Denied</div>}>
          <div>Hidden</div>
        </Protected>
      );

      await waitFor(() => {
        expect(screen.getByText('Denied')).toBeInTheDocument();
        expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
      });

      // Switch scope to org_B and stall its loaders.
      const perms = stalled<{ ok: true; data: string[] }>();
      const roles = stalled<{ ok: true; data: { id: string }[] }>();
      mockLoadOrganizationPermissions.mockImplementationOnce(() => perms.promise);
      mockLoadOrganizationUserRoles.mockImplementationOnce(() => roles.promise);

      mockUseOrgMode.mockReturnValue({ asOrg: 'org_B' });
      mockUseUserDataContext.mockReturnValue({ id: 'user_1', organizations: twoOrgs });

      rerender(
        <Protected orgId="org_B" perm="perm_x" fallback={<div>Denied</div>}>
          <div>Hidden</div>
        </Protected>
      );

      // lastAuthorized was false (org_A denied), so the in-flight render must
      // keep showing the fallback and never briefly reveal "Hidden".
      expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
      expect(screen.getByText('Denied')).toBeInTheDocument();

      await act(async () => {
        perms.resolve({ ok: true, data: [] });
        roles.resolve({ ok: true, data: [] });
      });
    });
  });
});
