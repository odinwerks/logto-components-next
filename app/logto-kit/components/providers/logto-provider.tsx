'use client';

import { createContext, useContext, useState, useCallback, useRef, useMemo, useEffect, useSyncExternalStore, type ReactNode } from 'react';
import type { UserData } from '../../logic/types';
import type { ThemeColors } from '../../themes';
import type { ActionResult } from '../../logic/actions/safe';
import { getTranslations, type Translations } from '../../locales';
import { updateUserCustomData } from '../../logic/actions/profile';
import { PreferencesProvider, useThemeMode, useLangMode, useOrgMode } from './preferences';
import { UserDataProvider } from './user-data-context';
import { DashboardRouter } from '../dashboard/dashboard-router';
import { useFocusTrap } from '../dashboard/shared/focus-trap';
import { AuthPromptModal } from '../client/AuthPromptModal';
import { ToastProvider, ToastProviderCapture, type ToastContextValue } from './toast-provider';
import { AnimatePresence } from '../shared/motion';
import { motion } from 'framer-motion';
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

// Dashboard visibility is consumed outside React by AuthWatcher. Keep an
// ownership set rather than a boolean per provider: unmounting/closing one of
// several providers must not announce that another provider's dashboard is
// closed.
const dashboardOwners = new Set<symbol>();

function syncDashboardOpenFlag(): void {
  if (typeof window !== 'undefined') {
    window.__LDD_DASHBOARD_OPEN__ = dashboardOwners.size > 0;
  }
}

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
  initialOrgId?: string | null | undefined;
  /** All locale translations, keyed by locale code. Required by ToastProvider. */
  allTranslations?: Record<string, Translations>;
  /** Fallback translations when the current locale isn't found. Defaults to en-US. */
  fallbackTranslations?: Translations;
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
  allTranslations,
  fallbackTranslations,
  toastRef,
}: {
  userData?: UserData | null;
  dashboard?: ReactNode | { desktop: ReactNode; mobile: ReactNode };
  children: ReactNode;
  allTranslations?: Record<string, Translations>;
  fallbackTranslations?: Translations;
  /** Shared ref — ToastProviderCapture writes the toast context here so
   *  LogtoProvider can route onPersistError to the unified toast system. */
  toastRef: React.MutableRefObject<ToastContextValue | null>;
}) {
  const [dashboardState, setDashboardState] = useState<{ isOpen: boolean; routeTo?: string; mode?: 'optional' | 'mandatory' }>({
    isOpen: false,
  });
  const [dashboardOwner] = useState(() => Symbol('dashboard-provider'));

  const { mode, colors, setMode, toggleMode } = useThemeMode();
  const { lang, setLang } = useLangMode();
  const { asOrg, setAsOrg } = useOrgMode();

  const isAuthenticated = !!userData;

  // ── Keep AuthWatcher's router.refresh() from firing while dashboard overlay
  //     is open. See auth-watcher.tsx for the read-side gate.
  useEffect(() => {
    if (dashboardState.isOpen) dashboardOwners.add(dashboardOwner);
    else dashboardOwners.delete(dashboardOwner);
    syncDashboardOpenFlag();
    return () => {
      dashboardOwners.delete(dashboardOwner);
      syncDashboardOpenFlag();
    };
  }, [dashboardOwner, dashboardState.isOpen]);

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
        <ToastProvider
          allTranslations={allTranslations ?? {}}
          lang={lang}
          fallbackTranslations={fallbackTranslations ?? getTranslations('en-US', allTranslations ?? {})}
          mode={mode}
          colors={colors}
        >
          <ToastProviderCapture toastRef={toastRef} />
          {children}
          <AnimatePresence>
            {dashboardState.isOpen && (normalizedDashboard || !isAuthenticated) && (
              <DashboardDialog
                key="dashboard-dialog"
                mode={mode}
                onClose={closeDashboard}
                desktop={normalizedDashboard?.desktop}
                mobile={normalizedDashboard?.mobile}
                routeTo={dashboardState.routeTo}
                authMode={dashboardState.mode}
              />
            )}
          </AnimatePresence>
        </ToastProvider>
      </UserDataProvider>
    </LogtoContext.Provider>
  );
}

/** Returns true when the viewport is portrait-oriented (mobile). */
function useIsPortrait(): boolean {
  const subscribe = useCallback((callback: () => void) => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
    const mq1 = window.matchMedia('(orientation: portrait)');
    mq1.addEventListener('change', callback);
    return () => {
      mq1.removeEventListener('change', callback);
    };
  }, []);

  return useSyncExternalStore(
    subscribe,
    () => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
      return window.matchMedia('(orientation: portrait)').matches;
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

  // The backdrop fades in/out (70ms); the dashboard content appears instantly.
  // Both exit animations are driven by the surrounding <AnimatePresence> in
  // LogtoProviderContent.
  return (
    <motion.div
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Dashboard"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.07, ease: 'easeOut' }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: mode === 'dark' ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0.35)',
        backdropFilter: 'blur(0.5rem)',
        WebkitBackdropFilter: 'blur(0.5rem)',
      }}
    >
      {isAuthenticated ? (
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
      ) : (
        <AuthPromptModal routeTo={routeTo} mode={authMode} />
      )}
    </motion.div>
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
  allTranslations,
  fallbackTranslations,
}: LogtoProviderProps) {
  // Stable ref-based callback so PreferencesProvider routes errors to the unified
  // toast system via ToastProviderCapture (which writes to this ref).
  const toastRef = useRef<ToastContextValue | null>(null);
  const onPersistError = useCallback((msg: string) => {
    toastRef.current?.showToast('error', msg);
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
        allTranslations={allTranslations}
        fallbackTranslations={fallbackTranslations}
        toastRef={toastRef}
      >
        {children}
      </LogtoProviderContent>
    </PreferencesProvider>
  );
}
