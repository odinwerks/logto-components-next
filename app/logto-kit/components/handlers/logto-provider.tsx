'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { UserData } from '../../logic/types';
import { PreferencesProvider } from './preferences';
import { UserDataProvider } from './user-data-context';

interface LogtoContextValue {
  userData: UserData;
  accessToken: string;
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
  initialTheme?: 'dark' | 'light';
  initialLang?: string;
  onUpdateCustomData?: (customData: Record<string, unknown>) => Promise<void>;
  onLangChange?: () => void;
}

export function LogtoProvider({
  children,
  userData,
  accessToken,
  initialTheme = 'dark',
  initialLang,
  onUpdateCustomData,
  onLangChange,
}: LogtoProviderProps) {
  return (
    <LogtoContext.Provider value={{ userData, accessToken }}>
      <UserDataProvider userData={userData}>
        <PreferencesProvider initialTheme={initialTheme} initialLang={initialLang} onUpdateCustomData={onUpdateCustomData} onLangChange={onLangChange}>
          {children}
        </PreferencesProvider>
      </UserDataProvider>
    </LogtoContext.Provider>
  );
}
