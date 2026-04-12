'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { UserData } from '../../logic/types';
import type { ThemeSpec } from '../../themes';
import { PreferencesProvider, useThemeMode, useLangMode, useOrgMode } from './preferences';
import { UserDataProvider } from './user-data-context';

interface LogtoContextValue {
  userData: UserData;
  accessToken: string;
  theme: 'dark' | 'light';
  themeSpec: ThemeSpec;
  setTheme: (theme: 'dark' | 'light') => void;
  toggleTheme: () => void;
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
  accessToken: string;
  dashboard?: ReactNode;
  initialTheme?: 'dark' | 'light';
  initialLang?: string;
  onLangChange?: () => void;
  darkThemeSpec: ThemeSpec;
  lightThemeSpec: ThemeSpec;
}

function LogtoProviderContent({
  userData,
  accessToken,
  dashboard,
  children,
}: {
  userData: UserData;
  accessToken: string;
  dashboard?: ReactNode;
  children: ReactNode;
}) {
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);

  const { theme, themeSpec, setTheme, toggleTheme } = useThemeMode();
  const { lang, setLang } = useLangMode();
  const { asOrg, setAsOrg } = useOrgMode();

  const openDashboard = useCallback(() => setIsDashboardOpen(true), []);
  const closeDashboard = useCallback(() => setIsDashboardOpen(false), []);

  useEffect(() => {
    if (!isDashboardOpen) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDashboardOpen(false);
      }
    };

    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isDashboardOpen]);

  const contextValue: LogtoContextValue = {
    userData,
    accessToken,
    theme,
    themeSpec,
    setTheme,
    toggleTheme,
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
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              background: theme === 'dark' ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0.35)',
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
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '0.25rem',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'rgba(255,255,255,0.5)',
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
                {dashboard}
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
  accessToken,
  dashboard,
  initialTheme,
  initialLang,
  onLangChange,
  darkThemeSpec,
  lightThemeSpec,
}: LogtoProviderProps) {
  return (
    <PreferencesProvider
      initialTheme={initialTheme}
      initialLang={initialLang}
      onLangChange={onLangChange}
      darkThemeSpec={darkThemeSpec}
      lightThemeSpec={lightThemeSpec}
    >
      <LogtoProviderContent
        userData={userData}
        accessToken={accessToken}
        dashboard={dashboard}
      >
        {children}
      </LogtoProviderContent>
    </PreferencesProvider>
  );
}
