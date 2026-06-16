'use client';

import { createContext, useContext, useState, useCallback, useRef, useMemo, type ReactNode } from 'react';
import type { UserData } from '../../logic/types';
import type { ThemeColors } from '../../themes';
import type { ActionResult } from '../../logic/actions/safe';
import { updateUserCustomData } from '../../logic/actions';
import { PreferencesProvider, useThemeMode, useLangMode, useOrgMode } from './preferences';
import { UserDataProvider } from './user-data-context';
import { DashboardRouter, useIsPortrait } from '../dashboard/dashboard-router';
import { useFocusTrap } from '../dashboard/shared/focus-trap';
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
  openDashboard: (opts?: { routeTo?: string }) => void;
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
}: {
  userData?: UserData | null;
  dashboard?: ReactNode | { desktop: ReactNode; mobile: ReactNode };
  children: ReactNode;
}) {
  const [dashboardState, setDashboardState] = useState<{ isOpen: boolean; routeTo?: string }>({
    isOpen: false,
  });

  const { mode, colors, setMode, toggleMode } = useThemeMode();
  const { lang, setLang } = useLangMode();
  const { asOrg, setAsOrg } = useOrgMode();

  const isAuthenticated = !!userData;

  const openDashboard = useCallback((opts?: { routeTo?: string }) => {
    setDashboardState({ isOpen: true, routeTo: opts?.routeTo });
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
        {dashboardState.isOpen && normalizedDashboard && (
          <DashboardDialog
            mode={mode}
            onClose={closeDashboard}
            desktop={normalizedDashboard.desktop}
            mobile={normalizedDashboard.mobile}
            routeTo={dashboardState.routeTo}
          />
        )}
      </UserDataProvider>
    </LogtoContext.Provider>
  );
}

/** Inner component for the dashboard overlay dialog.
 *  Rendered only when the dashboard is open, so useFocusTrap activates on mount
 *  and restores focus on unmount. */
function DashboardDialog({
  mode,
  onClose,
  desktop,
  mobile,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  routeTo,
}: {
  mode: 'dark' | 'light';
  onClose: () => void;
  desktop: ReactNode;
  mobile: ReactNode;
  /** Route to navigate to when the dashboard opens. Used by Task 5 (auth modal routing). */
  routeTo?: string;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, onClose);
  const isMobile = useIsPortrait();

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
  return (
    <PreferencesProvider
      initialTheme={initialTheme}
      initialLang={initialLang}
      onUpdateCustomData={onUpdateCustomData}
      onLangChange={onLangChange}
      initialOrgId={initialOrgId}
    >
      <LogtoProviderContent
        userData={userData}
        dashboard={dashboard}
      >
        {children}
      </LogtoProviderContent>
    </PreferencesProvider>
  );
}
