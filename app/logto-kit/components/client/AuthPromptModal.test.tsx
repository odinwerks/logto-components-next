import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AuthPromptModal } from './AuthPromptModal';

vi.mock('@/app/logto-kit/logic/actions/auth', () => ({
  signInUser: vi.fn(),
}));

vi.mock('@/app/logto-kit/components/providers/logto-provider', () => ({
  useLogto: () => ({
    closeDashboard: vi.fn(),
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
}));

import { signInUser } from '@/app/logto-kit/logic/actions/auth';

describe('AuthPromptModal', () => {
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
});
