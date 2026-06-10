import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UserButton, UserCard } from './UserButton';

// Mock Logto provider hooks
const mockUseLogto = vi.fn();
vi.mock('./providers/logto-provider', () => ({
  useLogto: () => mockUseLogto(),
}));

// Mock UserDataProvider hook
const mockUseUserDataContext = vi.fn();
vi.mock('./providers/user-data-context', () => ({
  useUserDataContext: () => mockUseUserDataContext(),
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
      openDashboard: vi.fn(),
    });
    mockUseUserDataContext.mockReturnValue({ id: 'user_123', name: 'John Doe', avatar: 'https://example.com/avatar.png' });

    render(<UserButton />);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button.getAttribute('aria-label')).toBe('Logged in as John Doe. Open user dashboard');
  });

  it('renders custom border radius when custom shape is passed to UserButton', () => {
    mockUseLogto.mockReturnValue({
      lang: 'en-US',
      openDashboard: vi.fn(),
    });
    mockUseUserDataContext.mockReturnValue({ id: 'user_123', name: 'John Doe' });

    render(<UserButton shape="15px" />);
    const button = screen.getByRole('button');
    expect(button.style.borderRadius).toBe('15px');
  });

  it('renders LoadingPlaceholder when loading and showFallback is false', () => {
    mockUseLogto.mockReturnValue({
      lang: 'en-US',
      openDashboard: vi.fn(),
    });
    mockUseUserDataContext.mockReturnValue(null);

    render(<UserButton />);
    const button = screen.getByRole('button');
    const placeholder = button.firstChild as HTMLElement;
    expect(placeholder).toBeInTheDocument();
    expect(placeholder.style.animation).toContain('pulse');
    expect(placeholder.style.width).toBe('6.25rem');
  });

  it('does not render LoadingPlaceholder if userData is synchronously available', () => {
    mockUseLogto.mockReturnValue({
      lang: 'en-US',
      openDashboard: vi.fn(),
    });
    mockUseUserDataContext.mockReturnValue({ id: 'user_123', name: 'John Doe' });

    render(<UserButton />);
    const button = screen.getByRole('button');
    const child = button.firstChild as HTMLElement;
    expect(child).toBeInTheDocument();
    expect(child.style.animation).not.toContain('pulse');
  });

  it('uses target translation for UserButton aria-label after mount', () => {
    mockUseLogto.mockReturnValue({
      lang: 'uk-UA',
      openDashboard: vi.fn(),
    });
    mockUseUserDataContext.mockReturnValue({ id: 'user_123', name: 'John Doe' });

    render(<UserButton />);
    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-label')).toBe('Ви увійшли як John Doe. Open user dashboard');
  });

  it('uses target translation for UserCard label after mount', () => {
    mockUseLogto.mockReturnValue({
      lang: 'uk-UA',
      openDashboard: vi.fn(),
    });
    mockUseUserDataContext.mockReturnValue({ id: 'user_123', name: 'John Doe' });

    render(<UserCard />);
    expect(screen.getByText('Ви увійшли як')).toBeInTheDocument();
  });
});
