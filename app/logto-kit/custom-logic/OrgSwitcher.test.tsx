import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}));

const mockSetActiveOrg = vi.fn();
vi.mock('./set-active-org', () => ({
  setActiveOrg: (orgId: string | null) => mockSetActiveOrg(orgId),
}));

const mockSetAsOrg = vi.fn();
const mockUseOrgMode = vi.fn();
vi.mock('../components/providers/preferences', () => ({
  useOrgMode: () => mockUseOrgMode(),
}));

import type { ThemeColors } from '../themes';
import { OrgSwitcher } from './OrgSwitcher';

const defaultColors = {
  bgPage: '#ffffff',
  borderColor: '#cccccc',
  textPrimary: '#000000',
  textTertiary: '#999999',
} as unknown as ThemeColors;

describe('OrgSwitcher auto-switching behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows switching to "Be yourself" and stays there when user only has 1 organization', async () => {
    mockSetActiveOrg.mockResolvedValue(true);
    
    // Initial state: 1 org, no active org selected
    let currentAsOrg: string | null = null;
    
    // We mock useOrgMode so that it returns our dynamic currentAsOrg and updates it via mockSetAsOrg
    mockUseOrgMode.mockImplementation(() => ({
      get asOrg() { return currentAsOrg; },
      setAsOrg: (val: string | null) => {
        currentAsOrg = val;
        mockSetAsOrg(val);
      },
    }));

    const organizations = [{ id: 'org_1', name: 'Organization One' }];

    // 1. Render OrgSwitcher
    const { rerender } = render(
      <OrgSwitcher
        organizations={organizations}
        currentOrgId={undefined}
        colors={defaultColors}
        mode="light"
      />
    );

    // Initial render when currentAsOrg is null:
    // It should trigger useEffect to auto-switch to org_1
    await waitFor(() => {
      expect(mockSetActiveOrg).toHaveBeenCalledWith('org_1');
      expect(mockSetAsOrg).toHaveBeenCalledWith('org_1');
    });

    // 2. Re-render after state update (simulating state change asOrg -> 'org_1')
    rerender(
      <OrgSwitcher
        organizations={organizations}
        currentOrgId={undefined}
        colors={defaultColors}
        mode="light"
      />
    );

    // The dropdown should now be rendered since currentAsOrg is 'org_1'
    const select = screen.getByLabelText('Select organization') as HTMLSelectElement;
    expect(select.value).toBe('org_1');

    // Reset mocks to track subsequent actions
    mockSetActiveOrg.mockClear();
    mockSetAsOrg.mockClear();

    // 3. User manually switches back to "Be yourself (global)" (value = "")
    fireEvent.change(select, { target: { value: '' } });

    await waitFor(() => {
      expect(mockSetActiveOrg).not.toHaveBeenCalledWith('org_1');
      expect(mockSetAsOrg).toHaveBeenCalledWith(null);
    });

    // 4. Re-render after manual switch back (simulating state change asOrg -> null)
    rerender(
      <OrgSwitcher
        organizations={organizations}
        currentOrgId={undefined}
        colors={defaultColors}
        mode="light"
      />
    );

    // Under the bugged code, currentAsOrg being null again would re-trigger auto-switch to 'org_1'.
    // Under the fixed code, it should NOT auto-switch again.
    // Also check that select option is still rendered and has value ''
    const updatedSelect = screen.queryByLabelText('Select organization') as HTMLSelectElement;
    expect(updatedSelect).not.toBeNull();
    expect(updatedSelect.value).toBe('');
    
    // Ensure setActiveOrg('org_1') was not called again after manual change to ""
    expect(mockSetActiveOrg).not.toHaveBeenCalled();
  });
});
