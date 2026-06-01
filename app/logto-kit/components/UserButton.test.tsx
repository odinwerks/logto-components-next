import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { UserButton } from './UserButton';

// Mock Logto provider hooks
const mockUseLogto = vi.fn();
vi.mock('./providers/logto-provider', () => ({
  useLogto: () => mockUseLogto(),
}));

// Mock Preferences provider hooks
vi.mock('./providers/preferences', () => ({
  useThemeMode: () => ({
    mode: 'dark' as const,
    colors: {
      bgPage: '#000',
      bgSecondary: '#111',
      borderColor: '#333',
      textPrimary: '#fff',
      textTertiary: '#999',
      accentBlue: '#4a9eff',
      bgOverlay: 'rgba(0,0,0,0.5)',
      danger: '#ef4444',
      success: '#22c55e',
    },
  }),
  useLangMode: () => ({ lang: 'en-US' }),
}));

describe('UserButton Accessibility and Shape Props', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets accessibility aria-label on UserButton button including user display name', () => {
    mockUseLogto.mockReturnValue({
      lang: 'en-US',
      userData: { id: 'user_123', name: 'John Doe', avatar: 'https://example.com/avatar.png' },
      openDashboard: vi.fn(),
    });

    render(<UserButton />);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button.getAttribute('aria-label')).toBe('Logged in as John Doe. Open user dashboard');
  });

  it('renders custom border radius when custom shape is passed to UserButton', () => {
    mockUseLogto.mockReturnValue({
      lang: 'en-US',
      userData: { id: 'user_123', name: 'John Doe' },
      openDashboard: vi.fn(),
    });

    render(<UserButton shape="15px" />);
    const button = screen.getByRole('button');
    expect(button.style.borderRadius).toBe('15px');
  });
});
