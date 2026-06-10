'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { UserData } from '../../logic/types';
import type { ThemeColors } from '../../themes';
import type { ActionResult } from '../../logic/actions/safe';
import { updateUserCustomData } from '../../logic/actions';
import { PreferencesProvider, useThemeMode, useLangMode, useOrgMode } from './preferences';
import { UserDataProvider } from './user-data-context';
import { DashboardRouter } from '../dashboard/dashboard-router';

interface LogtoContextValue {
  mode: 'dark' | 'light';
  colors: ThemeColors;
  setMode: (mode: 'dark' | 'light') => void;
  toggleMode: () => void;
  lang: string;
  setLang: (lang: string) => void;
  asOrg: string | null;
  setAsOrg: (orgId: string | null) => void;
  openDashboard: () => void;
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
  userData: UserData;
  dashboard?: { desktop: ReactNode; mobile: ReactNode };
  initialTheme?: 'dark' | 'light';
  initialLang?: string;
  onUpdateCustomData?: (customData: Record<string, unknown>) => Promise<ActionResult>;
  onLangChange?: () => void;
  initialOrgId?: string | null;
}

function LogtoProviderContent({
  userData,
  dashboard,
  children,
}: {
  userData: UserData;
  dashboard?: { desktop: ReactNode; mobile: ReactNode };
  children: ReactNode;
}) {
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);

  const { mode, colors, setMode, toggleMode } = useThemeMode();
  const { lang, setLang } = useLangMode();
  const { asOrg, setAsOrg } = useOrgMode();

  const openDashboard = useCallback(() => setIsDashboardOpen(true), []);
  const closeDashboard = useCallback(() => setIsDashboardOpen(false), []);

  useEffect(() => {
    if (!isDashboardOpen) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeDashboard();
      }
    };

    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isDashboardOpen, closeDashboard]);

  const contextValue: LogtoContextValue = {
    mode,
    colors,
    setMode,
    toggleMode,
    lang,
    setLang,
    asOrg,
    setAsOrg,
    openDashboard,
    closeDashboard,
  };

  return (
    <LogtoContext.Provider value={contextValue}>
      <UserDataProvider userData={userData}>
        {children}
        {isDashboardOpen && dashboard && (
          <div
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
              <button
                onClick={closeDashboard}
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
                ✕
              </button>
              <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                <DashboardRouter desktop={dashboard.desktop} mobile={dashboard.mobile} />
              </div>
            </div>
          </div>
        )}
      </UserDataProvider>
    </LogtoContext.Provider>
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
