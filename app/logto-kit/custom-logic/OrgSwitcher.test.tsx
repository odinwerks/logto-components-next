import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

const mockRefresh = vi.fn();
const mockRouter = { refresh: mockRefresh };
vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

const mockSetActiveOrg = vi.fn();
vi.mock('./set-active-org', () => ({
  setActiveOrg: (orgId: string | null) => mockSetActiveOrg(orgId),
}));

const mockSetAsOrg = vi.fn();
let mockAsOrg: string | null | undefined = null;

// The OrgSwitcher now consumes useOrgSwitcher which uses useOrgMode
vi.mock('../components/providers/preferences', () => ({
  useOrgMode: () => ({
    get asOrg() { return mockAsOrg; },
    setAsOrg: mockSetAsOrg,
  }),
}));

const mockUpdateUserCustomData = vi.fn();
vi.mock('../logic/actions/profile', () => ({
  updateUserCustomData: (data: Record<string, unknown>) => mockUpdateUserCustomData(data),
}));

vi.mock('../logic/capture-message', () => ({
  captureMessage: (err: unknown) => (err instanceof Error ? err.message : String(err)),
}));

import type { ThemeColors } from '../themes';
import { OrgSwitcher } from '../logic/OrgSwitcher';

const defaultColors = {
  bgPage: '#ffffff',
  borderColor: '#cccccc',
  textPrimary: '#000000',
  textTertiary: '#999999',
} as unknown as ThemeColors;

describe('OrgSwitcher auto-switching behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockSetActiveOrg.mockResolvedValue({ ok: true, data: true });
    mockUpdateUserCustomData.mockResolvedValue({ ok: true });
    mockAsOrg = null;
  });

  it('auto-switches to single org on mount', async () => {
    mockSetActiveOrg.mockResolvedValue({ ok: true, data: true });
    const organizations = [{ id: 'org_1', name: 'Organization One' }];

    render(
      <OrgSwitcher
        organizations={organizations}
        currentOrgId={undefined}
        colors={defaultColors}
        mode="light"
      />
    );

    // Auto-switch should have fired: validates membership and persists
    await waitFor(() => {
      expect(mockSetActiveOrg).toHaveBeenCalledWith('org_1');
      expect(mockUpdateUserCustomData).toHaveBeenCalledWith({ Preferences: { asOrg: 'org_1' } });
    });
  });

  it('allows switching to "Be yourself" after being in an org', async () => {
    mockSetActiveOrg.mockResolvedValue({ ok: true, data: true });

    // Simulate being in an org
    mockAsOrg = 'org_1';

    const organizations = [{ id: 'org_1', name: 'Organization One' }];

    render(
      <OrgSwitcher
        organizations={organizations}
        currentOrgId={undefined}
        colors={defaultColors}
        mode="light"
      />
    );

    // The dropdown should show org_1 as active
    const select = screen.getByLabelText('Select access context') as HTMLSelectElement;
    await waitFor(() => {
      expect(select.value).toBe('org_1');
    });

    mockSetActiveOrg.mockClear();
    mockSetAsOrg.mockClear();

    // User switches to "Be yourself (global)" (value = "")
    fireEvent.change(select, { target: { value: '' } });

    await waitFor(() => {
      // null path: setActiveOrg(null) does server PATCH
      expect(mockSetActiveOrg).toHaveBeenCalledWith(null);
      // setAsOrg(null) updates local state (persistOrg no-ops on null)
      // This is the expected behavior: setAsOrg is called for optimistic local
      // state, but persistOrg's guard prevents the double server PATCH.
      // The server-write invariant is: exactly 1 server PATCH (inside setActiveOrg).
      expect(mockSetAsOrg).toHaveBeenCalledWith(null);
    });
  });

  it('keeps personal-mode recovery visible when there are no organizations', () => {
    mockSetActiveOrg.mockResolvedValue({ ok: true, data: true });
    const { container } = render(
      <OrgSwitcher
        organizations={[]}
        currentOrgId={undefined}
        colors={defaultColors}
        mode="light"
      />
    );

    expect(container.firstChild).not.toBeNull();
    expect(screen.getByLabelText('Select access context')).toBeInTheDocument();
  });

  it('clears a revoked active organization after live memberships refresh (M-030)', async () => {
    mockAsOrg = 'org_revoked';

    render(
      <OrgSwitcher
        organizations={[]}
        currentOrgId="org_revoked"
        colors={defaultColors}
        mode="light"
      />
    );

    await waitFor(() => {
      expect(mockSetActiveOrg).toHaveBeenCalledWith(null);
      expect(mockSetAsOrg).toHaveBeenCalledWith(null);
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it('surfaces revoked-organization reconciliation failures and keeps retry control', async () => {
    mockAsOrg = 'org_revoked';
    mockSetActiveOrg.mockResolvedValueOnce({ ok: false, error: 'UPDATE_FAILED' });

    render(
      <OrgSwitcher
        organizations={[]}
        currentOrgId="org_revoked"
        colors={defaultColors}
        mode="light"
      />
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to return to personal mode.');
    expect(screen.queryByText('UPDATE_FAILED')).not.toBeInTheDocument();
    const select = screen.getByLabelText('Select access context') as HTMLSelectElement;
    expect(select.disabled).toBe(false);
    expect(select.value).toBe('org_revoked');
  });
});
