import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import type { UserData } from '../../../logic/types';
import { DARK_COLORS } from '../../../themes';
import { enUS } from '../../../locales/en-US';

const {
  mockRefresh,
  mockSetAsOrg,
  mockSetActiveOrg,
  mockLoadOrganizationPermissions,
  mockLoadOrganizationUserRoles,
  mockLoadOrgPermissionDescriptions,
  mockOrgMode,
} = vi.hoisted(() => ({
  mockRefresh: vi.fn(),
  mockSetAsOrg: vi.fn(),
  mockSetActiveOrg: vi.fn<(_orgId: string | null) => Promise<boolean>>(),
  mockLoadOrganizationPermissions: vi.fn().mockResolvedValue({ ok: true, data: [] }),
  mockLoadOrganizationUserRoles: vi.fn().mockResolvedValue({ ok: true, data: [] }),
  mockLoadOrgPermissionDescriptions: vi.fn().mockResolvedValue({ ok: true, data: [] }),
  mockOrgMode: { asOrg: null as string | null },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

vi.mock('@logto/next/server-actions', () => ({
  default: vi.fn(),
  getLogtoContext: vi.fn(),
  getAccessToken: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('../../providers/preferences', () => ({
  useOrgMode: () => ({ asOrg: mockOrgMode.asOrg, setAsOrg: mockSetAsOrg }),
}));

vi.mock('../../../custom-logic/set-active-org', () => ({
  setActiveOrg: (...args: [string | null]) => mockSetActiveOrg(...args),
}));

vi.mock('../../../server-actions/load-org-permissions', () => ({
  loadOrganizationPermissions: (...args: unknown[]) => mockLoadOrganizationPermissions(...args),
}));

vi.mock('../../../server-actions/load-org-roles', () => ({
  loadOrganizationUserRoles: (...args: unknown[]) => mockLoadOrganizationUserRoles(...args),
}));

vi.mock('../../../server-actions/load-org-permission-descriptions', () => ({
  loadOrgPermissionDescriptions: (...args: unknown[]) => mockLoadOrgPermissionDescriptions(...args),
}));

import { OrganizationsTab } from './organizations';

const baseUserData: UserData = {
  id: 'user-1',
  username: 'user-1',
  name: 'User One',
  avatar: undefined,
  primaryEmail: 'user@example.com',
  primaryPhone: '+15550000000',
  profile: { givenName: 'User', familyName: 'One' },
  identities: {},
  customData: {},
  createdAt: 0,
  updatedAt: 0,
  organizations: [
    { id: 'org-1', name: 'Org One' },
    { id: 'org-2', name: 'Org Two' },
  ],
  organizationRoles: [
    { id: 'role-1', name: 'stale-role-name', organizationId: 'org-1' },
  ],
};

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function renderOrganizations(options?: { asOrg?: string | null; currentOrgId?: string; userData?: UserData }) {
  mockOrgMode.asOrg = options?.asOrg ?? null;
  const userData = options?.userData ?? baseUserData;

  render(
    <OrganizationsTab
      userData={userData}
      currentOrgId={options?.currentOrgId}
      mode="dark"
      colors={DARK_COLORS}
      t={enUS}
    />,
  );
}

function getOrgPermissionsRefreshButton() {
  const refreshButton = screen.getByRole('button', { name: enUS.organizations.refreshOrgPermissions });
  expect(refreshButton).toBeInTheDocument();
  return refreshButton as HTMLButtonElement;
}

describe('OrganizationsTab - BUG-002 clear-org semantics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOrgMode.asOrg = null;
    mockSetActiveOrg.mockResolvedValue(true);
  });

  it('does not fall back to stale currentOrgId when asOrg is explicitly null', () => {
    renderOrganizations({ asOrg: null, currentOrgId: 'org-1' });

    // Explicit null means "be yourself" mode, even if server prop is stale.
    expect(screen.queryByRole('button', { name: /be yourself/i })).toBeNull();
    expect(screen.getAllByText(enUS.organizations.selectOrgForRoles).length).toBeGreaterThan(0);
    expect(screen.getByText(enUS.organizations.noActiveOrg)).toBeInTheDocument();
    expect(screen.queryByText('stale-role-name')).toBeNull();
  });

  it('awaits server-side clear-org persistence before local state update and refresh', async () => {
    const pendingClear = deferred<boolean>();
    mockSetActiveOrg.mockReturnValue(pendingClear.promise);

    renderOrganizations({ asOrg: 'org-1', currentOrgId: 'org-1' });

    const beYourselfButton = screen.getByRole('button', { name: /be yourself/i });
    await act(async () => {
      fireEvent.click(beYourselfButton);
    });

    expect(mockSetActiveOrg).toHaveBeenCalledWith(null);
    expect(mockSetAsOrg).not.toHaveBeenCalled();
    expect(mockRefresh).not.toHaveBeenCalled();

    await act(async () => {
      pendingClear.resolve(true);
      await pendingClear.promise;
    });

    await waitFor(() => {
      expect(mockSetAsOrg).toHaveBeenCalledWith(null);
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });
  });
});

describe('OrganizationsTab - BUG-008 permissions loading synchronization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOrgMode.asOrg = null;
    mockSetActiveOrg.mockResolvedValue(true);
  });

  it('keeps loading until permissions settle when descriptions resolve first', async () => {
    const permissionsRequest = deferred<{ ok: true; data: string[] }>();
    const descriptionsRequest = deferred<{ ok: true; data: [] }>();

    mockLoadOrganizationPermissions.mockImplementation(() => permissionsRequest.promise);
    mockLoadOrgPermissionDescriptions.mockImplementation(() => descriptionsRequest.promise);

    renderOrganizations({ asOrg: 'org-1', currentOrgId: 'org-1' });

    expect(mockLoadOrganizationPermissions).toHaveBeenCalledWith('org-1');
    expect(mockLoadOrgPermissionDescriptions).toHaveBeenCalledWith('org-1');
    await waitFor(() => {
      expect(getOrgPermissionsRefreshButton()).toBeDisabled();
      expect(screen.getByText(enUS.organizations.loadingPermissions)).toBeInTheDocument();
    });

    await act(async () => {
      descriptionsRequest.resolve({ ok: true, data: [] });
      await descriptionsRequest.promise;
    });

    expect(screen.getByText(enUS.organizations.loadingPermissions)).toBeInTheDocument();
    expect(screen.queryByText(enUS.organizations.noOrgPermissions)).toBeNull();

    await act(async () => {
      permissionsRequest.resolve({ ok: true, data: ['read:org'] });
      await permissionsRequest.promise;
    });

    expect(await screen.findByText('read:org')).toBeInTheDocument();
  });

  it('keeps refresh disabled until descriptions settle when permissions resolve first', async () => {
    const permissionsRequest = deferred<{ ok: true; data: string[] }>();
    const descriptionsRequest = deferred<{ ok: true; data: [] }>();

    mockLoadOrganizationPermissions.mockImplementation(() => permissionsRequest.promise);
    mockLoadOrgPermissionDescriptions.mockImplementation(() => descriptionsRequest.promise);

    renderOrganizations({ asOrg: 'org-1', currentOrgId: 'org-1' });

    expect(getOrgPermissionsRefreshButton()).toBeDisabled();

    await act(async () => {
      permissionsRequest.resolve({ ok: true, data: ['read:org'] });
      await permissionsRequest.promise;
    });

    expect(await screen.findByText('read:org')).toBeInTheDocument();
    expect(getOrgPermissionsRefreshButton()).toBeDisabled();

    await act(async () => {
      descriptionsRequest.resolve({ ok: true, data: [] });
      await descriptionsRequest.promise;
    });

    await waitFor(() => {
      expect(getOrgPermissionsRefreshButton()).not.toBeDisabled();
    });
  });

  it('keeps loading until permissions settle when descriptions fail first', async () => {
    const permissionsRequest = deferred<{ ok: true; data: string[] }>();
    const descriptionsRequest = deferred<never>();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockLoadOrganizationPermissions.mockImplementation(() => permissionsRequest.promise);
    mockLoadOrgPermissionDescriptions.mockImplementation(() => descriptionsRequest.promise);

    try {
      renderOrganizations({ asOrg: 'org-1', currentOrgId: 'org-1' });

      await waitFor(() => {
        expect(getOrgPermissionsRefreshButton()).toBeDisabled();
        expect(screen.getByText(enUS.organizations.loadingPermissions)).toBeInTheDocument();
      });

      await act(async () => {
        descriptionsRequest.reject(new Error('descriptions failed'));
        try {
          await descriptionsRequest.promise;
        } catch {
          // expected test-path rejection
        }
      });

      expect(screen.getByText(enUS.organizations.loadingPermissions)).toBeInTheDocument();

      await act(async () => {
        permissionsRequest.resolve({ ok: true, data: [] });
        await permissionsRequest.promise;
      });

      await waitFor(() => {
        expect(screen.getByText(enUS.organizations.noOrgPermissions)).toBeInTheDocument();
      });
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });
});

describe('OrganizationsTab - error message semantic correctness', () => {
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  beforeEach(() => {
    vi.clearAllMocks();
    mockOrgMode.asOrg = null;
    mockSetActiveOrg.mockResolvedValue(true);
  });

  afterEach(() => {
    consoleErrorSpy.mockClear();
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  it('shows switchFailed message when handleOrgClick catches an error', async () => {
    mockSetActiveOrg.mockRejectedValueOnce(new Error('network error'));

    renderOrganizations({ asOrg: null, currentOrgId: 'org-1' });

    const orgOneCard = screen.getByRole('radio', { name: /Org One/i });
    await act(async () => {
      fireEvent.click(orgOneCard);
    });

    await waitFor(() => {
      expect(screen.getByText(enUS.organizations.switchFailed!)).toBeInTheDocument();
    });
  });

  it('shows clearOrgFailed message when handleBeYourself setActiveOrg returns false', async () => {
    mockSetActiveOrg.mockResolvedValueOnce(false);

    renderOrganizations({ asOrg: 'org-1', currentOrgId: 'org-1' });

    const beYourselfButton = screen.getByRole('button', { name: /be yourself/i });
    await act(async () => {
      fireEvent.click(beYourselfButton);
    });

    await waitFor(() => {
      expect(screen.getByText(enUS.organizations.clearOrgFailed!)).toBeInTheDocument();
    });
  });

  it('shows clearOrgFailed message when handleBeYourself catches an error', async () => {
    mockSetActiveOrg.mockRejectedValueOnce(new Error('network error'));

    renderOrganizations({ asOrg: 'org-1', currentOrgId: 'org-1' });

    const beYourselfButton = screen.getByRole('button', { name: /be yourself/i });
    await act(async () => {
      fireEvent.click(beYourselfButton);
    });

    await waitFor(() => {
      expect(screen.getByText(enUS.organizations.clearOrgFailed!)).toBeInTheDocument();
    });
  });
});

describe('OrganizationsTab - BUG-011 keyboard reachable tooltips', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOrgMode.asOrg = null;
    mockSetActiveOrg.mockResolvedValue(true);
  });

  it('triggers tooltip when focusing on OrgCard', async () => {
    renderOrganizations({ asOrg: 'org-1', currentOrgId: 'org-1' });

    // Find the OrgCard for "Org One"
    const orgOneCard = screen.getByRole('radio', { name: /Org One/i });
    expect(orgOneCard).toBeInTheDocument();

    // Tooltip is not shown yet
    expect(screen.queryByText('org-1')).toBeNull();

    // Focus on the OrgCard
    await act(async () => {
      fireEvent.focus(orgOneCard);
    });

    // Tooltip should be rendered
    await waitFor(() => {
      expect(screen.getByText('org-1')).toBeInTheDocument();
    });

    // Blur the OrgCard
    await act(async () => {
      fireEvent.blur(orgOneCard);
    });

    // Tooltip should be gone
    await waitFor(() => {
      expect(screen.queryByText('org-1')).toBeNull();
    });
  });

  it('triggers tooltip when focusing on PermissionsBlock permission Info button', async () => {
    mockLoadOrganizationPermissions.mockResolvedValue({ ok: true, data: ['read:org'] });
    mockLoadOrgPermissionDescriptions.mockResolvedValue({ ok: true, data: [{ name: 'read:org', description: 'Read organization' }] });

    renderOrganizations({ asOrg: 'org-1', currentOrgId: 'org-1' });

    // Wait for the permission "read:org" to be rendered
    const permElement = await screen.findByText('read:org');
    expect(permElement).toBeInTheDocument();

    // Find the info button next to "read:org"
    const infoButton = document.getElementById('perm-trigger-read:org');
    expect(infoButton).toBeInTheDocument();

    // Tooltip is not shown yet
    expect(screen.queryByText('Read organization')).toBeNull();

    // Focus on the info button
    await act(async () => {
      fireEvent.focus(infoButton!);
    });

    // Tooltip should be rendered with description
    await waitFor(() => {
      expect(screen.getByText('Read organization')).toBeInTheDocument();
    });

    // Blur the info button
    await act(async () => {
      fireEvent.blur(infoButton!);
    });

    // Tooltip should be gone
    await waitFor(() => {
      expect(screen.queryByText('Read organization')).toBeNull();
    });
  });
});
