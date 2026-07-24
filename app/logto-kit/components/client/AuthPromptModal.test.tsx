import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthPromptModal } from './AuthPromptModal';

vi.mock('@/app/logto-kit/logic/actions/auth', () => ({
  signInUser: vi.fn().mockResolvedValue(undefined),
}));

const mockCloseDashboard = vi.fn();

vi.mock('@/app/logto-kit/components/providers/logto-provider', () => ({
  useLogto: () => ({
    closeDashboard: mockCloseDashboard,
  }),
}));

vi.mock('@/app/logto-kit/components/providers/preferences', () => ({
  useThemeMode: () => ({
    mode: 'dark' as const,
    colors: {
      bgSecondary: '#111',
      bgPrimary: '#000',
      borderColor: '#333',
      textPrimary: '#fff',
      textSecondary: '#aaa',
      textTertiary: '#666',
      accentBlue: '#4a9eff',
      accentRed: '#ef4444',
      accentGreen: '#22c55e',
      accentYellow: '#f59e0b',
      bgTertiary: '#1a1a1a',
      contrastText: '#fff',
      errorBg: '#1a0000',
    },
  }),
  useLangMode: () => ({ lang: 'en-US' }),
}));

import { signInUser } from '@/app/logto-kit/logic/actions/auth';

describe('AuthPromptModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders sign-in prompt', () => {
    render(<AuthPromptModal />);
    expect(screen.getByText(/sign in to continue/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('calls signInUser without routeTo when omitted', () => {
    render(<AuthPromptModal />);
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(signInUser).toHaveBeenCalledWith(undefined);
  });

  it('calls signInUser with routeTo when provided', () => {
    render(<AuthPromptModal routeTo="/docs/foo" />);
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(signInUser).toHaveBeenCalledWith('/docs/foo');
  });

  it('renders "Cancel" button in default (optional) mode', () => {
    render(<AuthPromptModal />);
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /read only mode/i })).not.toBeInTheDocument();
  });

  it('renders "Read Only Mode" button when mode is mandatory', () => {
    render(<AuthPromptModal mode="mandatory" />);
    expect(screen.getByRole('button', { name: /read only mode/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
  });

  it('renders "Cancel" button when mode is optional', () => {
    render(<AuthPromptModal mode="optional" />);
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /read only mode/i })).not.toBeInTheDocument();
  });

  it('calls closeDashboard when "Read Only Mode" button is clicked', () => {
    render(<AuthPromptModal mode="mandatory" />);
    fireEvent.click(screen.getByRole('button', { name: /read only mode/i }));
    expect(mockCloseDashboard).toHaveBeenCalledTimes(1);
  });

  it('calls closeDashboard when "Cancel" button is clicked', () => {
    render(<AuthPromptModal />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(mockCloseDashboard).toHaveBeenCalledTimes(1);
  });

  // BUG-041: pending state on Sign In button
  it('disables the Sign In button while signInUser is pending and re-enables on error', async () => {
    // Use a deferred rejection so pending stays true until the rejection propagates
    let rejectPromise: (reason: Error) => void;
    const deferred = new Promise<void>((_, reject) => {
      rejectPromise = reject;
    });
    vi.mocked(signInUser).mockReturnValueOnce(deferred);

    render(<AuthPromptModal />);
    const signInBtn = screen.getByRole('button', { name: /sign in/i });
    expect(signInBtn).not.toBeDisabled();

    fireEvent.click(signInBtn);
    expect(signInUser).toHaveBeenCalledTimes(1);
    // Button should be disabled immediately after click (synchronous state update)
    expect(signInBtn).toBeDisabled();

    // Reject the promise to trigger .catch() → setPending(false)
    await act(async () => {
      rejectPromise!(new Error('INTERNAL_ERROR'));
      // Let microtasks flush
      await Promise.resolve();
    });
    expect(signInBtn).not.toBeDisabled();
  });

  // BUG-041: loading indicator while signInUser is pending
  it('shows BouncingDots loading indicator while signing in', () => {
    // Return a non-resolving promise so we stay in pending state
    vi.mocked(signInUser).mockReturnValueOnce(new Promise(() => {}));

    render(<AuthPromptModal />);
    // No status element before clicking
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    // BouncingDots renders role="status"
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
