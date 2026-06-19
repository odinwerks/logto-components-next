'use client';

import { createContext, useContext, useState, useCallback, useRef, useMemo, useEffect, useSyncExternalStore, type ReactNode } from 'react';
import type { UserData } from '../../logic/types';
import type { ThemeColors } from '../../themes';
import type { ActionResult } from '../../logic/actions/safe';
import { updateUserCustomData } from '../../logic/actions';
import { PreferencesProvider, useThemeMode, useLangMode, useOrgMode } from './preferences';
import { UserDataProvider } from './user-data-context';
import { DashboardRouter } from '../dashboard/dashboard-router';
import { useFocusTrap } from '../dashboard/shared/focus-trap';
import { AuthPromptModal } from '../client/AuthPromptModal';
import { ToastContainer } from '../dashboard/shared/Toast';
import type { ToastMessage } from '../dashboard/types';
import { X } from 'lucide-react';

interface LogtoContextValue {
  mode: 'dark' | 'light';
  colors: ThemeColors;
  setMode: (mode: 'dark' | 'light') => void;
  toggleMode: () => void;
  lang: string;
  setLang: (lang: string) => void;
  asOrg: string | null;
  setAsOrg: (orgId: string | null) => void;
  isAuthenticated: boolean;
  openDashboard: (opts?: { routeTo?: string; mode?: 'optional' | 'mandatory' }) => void;
  closeDashboard: () => void;
}

const LogtoContext = createContext<LogtoContextValue | null>(null);

export function useLogto(): LogtoContextValue {
  const context = useContext(LogtoContext);
  if (!context) {
    throw new Error('useLogto must be used within LogtoProvider');
  }
  return context;
}

export interface LogtoProviderProps {
  children: ReactNode;
  /** User data from a successful auth fetch. Pass `null` or omit when unauthenticated. */
  userData?: UserData | null;
  /** Dashboard content. Accepts a single ReactNode (rendered for both desktop and mobile)
   *  or a `{ desktop, mobile }` object for responsive layouts. */
  dashboard?: ReactNode | { desktop: ReactNode; mobile: ReactNode };
  initialTheme?: 'dark' | 'light';
  initialLang?: string;
  onUpdateCustomData?: (customData: Record<string, unknown>) => Promise<ActionResult>;
  onLangChange?: () => void;
  initialOrgId?: string | null;
}

/** Normalise the `dashboard` prop to `{ desktop, mobile }` so DashboardDialog always gets the same shape. */
function normalizeDashboard(
  dashboard: ReactNode | { desktop: ReactNode; mobile: ReactNode } | undefined,
): { desktop: ReactNode; mobile: ReactNode } | undefined {
  if (!dashboard) return undefined;
  if (
    typeof dashboard === 'object' &&
    dashboard !== null &&
    'desktop' in (dashboard as object) &&
    'mobile' in (dashboard as object)
  ) {
    return dashboard as { desktop: ReactNode; mobile: ReactNode };
  }
  // Single ReactNode — use the same node for both orientations
  return { desktop: dashboard as ReactNode, mobile: dashboard as ReactNode };
}

function LogtoProviderContent({
  userData,
  dashboard,
  children,
  onPersistErrorRef,
}: {
  userData?: UserData | null;
  dashboard?: ReactNode | { desktop: ReactNode; mobile: ReactNode };
  children: ReactNode;
  onPersistErrorRef: React.MutableRefObject<((msg: string) => void) | null>;
}) {
  const [dashboardState, setDashboardState] = useState<{ isOpen: boolean; routeTo?: string; mode?: 'optional' | 'mandatory' }>({
    isOpen: false,
  });

  const { mode, colors, setMode, toggleMode } = useThemeMode();
  const { lang, setLang } = useLangMode();
  const { asOrg, setAsOrg } = useOrgMode();

  // ── Preference-error toast state ─────────────────────────────────────────
  const [prefToasts, setPrefToasts] = useState<ToastMessage[]>([]);
  const prefToastCounterRef = useRef(0);

  const showPrefErrorToast = useCallback((message: string) => {
    const toast: ToastMessage = {
      id: `pref-toast-${Date.now()}-${++prefToastCounterRef.current}`,
      type: 'error',
      message,
      duration: 6000,
    };
    setPrefToasts((prev) => [...prev, toast]);
  }, []);

  const dismissPrefToast = useCallback((id: string) => {
    setPrefToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Register this component's showPrefErrorToast into the outer ref so
  // LogtoProvider can route onPersistError calls here.
  useEffect(() => {
    onPersistErrorRef.current = showPrefErrorToast;
    return () => { onPersistErrorRef.current = null; };
  }, [onPersistErrorRef, showPrefErrorToast]);

  const isAuthenticated = !!userData;

  const openDashboard = useCallback((opts?: { routeTo?: string; mode?: 'optional' | 'mandatory' }) => {
    setDashboardState({ isOpen: true, routeTo: opts?.routeTo, mode: opts?.mode });
  }, []);
  const closeDashboard = useCallback(() => setDashboardState({ isOpen: false }), []);

  const normalizedDashboard = useMemo(() => normalizeDashboard(dashboard), [dashboard]);

  const contextValue = useMemo<LogtoContextValue>(() => ({
    mode,
    colors,
    setMode,
    toggleMode,
    lang,
    setLang,
    asOrg,
    setAsOrg,
    isAuthenticated,
    openDashboard,
    closeDashboard,
  }), [
    mode,
    colors,
    setMode,
    toggleMode,
    lang,
    setLang,
    asOrg,
    setAsOrg,
    isAuthenticated,
    openDashboard,
    closeDashboard,
  ]);

  return (
    <LogtoContext.Provider value={contextValue}>
      <UserDataProvider userData={userData ?? null}>
        {children}
        {dashboardState.isOpen && (normalizedDashboard || !isAuthenticated) && (
          <DashboardDialog
            mode={mode}
            onClose={closeDashboard}
            desktop={normalizedDashboard?.desktop}
            mobile={normalizedDashboard?.mobile}
            routeTo={dashboardState.routeTo}
            authMode={dashboardState.mode}
          />
        )}
        {/* Provider-level preference error toasts */}
        <ToastContainer
          messages={prefToasts}
          onDismiss={dismissPrefToast}
          mode={mode}
          colors={colors}
        />
      </UserDataProvider>
    </LogtoContext.Provider>
  );
}

/** Returns true when the viewport is portrait-oriented or narrower than 64rem (mobile). */
function useIsPortrait(): boolean {
  const subscribe = useCallback((callback: () => void) => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
    const mq1 = window.matchMedia('(orientation: portrait)');
    const mq2 = window.matchMedia('(max-width: 64rem)');
    mq1.addEventListener('change', callback);
    mq2.addEventListener('change', callback);
    return () => {
      mq1.removeEventListener('change', callback);
      mq2.removeEventListener('change', callback);
    };
  }, []);

  return useSyncExternalStore(
    subscribe,
    () => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
      return (
        window.matchMedia('(orientation: portrait)').matches ||
        window.matchMedia('(max-width: 64rem)').matches
      );
    },
    () => false,  // server snapshot
  );
}

/** Inner component for the dashboard overlay dialog.
 *  Rendered only when the dashboard is open, so useFocusTrap activates on mount
 *  and restores focus on unmount.
 *
 *  When the user is unauthenticated, renders `AuthPromptModal` instead of the
 *  regular dashboard content and passes `routeTo` so the sign-in redirect
 *  returns the user to the intended page. */
function DashboardDialog({
  mode,
  onClose,
  desktop,
  mobile,
  routeTo,
  authMode,
}: {
  mode: 'dark' | 'light';
  onClose: () => void;
  desktop?: ReactNode;
  mobile?: ReactNode;
  /** Route to navigate to after sign-in when the user is unauthenticated. */
  routeTo?: string;
  /** Auth prompt display mode. 'mandatory' shows "Read Only Mode" instead of "Cancel". */
  authMode?: 'optional' | 'mandatory';
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, onClose);
  const { isAuthenticated } = useLogto();
  const isMobile = useIsPortrait();

  // When unauthenticated, show the auth prompt modal instead of the dashboard.
  if (!isAuthenticated) {
    return <AuthPromptModal routeTo={routeTo} mode={authMode} />;
  }

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Dashboard"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: mode === 'dark' ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0.35)',
        backdropFilter: 'blur(0.5rem)',
        WebkitBackdropFilter: 'blur(0.5rem)',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100vw',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {!isMobile && (
          <button
            onClick={onClose}
            aria-label="Close dashboard"
            style={{
              position: 'absolute',
              top: '0.75rem',
              right: '0.75rem',
              zIndex: 10,
              width: '2rem',
              height: '2rem',
              border: mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
              borderRadius: '0.25rem',
              background: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
              color: mode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              lineHeight: 1,
            }}
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        )}
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          <DashboardRouter desktop={desktop} mobile={mobile} />
        </div>
      </div>
    </div>
  );
}

export function LogtoProvider({
  children,
  userData,
  dashboard,
  initialTheme,
  initialLang,
  onUpdateCustomData = updateUserCustomData,
  onLangChange,
  initialOrgId,
}: LogtoProviderProps) {
  // Stable ref-based callback so PreferencesProvider and LogtoProviderContent
  // share one identity-stable error handler without re-renders.
  const onPersistErrorRef = useRef<((msg: string) => void) | null>(null);
  const onPersistError = useCallback((msg: string) => {
    onPersistErrorRef.current?.(msg);
  }, []);

  return (
    <PreferencesProvider
      initialTheme={initialTheme}
      initialLang={initialLang}
      onUpdateCustomData={onUpdateCustomData}
      onLangChange={onLangChange}
      initialOrgId={initialOrgId}
      onPersistError={onPersistError}
    >
      <LogtoProviderContent
        userData={userData}
        dashboard={dashboard}
        onPersistErrorRef={onPersistErrorRef}
      >
        {children}
      </LogtoProviderContent>
    </PreferencesProvider>
  );
}
