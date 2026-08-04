import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import type { UserData } from '../../../logic/types';
import { DARK_COLORS } from '../../../themes';
import { enUS } from '../../../locales/en-US';
import type { DataResult } from '../../../logic/actions/safe';

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
  mockSetActiveOrg: vi.fn<(_orgId: string | null) => Promise<DataResult<boolean>>>(),
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

vi.mock('../../../server-actions', () => ({
  loadOrganizationPermissions: (...args: unknown[]) => mockLoadOrganizationPermissions(...args),
  loadOrganizationUserRoles: (...args: unknown[]) => mockLoadOrganizationUserRoles(...args),
  loadOrgPermissionDescriptions: (...args: unknown[]) => mockLoadOrgPermissionDescriptions(...args),
}));

import { OrganizationsTab } from './organizations';
import { RbacPromisesProvider } from '../../providers/rbac-stream-context';

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

  // Wrap in RbacPromisesProvider with no promises so the stream consumers
  // fall back to the no-promise path (the hooks fetch on mount — preserves
  // the pre-instant-fetch behavior the existing tests assert on).
  return render(
    <RbacPromisesProvider personalRbacPromise={undefined} orgRbacPromise={null}>
      <OrganizationsTab
        userData={userData}
        currentOrgId={options?.currentOrgId}
        mode="dark"
        colors={DARK_COLORS}
        t={enUS}
      />
    </RbacPromisesProvider>,
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
    mockSetActiveOrg.mockResolvedValue({ ok: true, data: true });
  });

  it('does not fall back to stale currentOrgId when asOrg is explicitly null', () => {
    renderOrganizations({ asOrg: null, currentOrgId: 'org-1' });

    // Explicit null means "be yourself" mode, even if server prop is stale.
    expect(screen.queryByRole('button', { name: /be yourself/i })).toBeNull();
    expect(screen.getByText(enUS.organizations.selectOrgForRoles)).toBeInTheDocument();
    expect(screen.getByText(enUS.organizations.noActiveOrg)).toBeInTheDocument();
    expect(screen.queryByText('stale-role-name')).toBeNull();
  });

  it('awaits server-side clear-org persistence before local state update and refresh', async () => {
    const pendingClear = deferred<DataResult<boolean>>();
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
      pendingClear.resolve({ ok: true, data: true });
      await pendingClear.promise;
    });

    await waitFor(() => {
      expect(mockSetAsOrg).toHaveBeenCalledWith(null);
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });
  });
});

describe('OrganizationsTab - revoked active organization recovery (M-030)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOrgMode.asOrg = null;
    mockSetActiveOrg.mockResolvedValue({ ok: true, data: true });
  });

  it('renders no org RBAC streams for a stale activeOrgId and exposes retry on failure', async () => {
    mockSetActiveOrg.mockResolvedValueOnce({ ok: false, error: 'UPDATE_FAILED' });

    renderOrganizations({ asOrg: 'org-revoked', currentOrgId: 'org-revoked' });

    expect(screen.getByText(enUS.organizations.selectOrgForRoles)).toBeInTheDocument();
    expect(screen.getByText(enUS.organizations.selectOrgForPermissions)).toBeInTheDocument();
    expect(screen.queryByText('stale-role-name')).toBeNull();
    expect(mockLoadOrganizationUserRoles).not.toHaveBeenCalled();
    expect(mockLoadOrganizationPermissions).not.toHaveBeenCalled();
    expect(mockLoadOrgPermissionDescriptions).not.toHaveBeenCalled();

    expect(await screen.findByRole('alert')).toHaveTextContent(enUS.organizations.clearOrgFailed!);
    expect(screen.getByRole('button', { name: /be yourself/i })).toBeInTheDocument();
  });
});

describe('OrganizationsTab - BUG-008 permissions loading synchronization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOrgMode.asOrg = null;
    mockSetActiveOrg.mockResolvedValue({ ok: true, data: true });
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
    mockSetActiveOrg.mockResolvedValue({ ok: true, data: true });
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

  it('shows clearOrgFailed message when handleBeYourself receives a negative result', async () => {
    mockSetActiveOrg.mockResolvedValueOnce({ ok: true, data: false });

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
    mockSetActiveOrg.mockResolvedValue({ ok: true, data: true });
  });

  it('triggers tooltip when focusing on OrgCard info button (not the radio button)', async () => {
    renderOrganizations({ asOrg: 'org-1', currentOrgId: 'org-1' });

    // Find the info button for "Org One"
    const infoButtons = screen.getAllByRole('button', { name: /Organization info/i });
    const infoButton = infoButtons[0];
    expect(infoButton).toBeInTheDocument();

    // Tooltip is not shown yet
    expect(screen.queryByText('org-1')).toBeNull();

    // Focus on the info button (not the radio card)
    await act(async () => {
      fireEvent.focus(infoButton);
    });

    // Tooltip should be rendered
    await waitFor(() => {
      expect(screen.getByText('org-1')).toBeInTheDocument();
    });

    // Blur the info button
    await act(async () => {
      fireEvent.blur(infoButton);
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

    // Find the info button next to "read:org" by its accessible name
    const infoButton = screen.getByRole('button', { name: 'Permission details for read:org' });
    expect(infoButton).toBeInTheDocument();

    // Tooltip is not shown yet
    expect(screen.queryByText('Read organization')).toBeNull();

    // Focus on the info button
    await act(async () => {
      fireEvent.focus(infoButton);
    });

    // Tooltip should be rendered with description
    await waitFor(() => {
      expect(screen.getByText('Read organization')).toBeInTheDocument();
    });

    // Blur the info button
    await act(async () => {
      fireEvent.blur(infoButton);
    });

    // Tooltip should be gone
    await waitFor(() => {
      expect(screen.queryByText('Read organization')).toBeNull();
    });
  });

  it('triggers tooltip when focusing on OrgCard info button', async () => {
    renderOrganizations({ asOrg: 'org-1', currentOrgId: 'org-1' });

    // Find the OrgCard's info button
    const infoButtons = screen.getAllByRole('button', { name: /Organization info/i });
    const infoButton = infoButtons[0];
    expect(infoButton).toBeInTheDocument();

    // Tooltip is not shown yet
    expect(screen.queryByText('org-1')).toBeNull();

    // Focus on the info button
    await act(async () => {
      fireEvent.focus(infoButton);
    });

    // Tooltip should be rendered
    await waitFor(() => {
      expect(screen.getByText('org-1')).toBeInTheDocument();
    });

    // Blur the info button
    await act(async () => {
      fireEvent.blur(infoButton);
    });

    // Tooltip should be gone
    await waitFor(() => {
      expect(screen.queryByText('org-1')).toBeNull();
    });
  });
});

describe('OrganizationsTab - DASH-BUG-004 Org roles refresh button', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOrgMode.asOrg = null;
    mockSetActiveOrg.mockResolvedValue({ ok: true, data: true });
  });

  it('renders roles refresh button and calls loadOrganizationUserRoles on click', async () => {
    const rolesRequest = deferred<{ ok: true; data: { id: string; name: string; description: string }[] }>();
    mockLoadOrganizationUserRoles.mockImplementation(() => rolesRequest.promise);

    // Make sure we have some org roles to render
    const userDataWithRoles = {
      ...baseUserData,
      organizationRoles: [
        { id: 'role-1', organizationId: 'org-1', name: 'admin' },
      ],
    };

    renderOrganizations({ asOrg: 'org-1', currentOrgId: 'org-1', userData: userDataWithRoles });

    // The refresh button for org roles should be present and disabled while initial fetch is running
    const rolesRefreshBtn = screen.getByRole('button', { name: enUS.organizations.refreshOrgRoles });
    expect(rolesRefreshBtn).toBeInTheDocument();
    expect(rolesRefreshBtn).toBeDisabled();

    // Resolve the initial fetch
    await act(async () => {
      rolesRequest.resolve({ ok: true, data: [{ id: 'api-role-1', name: 'admin', description: 'Admin role' }] });
      await rolesRequest.promise;
    });

    // Button should now be enabled
    await waitFor(() => {
      expect(rolesRefreshBtn).not.toBeDisabled();
    });

    // Click the refresh button
    const nextRolesRequest = deferred<{ ok: true; data: { id: string; name: string; description: string }[] }>();
    mockLoadOrganizationUserRoles.mockImplementation(() => nextRolesRequest.promise);

    await act(async () => {
      fireEvent.click(rolesRefreshBtn);
    });

    // It should become disabled while fetching again
    expect(rolesRefreshBtn).toBeDisabled();

    // Resolve the refresh fetch
    await act(async () => {
      nextRolesRequest.resolve({ ok: true, data: [{ id: 'api-role-1', name: 'admin', description: 'Updated Admin role' }] });
      await nextRolesRequest.promise;
    });

    // Button becomes enabled again
    await waitFor(() => {
      expect(rolesRefreshBtn).not.toBeDisabled();
    });
  });
});

describe('OrganizationsTab - BUG-021 organization list container role', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOrgMode.asOrg = null;
    mockSetActiveOrg.mockResolvedValue({ ok: true, data: true });
  });

  it('renders the organization list container with role="radiogroup" and proper aria-label', () => {
    renderOrganizations();

    const radiogroup = screen.getByRole('radiogroup', { name: enUS.organizations.orgs });
    expect(radiogroup).toBeInTheDocument();
  });
});

describe('OrganizationsTab - organization radio keyboard access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOrgMode.asOrg = null;
    mockSetActiveOrg.mockResolvedValue({ ok: true, data: true });
    mockSetAsOrg.mockResolvedValue(undefined);
  });

  it('keeps one radio tabbable in personal mode and shows its focus indicator', () => {
    renderOrganizations({ asOrg: null });

    const radios = screen.getAllByRole('radio');
    expect(radios.map((radio) => radio.tabIndex)).toEqual([0, -1]);

    act(() => radios[0].focus());
    expect(radios[0]).toHaveFocus();
    expect(radios[0].style.outline).toContain('solid');
  });

  it('uses the focused radio to bootstrap Arrow key focus and selection in personal mode', async () => {
    renderOrganizations({ asOrg: null });

    const [firstRadio, secondRadio] = screen.getAllByRole('radio');
    fireEvent.focus(firstRadio);
    fireEvent.keyDown(firstRadio, { key: 'ArrowRight' });

    await waitFor(() => {
      expect(mockSetActiveOrg).toHaveBeenCalledWith('org-2');
      expect(secondRadio).toHaveFocus();
      expect(secondRadio).toHaveAttribute('tabindex', '0');
      expect(firstRadio).toHaveAttribute('tabindex', '-1');
    });
  });

  it('supports End and Home focus plus selection when an organization is active', async () => {
    const firstRender = renderOrganizations({ asOrg: 'org-1', currentOrgId: 'org-1' });

    const [firstRadio, secondRadio] = screen.getAllByRole('radio');
    fireEvent.focus(firstRadio);
    fireEvent.keyDown(firstRadio, { key: 'End' });

    await waitFor(() => {
      expect(mockSetActiveOrg).toHaveBeenCalledWith('org-2');
      expect(secondRadio).toHaveFocus();
    });

    firstRender.unmount();
    mockSetActiveOrg.mockClear();
    renderOrganizations({ asOrg: 'org-2', currentOrgId: 'org-2' });

    const [newFirstRadio, newSecondRadio] = screen.getAllByRole('radio');
    fireEvent.focus(newSecondRadio);
    fireEvent.keyDown(newSecondRadio, { key: 'Home' });
    await waitFor(() => {
      expect(mockSetActiveOrg).toHaveBeenLastCalledWith('org-1');
      expect(newFirstRadio).toHaveFocus();
    });
  });
});

describe('OrganizationsTab - Accessibility and Focus (BUG-V01 & BUG-L-014)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOrgMode.asOrg = null;
    mockSetActiveOrg.mockResolvedValue({ ok: true, data: true });
  });

  it('verifies that aria-describedby is removed from the main radio button and only exists on the info button', async () => {
    renderOrganizations();

    // The main radio button
    const mainRadioButtons = screen.getAllByRole('radio');
    const mainRadioButton = mainRadioButtons[0];
    expect(mainRadioButton).not.toHaveAttribute('aria-describedby');

    // The info button
    const infoButtons = screen.getAllByRole('button', { name: /Organization info/i });
    const infoButton = infoButtons[0];
    
    // Focus to trigger tooltip
    await act(async () => {
      fireEvent.focus(infoButton);
    });

    await waitFor(() => {
      expect(infoButton).toHaveAttribute('aria-describedby');
    });
  });

  it('verifies focus ring is conditional on active focus state', async () => {
    renderOrganizations();

    const infoButtons = screen.getAllByRole('button', { name: /Organization info/i });
    const infoButton = infoButtons[0];

    // Initially should not have a visible outline (BUG-M17/M24 fix: undefined instead of 'none')
    expect(infoButton.style.outline).toBeFalsy();

    // Focus on the info button
    await act(async () => {
      fireEvent.focus(infoButton);
    });

    await waitFor(() => {
      expect(infoButton.style.outline).not.toBeFalsy();
      expect(infoButton.style.outline).toContain('solid');
    });

    // Blur the info button
    await act(async () => {
      fireEvent.blur(infoButton);
    });

    await waitFor(() => {
      expect(infoButton.style.outline).toBeFalsy();
    });
  });
});

describe('OrganizationsTab - BUG-034 no duplicate selectOrgForRoles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOrgMode.asOrg = null;
    mockSetActiveOrg.mockResolvedValue({ ok: true, data: true });
  });

  it('renders selectOrgForRoles exactly once when no org is selected', () => {
    renderOrganizations({ asOrg: null, currentOrgId: undefined });

    const matches = screen.getAllByText(enUS.organizations.selectOrgForRoles);
    expect(matches).toHaveLength(1);
  });
});
