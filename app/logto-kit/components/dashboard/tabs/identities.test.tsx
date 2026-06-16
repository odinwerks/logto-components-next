import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { UserData } from '../../../logic/types';
import { DARK_COLORS } from '../../../themes';
import { enUS } from '../../../locales/en-US';
import { IdentitiesTab } from './identities';

const mockUserData: UserData = {
  id: 'user-1',
  username: 'user-1',
  name: 'User One',
  avatar: undefined,
  primaryEmail: 'user@example.com',
  primaryPhone: '+15550000000',
  profile: { givenName: 'User', familyName: 'One' },
  identities: {
    google: {
      userId: 'google-sub',
      details: { email: 'google-user@example.com' },
    },
    customProvider: {
      userId: 'custom-sub',
      details: {},
    },
  },
  customData: {},
  createdAt: 0,
  updatedAt: 0,
  organizations: [],
  organizationRoles: [],
};

describe('IdentitiesTab - BUG-L-015 accessible provider icons', () => {
  it('renders known provider icons with role="img" and proper aria-label', () => {
    render(
      <IdentitiesTab
        userData={mockUserData}
        mode="dark"
        colors={DARK_COLORS}
        t={enUS}
      />
    );

    // Google is a known provider, should render with the accessible label
    const googleIcon = screen.getByLabelText(enUS.identities.providerGoogle || 'Google');
    expect(googleIcon).toBeInTheDocument();
    expect(googleIcon).toHaveAttribute('role', 'img');
  });

  it('renders unknown/custom provider icons with role="img" and fallback label', () => {
    render(
      <IdentitiesTab
        userData={mockUserData}
        mode="dark"
        colors={DARK_COLORS}
        t={enUS}
      />
    );

    // customProvider is unknown/custom, should render with capitalized key name fallback
    const customIcon = screen.getByLabelText('CustomProvider');
    expect(customIcon).toBeInTheDocument();
    expect(customIcon).toHaveAttribute('role', 'img');
  });
});
