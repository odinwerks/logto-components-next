import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock getLogtoContext
const mockGetLogtoContext = vi.fn();
vi.mock('@logto/next/server-actions', () => ({
  getLogtoContext: () => mockGetLogtoContext(),
}));

// Mock config
vi.mock('../config', () => ({
  getLogtoConfig: () => ({}),
}));

// Mock OrgSwitcher
vi.mock('./OrgSwitcher', () => ({
  OrgSwitcher: vi.fn(({ organizations }) => (
    <div data-testid="org-switcher">
      Switcher with {organizations.length} orgs
    </div>
  )),
}));

import type { ThemeColors } from '../themes';
import type { Translations } from '../locales';
import { OrgSwitcherWrapper } from './org-switcher-wrapper';

describe('OrgSwitcherWrapper stale claims gate behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders OrgSwitcher even if claims.organizations is missing/stale but userInfo.organization_data has orgs', async () => {
    // Mock getLogtoContext returning authenticated and organization_data inside userInfo,
    // but claims does NOT contain organizations (simulating stale claims/token).
    mockGetLogtoContext.mockResolvedValue({
      isAuthenticated: true,
      claims: {
        sub: 'user_123',
        // organizations is completely missing from stale ID token claims
      },
      userInfo: {
        organization_data: [
          { id: 'org_1', name: 'Organization One' },
        ],
      },
    });

    const wrapperElement = await OrgSwitcherWrapper({
      mode: 'light',
      colors: {} as unknown as ThemeColors,
      t: {} as unknown as Translations,
    });

    // In a React Server Component test, since it's an async function, we can render the returned JSX element.
    render(wrapperElement);

    // Under the bugged code, the component will return null because !claims?.organizations was true.
    // Under the fixed code, the component should successfully render the OrgSwitcher.
    const switcher = screen.getByTestId('org-switcher');
    expect(switcher).toBeInTheDocument();
    expect(switcher).toHaveTextContent('Switcher with 1 orgs');
  });

  it('returns null if user is not authenticated', async () => {
    mockGetLogtoContext.mockResolvedValue({
      isAuthenticated: false,
      claims: undefined,
      userInfo: undefined,
    });

    const wrapperElement = await OrgSwitcherWrapper({
      mode: 'light',
      colors: {} as unknown as ThemeColors,
      t: {} as unknown as Translations,
    });

    const { container } = render(wrapperElement);
    expect(container.firstChild).toBeNull();
  });
});
