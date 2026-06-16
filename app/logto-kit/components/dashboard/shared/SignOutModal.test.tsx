import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SignOutModal } from './SignOutModal';
import type { Translations } from '../../../locales';
import type { ThemeColors } from '../types';

vi.mock('../../../logic/env', async () => {
  const actual = await vi.importActual<typeof import('../../../logic/env')>('../../../logic/env');
  return {
    ...actual,
    readEnv: vi.fn((name: string) => {
      if (name === 'SIGNOUT_REDIRECT_DELAY') return '100';
      return actual.readEnv(name);
    }),
  };
});

// Mock signOutUser server action
vi.mock('../../../logic/actions/auth', () => ({
  signOutUser: vi.fn().mockResolvedValue(undefined),
}));
import { signOutUser } from '../../../logic/actions/auth';

// Mock focus-trap utility
vi.mock('./focus-trap', () => ({
  useFocusTrap: vi.fn(),
}));
import { useFocusTrap } from './focus-trap';

// Mock translations object with the new signout section
const mockT = {
  common: {
    signOut: 'Sign out',
  },
  profile: {
    cancel: 'Cancel',
  },
  dashboard: {
    signOut: 'Sign out',
    signOutFailed: 'Sign out failed',
  },
  signout: {
    title: 'Leaving already?',
    bodyCountdown: "You'll be signed out in {n}s",
    abort: 'Abort',
    confirm: 'Let me go!',
    farewell: 'See you later!',
  },
} as unknown as Translations;

// Minimal colors object (only the properties accessed)
const mockColors = {
  bgSecondary: '#1a1a1a',
  borderColor: '#333',
  textPrimary: '#fff',
  textSecondary: '#aaa',
  accentRed: '#ef4444',
  contrastText: '#fff',
} as unknown as ThemeColors;

describe('SignOutModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when isOpen is true', () => {
    render(<SignOutModal isOpen={true} onAbort={vi.fn()} mode="dark" colors={mockColors} t={mockT} />);
    expect(screen.getByText('Leaving already?')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(<SignOutModal isOpen={false} onAbort={vi.fn()} mode="dark" colors={mockColors} t={mockT} />);
    expect(container.firstChild).toBeNull();
  });

  it('displays the translated title', () => {
    render(<SignOutModal isOpen={true} onAbort={vi.fn()} mode="dark" colors={mockColors} t={mockT} />);
    expect(screen.getByText('Leaving already?')).toBeInTheDocument();
  });

  it('displays countdown body with bold number', () => {
    render(<SignOutModal isOpen={true} onAbort={vi.fn()} countdownSeconds={15} mode="dark" colors={mockColors} t={mockT} />);
    // The body text should contain the translated string with {n} replaced
    expect(screen.getByText(/You'll be signed out in/)).toBeInTheDocument();
    // The number should be wrapped in <strong>
    const strong = screen.getByText('15');
    expect(strong.tagName).toBe('STRONG');
  });

  it('renders abort button with translated text', () => {
    render(<SignOutModal isOpen={true} onAbort={vi.fn()} mode="dark" colors={mockColors} t={mockT} />);
    expect(screen.getByRole('button', { name: 'Abort' })).toBeInTheDocument();
  });

  it('renders confirm button with translated text', () => {
    render(<SignOutModal isOpen={true} onAbort={vi.fn()} mode="dark" colors={mockColors} t={mockT} />);
    expect(screen.getByRole('button', { name: 'Let me go!' })).toBeInTheDocument();
  });

  it('calls onAbort when Abort button is clicked', () => {
    const onAbort = vi.fn();
    render(<SignOutModal isOpen={true} onAbort={onAbort} mode="dark" colors={mockColors} t={mockT} />);
    fireEvent.click(screen.getByRole('button', { name: 'Abort' }));
    expect(onAbort).toHaveBeenCalledTimes(1);
  });

  it('shows farewell stage and calls signOutUser after countdown reaches zero', async () => {
    vi.useFakeTimers();

    render(<SignOutModal isOpen={true} onAbort={vi.fn()} countdownSeconds={2} mode="dark" colors={mockColors} t={mockT} />);

    // Advance to trigger countdown end → farewell stage
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // Farewell text should be visible
    expect(screen.getByText('See you later!')).toBeInTheDocument();

    // Advance past SIGNOUT_REDIRECT_DELAY (mocked to 100ms)
    await act(async () => {
      vi.advanceTimersByTime(200);
      await Promise.resolve();
    });

    expect(signOutUser).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('shows farewell stage immediately when confirm button is clicked and calls signOutUser', async () => {
    vi.useFakeTimers();
    render(<SignOutModal isOpen={true} onAbort={vi.fn()} countdownSeconds={15} mode="dark" colors={mockColors} t={mockT} />);

    fireEvent.click(screen.getByRole('button', { name: 'Let me go!' }));

    expect(screen.getByText('See you later!')).toBeInTheDocument();

    // Advance past SIGNOUT_REDIRECT_DELAY (mocked to 100ms)
    await act(async () => {
      vi.advanceTimersByTime(200);
      await Promise.resolve();
    });

    expect(signOutUser).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('accepts custom countdownSeconds', () => {
    render(<SignOutModal isOpen={true} onAbort={vi.fn()} countdownSeconds={5} mode="dark" colors={mockColors} t={mockT} />);
    const strong = screen.getByText('5');
    expect(strong.tagName).toBe('STRONG');
  });

  it('renders no X/close button (only abort + confirm)', () => {
    render(<SignOutModal isOpen={true} onAbort={vi.fn()} mode="dark" colors={mockColors} t={mockT} />);
    // There should be exactly 2 buttons
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(2);
  });

  it('renders the countdown number with bold and larger font via strong tag', () => {
    render(<SignOutModal isOpen={true} onAbort={vi.fn()} countdownSeconds={15} mode="dark" colors={mockColors} t={mockT} />);
    const strong = screen.getByText('15');
    expect(strong.tagName).toBe('STRONG');
    // Verify inline style for countdown number (new spec: 1.125rem, 700)
    expect(strong.getAttribute('style')).toContain('font-size: 1.125rem');
    expect(strong.getAttribute('style')).toContain('font-weight: 700');
    // Verify parent <p> has bold label text (0.875rem, 600)
    const parentP = strong.parentElement;
    expect(parentP?.getAttribute('style')).toContain('font-size: 0.875rem');
    expect(parentP?.getAttribute('style')).toContain('font-weight: 600');
  });

  it('calls useFocusTrap with dialog element and onAbort', () => {
    const onAbort = vi.fn();
    render(<SignOutModal isOpen={true} onAbort={onAbort} mode="dark" colors={mockColors} t={mockT} />);
    
    expect(useFocusTrap).toHaveBeenCalled();
    const [refCall, callbackCall] = vi.mocked(useFocusTrap).mock.calls[0];
    expect(refCall.current).not.toBeNull();
    expect(refCall.current!.getAttribute('role')).toBe('dialog');
    expect(callbackCall).toBe(onAbort);
  });

  it('exposes correct ARIA attributes pointing to title and body elements', () => {
    render(<SignOutModal isOpen={true} onAbort={vi.fn()} mode="dark" colors={mockColors} t={mockT} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-labelledby', 'signout-modal-title');
    expect(dialog).toHaveAttribute('aria-describedby', 'signout-modal-desc');
    expect(screen.getByText('Leaving already?')).toHaveAttribute('id', 'signout-modal-title');
    expect(screen.getByText(/You'll be signed out in/)).toHaveAttribute('id', 'signout-modal-desc');
  });

  it('calls showToast and onAbort on signOutUser failure', async () => {
    vi.useFakeTimers();
    const mockShowToast = vi.fn();
    const onAbort = vi.fn();
    
    // Mock failure
    vi.mocked(signOutUser).mockRejectedValueOnce(new Error('Sign out failed'));

    render(
      <SignOutModal
        isOpen={true}
        onAbort={onAbort}
        mode="dark"
        colors={mockColors}
        t={mockT}
        showToast={mockShowToast}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Let me go!' }));

    // Advance past SIGNOUT_REDIRECT_DELAY (mocked to 100ms)
    await act(async () => {
      vi.advanceTimersByTime(200);
      await Promise.resolve();
    });

    expect(signOutUser).toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledWith('error', 'Sign out failed');
    expect(onAbort).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
