import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UserButton, UserCard } from './UserButton';

// Mock Logto provider hooks
const mockUseLogto = vi.fn();
vi.mock('./providers/logto-provider', () => ({
  useLogto: () => mockUseLogto(),
}));

const mockOpenDashboard = vi.fn();

const defaultUseLogtoValue = {
  lang: 'en-US',
  openDashboard: mockOpenDashboard,
  isAuthenticated: true,
};

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
      ...defaultUseLogtoValue,
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
    // Loading placeholder is now a Framer Motion <Pulse> skeleton (motion.div)
    // driven by MotionConfig, replacing the legacy ldd-pulse CSS class.
    expect(placeholder.tagName).toBe('DIV');
    expect(placeholder.style.width).toBe('6.25rem');
    expect(placeholder.style.border).toContain('2px');
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
    // Loaded: AvatarCore renders the user's initials, not the Pulse skeleton.
    expect(child.textContent).toContain('JD');
  });

  it('uses target translation for UserButton aria-label after mount', () => {
    mockUseLogto.mockReturnValue({
      lang: 'uk-UA',
      openDashboard: vi.fn(),
    });
    mockUseUserDataContext.mockReturnValue({ id: 'user_123', name: 'John Doe' });

    render(<UserButton />);
    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-label')).toBe('Ви увійшли як John Doe. Відкрити панель користувача');
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

  it('sets dynamic accessibility aria-label on UserCard button including user display name', () => {
    mockUseLogto.mockReturnValue({
      lang: 'en-US',
      openDashboard: vi.fn(),
    });
    mockUseUserDataContext.mockReturnValue({ id: 'user_123', name: 'John Doe', avatar: 'https://example.com/avatar.png' });

    render(<UserCard />);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button.getAttribute('aria-label')).toBe('Logged in as John Doe. Open user dashboard');
  });

  it('uses target translation for UserCard aria-label after mount', () => {
    mockUseLogto.mockReturnValue({
      lang: 'uk-UA',
      openDashboard: vi.fn(),
    });
    mockUseUserDataContext.mockReturnValue({ id: 'user_123', name: 'John Doe' });

    render(<UserCard />);
    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-label')).toBe('Ви увійшли як John Doe. Відкрити панель користувача');
  });

  it('applies responsive style properties on UserCard element wrapperStyle', () => {
    mockUseLogto.mockReturnValue({
      lang: 'en-US',
      openDashboard: vi.fn(),
    });
    mockUseUserDataContext.mockReturnValue({ id: 'user_123', name: 'John Doe' });

    render(<UserCard />);
    const button = screen.getByRole('button');
    expect(button.style.maxWidth).toBe('100%');
    expect(button.style.boxSizing).toBe('border-box');
  });

  it('renders fallback avatar and opens dashboard when unauthenticated', () => {
    mockUseLogto.mockReturnValue({
      ...defaultUseLogtoValue,
      isAuthenticated: false,
      openDashboard: mockOpenDashboard,
    });
    mockUseUserDataContext.mockReturnValue(null);

    render(<UserButton />);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    // Unauthenticated: should immediately show FallbackAvatar (with User icon),
    // not the Pulse loading skeleton.
    const avatar = button.firstChild as HTMLElement;
    expect(avatar.querySelector('svg')).not.toBeNull();
    fireEvent.click(button);
    expect(mockOpenDashboard).toHaveBeenCalled();
  });

  it('shows "Unauthenticated" text in UserCard when isAuthenticated is false and no user data', () => {
    mockUseLogto.mockReturnValue({
      ...defaultUseLogtoValue,
      isAuthenticated: false,
      openDashboard: mockOpenDashboard,
    });
    mockUseUserDataContext.mockReturnValue(null);

    render(<UserCard />);
    expect(screen.getByText('Unauthenticated')).toBeInTheDocument();
  });

  it('shows "..." in UserCard while loading (isAuthenticated undefined, no user data yet)', () => {
    mockUseLogto.mockReturnValue({
      lang: 'en-US',
      openDashboard: mockOpenDashboard,
      isAuthenticated: undefined,
    });
    mockUseUserDataContext.mockReturnValue(null);

    render(<UserCard />);
    // While loading (before 1500ms timeout), should not show Unauthenticated
    expect(screen.queryByText('Unauthenticated')).not.toBeInTheDocument();
  });

  // ─── Bug-fix specific tests ───────────────────────────────────────────────

  describe('BUG-037: imageFailed resets on avatar URL change', () => {
    it('resets imageFailed when avatar URL changes', () => {
      mockUseLogto.mockReturnValue({
        ...defaultUseLogtoValue,
        openDashboard: vi.fn(),
      });
      mockUseUserDataContext.mockReturnValue({
        id: 'user_123',
        name: 'John Doe',
        avatar: 'https://example.com/avatar-v1.png',
      });

      const { rerender } = render(<UserButton />);
      const avatarImg = document.querySelector('img');
      expect(avatarImg).toBeInTheDocument();
      expect(avatarImg!.getAttribute('src')).toBe('https://example.com/avatar-v1.png');

      // Simulate image load failure
      fireEvent.error(avatarImg!);

      // Verify initials fallback appeared (imageFailed is now true)
      expect(document.querySelector('img')).toBeNull();
      expect(screen.getByText('JD')).toBeInTheDocument();

      // Change avatar URL — this should reset imageFailed
      mockUseUserDataContext.mockReturnValue({
        id: 'user_123',
        name: 'John Doe',
        avatar: 'https://example.com/avatar-v2.png',
      });

      rerender(<UserButton />);

      // A new <img> should appear because imageFailed was reset
      const newImg = document.querySelector('img');
      expect(newImg).toBeInTheDocument();
      expect(newImg!.getAttribute('src')).toBe('https://example.com/avatar-v2.png');
    });
  });

  describe('BUG-089: getInitials handles consecutive spaces', () => {
    it('correctly returns initials for names with double spaces', () => {
      mockUseLogto.mockReturnValue({
        lang: 'en-US',
        openDashboard: vi.fn(),
      });
      // "John  Doe" — double space between first and last name
      mockUseUserDataContext.mockReturnValue({
        id: 'user_123',
        name: 'John  Doe',
      });

      render(<UserButton />);
      // Should be "JD", not "JU" (which would come from undefined segments)
      expect(screen.getByText('JD')).toBeInTheDocument();
    });

    it('correctly returns initials for names with leading/trailing spaces', () => {
      mockUseLogto.mockReturnValue({
        lang: 'en-US',
        openDashboard: vi.fn(),
      });
      mockUseUserDataContext.mockReturnValue({
        id: 'user_123',
        name: '  Jane  Smith  ',
      });

      render(<UserButton />);
      expect(screen.getByText('JS')).toBeInTheDocument();
    });
  });

  describe('BUG-092: aria-label fallback when userData is null', () => {
    it('produces a clean aria-label with fallback "user" when userData is null', () => {
      mockUseLogto.mockReturnValue({
        lang: 'en-US',
        openDashboard: vi.fn(),
      });
      // No user data yet (loading state before timeout)
      mockUseUserDataContext.mockReturnValue(null);

      render(<UserButton />);
      const button = screen.getByRole('button');
      // Should NOT contain "undefined" or dangling space before period
      const label = button.getAttribute('aria-label') ?? '';
      expect(label).not.toContain('undefined');
      expect(label).not.toContain(' .');
      expect(label).toBe('Logged in as user. Open user dashboard');
    });

    it('produces clean UserCard aria-label with fallback when userData is null', () => {
      mockUseLogto.mockReturnValue({
        lang: 'en-US',
        openDashboard: vi.fn(),
      });
      mockUseUserDataContext.mockReturnValue(null);

      render(<UserCard />);
      const button = screen.getByRole('button');
      const label = button.getAttribute('aria-label') ?? '';
      expect(label).not.toContain('undefined');
      expect(label).not.toContain(' .');
      expect(label).toBe('Logged in as user. Open user dashboard');
    });
  });

  describe('BUG-093: MotionButton has explicit type="button"', () => {
    it('renders UserButton with type="button" to prevent form submission', () => {
      mockUseLogto.mockReturnValue({
        lang: 'en-US',
        openDashboard: vi.fn(),
      });
      mockUseUserDataContext.mockReturnValue({ id: 'user_123', name: 'John Doe' });

      render(<UserButton />);
      const button = screen.getByRole('button');
      expect(button.getAttribute('type')).toBe('button');
    });

    it('renders UserCard with type="button" to prevent form submission', () => {
      mockUseLogto.mockReturnValue({
        lang: 'en-US',
        openDashboard: vi.fn(),
      });
      mockUseUserDataContext.mockReturnValue({ id: 'user_123', name: 'John Doe' });

      render(<UserCard />);
      const button = screen.getByRole('button');
      expect(button.getAttribute('type')).toBe('button');
    });
  });
});
