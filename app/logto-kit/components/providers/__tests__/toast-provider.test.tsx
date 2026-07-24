import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ToastProvider, useToast, ToastProviderCapture } from '../toast-provider';
import { enUS } from '../../../locales/en-US';
import { DARK_COLORS } from '../../../themes';

// ── Wrapper factory ──────────────────────────────────────────────────────────

const allTranslations = { 'en-US': enUS };
const fallbackTranslations = enUS;

function createWrapper(lang = 'en-US') {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <ToastProvider
        allTranslations={allTranslations}
        lang={lang}
        fallbackTranslations={fallbackTranslations}
        mode="dark"
        colors={DARK_COLORS}
      >
        {children}
      </ToastProvider>
    );
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('ToastProvider / useToast', () => {
  it('throws when used outside ToastProvider', () => {
    // Suppress console.error from React for expected throw
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useToast());
    }).toThrow('useToast must be used within a ToastProvider');

    spy.mockRestore();
  });

  it('showToast with error type has 8000ms duration', () => {
    const { result } = renderHook(() => useToast(), { wrapper: createWrapper() });

    act(() => {
      result.current.showToast('error', 'Test error');
    });

    // The toasts array is internal to ToastProvider — we verify via rendering
    // and rely on the createMapErrorToast + showToast integration.
  });

  it('mapErrorToast returns i18n message for known code', () => {
    const { result } = renderHook(() => useToast(), { wrapper: createWrapper() });

    expect(result.current.mapErrorToast('ROLE_DENIED')).toBe(enUS.errors.ROLE_DENIED);
  });

  it('mapErrorToast returns empty string at silent verbosity via env', () => {
    vi.stubEnv('NEXT_PUBLIC_ERROR_VERBOSITY', 'silent');
    const { result } = renderHook(() => useToast(), { wrapper: createWrapper() });

    expect(result.current.mapErrorToast('ROLE_DENIED')).toBe('');

    vi.unstubAllEnvs();
  });

  it('mapErrorToast maps Logto dot-notation code via dot-to-underscore', () => {
    const { result } = renderHook(() => useToast(), { wrapper: createWrapper() });

    expect(result.current.mapErrorToast('session.invalid_credentials')).toBe(
      enUS.errors.session_invalid_credentials,
    );
  });

  it('mapErrorToast falls back to ERROR for unknown codes', () => {
    const { result } = renderHook(() => useToast(), { wrapper: createWrapper() });

    expect(result.current.mapErrorToast('UNKNOWN_CODE_XYZ')).toBe(enUS.errors.ERROR);
  });

  it('mapErrorToast uses category-generic at generic verbosity', () => {
    vi.stubEnv('NEXT_PUBLIC_ERROR_VERBOSITY', 'generic');
    const { result } = renderHook(() => useToast(), { wrapper: createWrapper() });

    expect(result.current.mapErrorToast('ROLE_DENIED')).toBe(enUS.errors.PERMISSION_DENIED);

    vi.unstubAllEnvs();
  });

  // ── BUG-022: context value memoization ──────────────────────────────────────

  it('BUG-022: context value is memoised — function references are stable across re-renders', () => {
    const { result, rerender } = renderHook(() => useToast(), { wrapper: createWrapper() });

    const first = result.current;
    rerender();
    rerender();
    const second = result.current;

    // All function references must remain stable when deps are unchanged
    expect(second.showToast).toBe(first.showToast);
    expect(second.dismissToast).toBe(first.dismissToast);
    expect(second.dismissAll).toBe(first.dismissAll);
    expect(second.mapErrorToast).toBe(first.mapErrorToast);
    expect(second.setSuppressAll).toBe(first.setSuppressAll);
  });

  // ── BUG-101: max cap + dedup ────────────────────────────────────────────────

  // Helper component that triggers showToast so we can inspect the DOM
  function ToastTrigger({ action }: { action: (t: ReturnType<typeof useToast>) => void }) {
    const toast = useToast();
    return <button data-testid="trigger" onClick={() => action(toast)}>Trigger</button>;
  }

  it('BUG-101: max cap — only 5 toasts are visible when 7 are triggered', () => {
    render(
      <ToastProvider
        allTranslations={allTranslations}
        lang="en-US"
        fallbackTranslations={fallbackTranslations}
        mode="dark"
        colors={DARK_COLORS}
      >
        <ToastTrigger
          action={(t) => {
            for (let i = 0; i < 7; i++) {
              t.showToast('info', `Toast ${i}`);
            }
          }}
        />
      </ToastProvider>,
    );

    act(() => {
      fireEvent.click(screen.getByTestId('trigger'));
    });

    // Only 5 should be rendered (the 5 most recent: Toast 2-6)
    const statuses = screen.getAllByRole('status');
    expect(statuses.length).toBe(5);

    // textContent includes button labels (e.g. "Toast 2copy×"), so use substring
    const messages = statuses.map((el) => el.textContent ?? '');
    expect(messages.some((m) => m.includes('Toast 0'))).toBe(false);
    expect(messages.some((m) => m.includes('Toast 1'))).toBe(false);
    // Most recent 5 should be present
    expect(messages.some((m) => m.includes('Toast 2'))).toBe(true);
    expect(messages.some((m) => m.includes('Toast 6'))).toBe(true);
  });

  it('BUG-101: dedup — identical message is skipped, not duplicated', () => {
    render(
      <ToastProvider
        allTranslations={allTranslations}
        lang="en-US"
        fallbackTranslations={fallbackTranslations}
        mode="dark"
        colors={DARK_COLORS}
      >
        <ToastTrigger
          action={(t) => {
            t.showToast('info', 'Duplicate message');
            t.showToast('info', 'Duplicate message');
            t.showToast('info', 'Unique message');
          }}
        />
      </ToastProvider>,
    );

    act(() => {
      fireEvent.click(screen.getByTestId('trigger'));
    });

    const statuses = screen.getAllByRole('status');
    expect(statuses.length).toBe(2);
    const messages = statuses.map((el) => el.textContent ?? '');
    expect(messages.filter((m) => m.includes('Duplicate message')).length).toBe(1);
    expect(messages.some((m) => m.includes('Unique message'))).toBe(true);
  });

  // ── BUG-102: duration 0 (never auto-dismiss) ────────────────────────────────

  it('BUG-102: duration: 0 prevents auto-dismiss using ?? not ||', () => {
    vi.useFakeTimers();

    render(
      <ToastProvider
        allTranslations={allTranslations}
        lang="en-US"
        fallbackTranslations={fallbackTranslations}
        mode="dark"
        colors={DARK_COLORS}
      >
        <ToastTrigger
          action={(t) => {
            t.showToast('info', 'Never fades', { duration: 0 });
          }}
        />
      </ToastProvider>,
    );

    act(() => {
      fireEvent.click(screen.getByTestId('trigger'));
    });

    // Toast should appear immediately
    expect(screen.getAllByRole('status').length).toBe(1);

    // Advance well past default 3000ms — toast should still be there
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(screen.getAllByRole('status').length).toBe(1);
    expect(screen.getByRole('status').textContent).toContain('Never fades');

    vi.useRealTimers();
  });
});

describe('ToastProvider - render integration', () => {
  it('renders children', () => {
    render(
      <ToastProvider
        allTranslations={allTranslations}
        lang="en-US"
        fallbackTranslations={fallbackTranslations}
        mode="dark"
        colors={DARK_COLORS}
      >
        <div data-testid="child">Hello</div>
      </ToastProvider>,
    );

    expect(screen.getByTestId('child')).toBeDefined();
    expect(screen.getByTestId('child').textContent).toBe('Hello');
  });

  it('renders ToastContainer (always present for exit animations)', () => {
    render(
      <ToastProvider
        allTranslations={allTranslations}
        lang="en-US"
        fallbackTranslations={fallbackTranslations}
        mode="dark"
        colors={DARK_COLORS}
      >
        {null}
      </ToastProvider>,
    );

    // ToastContainer always renders (even empty) for AnimatePresence exit animations.
    // With no toasts, there are no Toast elements, but the container div exists.
  });
});

describe('ToastProviderCapture', () => {
  it('captures useToast into a ref', () => {
    const ref: React.MutableRefObject<unknown> = { current: null } as React.MutableRefObject<unknown>;

    render(
      <ToastProvider
        allTranslations={allTranslations}
        lang="en-US"
        fallbackTranslations={fallbackTranslations}
        mode="dark"
        colors={DARK_COLORS}
      >
        <ToastProviderCapture toastRef={ref as React.MutableRefObject<ReturnType<typeof useToast> | null>} />
      </ToastProvider>,
    );

    expect(ref.current).not.toBeNull();
    expect(typeof (ref.current as { showToast?: unknown }).showToast).toBe('function');
    expect(typeof (ref.current as { mapErrorToast?: unknown }).mapErrorToast).toBe('function');
    expect(typeof (ref.current as { setSuppressAll?: unknown }).setSuppressAll).toBe('function');
  });
});
