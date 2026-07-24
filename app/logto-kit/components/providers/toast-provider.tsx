'use client';

import { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo, type ReactNode } from 'react';
import type { Translations } from '../../locales';
import type { ToastMessage } from '../dashboard/types';
import { ToastContainer } from '../dashboard/shared/Toast';
import type { ThemeColors } from '../../themes';
import { createMapErrorToast } from '../../logic/map-error-toast';

// ── Public API shape ────────────────────────────────────────────────────────

export interface ToastOptions {
  /** Override default duration (ms). */
  duration?: number;
}

export interface ToastContextValue {
  showToast: (type: 'success' | 'error' | 'info', message: string, opts?: ToastOptions) => void;
  dismissToast: (id: string) => void;
  dismissAll: () => void;
  /**
   * Maps an error code string (from the `error` field of API responses) to a
   * human-readable message using the `errors` i18n namespace. Falls back
   * through category-generic → `ERROR` (silent) → raw code.
   * At `silent` verbosity, returns '' so the toast layer skips rendering.
   */
  mapErrorToast: (code: string) => string;
  /** Suppress all future toasts until `false` is set. Used during sign-out. */
  setSuppressAll: (value: boolean) => void;
}

// ── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}

// ── ToastProviderCapture (bridge for onPersistError wiring) ─────────────────

/**
 * Invisible component that captures `useToast()` into a ref so callbacks
 * above `<ToastProvider>` in the tree can route errors to the unified toast
 * system. Renders `null`.
 */
export function ToastProviderCapture({
  toastRef,
}: {
  toastRef: React.MutableRefObject<ToastContextValue | null>;
}) {
  const toast = useToast();
  // Store the latest toast context value in the ref via useEffect so we don't
  // write to refs during render (react-hooks/refs).
  useEffect(() => {
    toastRef.current = toast;
    return () => { toastRef.current = null; };
  }, [toast, toastRef]);
  return null;
}

// ── Counter (module-level, survives HMR resets) ─────────────────────────────

let toastCounter = 0;

/** Maximum number of toasts visible at once. Oldest toast is removed when cap is hit. */
const MAX_TOASTS = 5;

// ── Provider ─────────────────────────────────────────────────────────────────

export interface ToastProviderProps {
  children: ReactNode;
  /** All locale translations, keyed by locale code. */
  allTranslations: Record<string, Translations>;
  /** Current locale code (e.g. 'en-US'). */
  lang: string;
  /** Fallback translations when the current locale isn't found. */
  fallbackTranslations: Translations;
  mode: 'dark' | 'light';
  colors: ThemeColors;
}

export function ToastProvider({
  children,
  allTranslations,
  lang,
  fallbackTranslations,
  mode,
  colors,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const suppressRef = useRef(false);

  const t: Translations = allTranslations[lang] ?? fallbackTranslations;

  const setSuppressAll = useCallback((value: boolean) => {
    suppressRef.current = value;
  }, []);

  const showToast = useCallback(
    (type: 'success' | 'error' | 'info', message: string, opts?: ToastOptions) => {
      if (suppressRef.current) return;
      if (!message) return; // skip empty messages (e.g., silent verbosity)

      const toast: ToastMessage = {
        id: `toast-${Date.now()}-${++toastCounter}`,
        type,
        message,
        duration:
          opts?.duration ??
          (type === 'success' ? 3000 : type === 'error' ? 8000 : 3000),
      };
      setToasts((prev) => {
        // Dedup: skip if a toast with identical message already exists
        if (prev.some((t) => t.message === message)) {
          return prev;
        }
        // Enforce max cap: drop oldest when at limit
        const next = [...prev, toast];
        return next.length > MAX_TOASTS ? next.slice(-MAX_TOASTS) : next;
      });
    },
    [],
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  const mapErrorToast = useCallback(
    (code: string): string => {
      return createMapErrorToast(code, t);
    },
    [t],
  );

  const value = useMemo<ToastContextValue>(
    () => ({ showToast, dismissToast, dismissAll, mapErrorToast, setSuppressAll }),
    [showToast, dismissToast, dismissAll, mapErrorToast, setSuppressAll],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer messages={toasts} onDismiss={dismissToast} mode={mode} colors={colors} />
    </ToastContext.Provider>
  );
}
