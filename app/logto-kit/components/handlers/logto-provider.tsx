'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import type { UserData } from '../../logic/types';

interface LogtoContextValue {
  userData: UserData;
  accessToken: string;
  openDashboard?: () => void;
  closeDashboard?: () => void;
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
}

export function LogtoProvider({
  children,
  userData,
  accessToken,
  dashboard,
}: LogtoProviderProps) {
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);

  const openDashboard = () => setIsDashboardOpen(true);
  const closeDashboard = () => setIsDashboardOpen(false);

  return (
    <LogtoContext.Provider value={{ userData, accessToken, openDashboard, closeDashboard }}>
      {children}
      {isDashboardOpen && dashboard && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(0.25rem)',
            WebkitBackdropFilter: 'blur(0.25rem)',
            padding: '1.5rem',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '60rem',
              height: 'calc(100vh - 3rem)',
              borderRadius: '0.625rem',
              overflow: 'hidden',
              boxShadow: '0 24px 64px rgba(0,0,0,0.45)',
              display: 'flex',
              flexDirection: 'column',
              background: '#0f0f12',
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
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
              {dashboard}
            </div>
          </div>
        </div>
      )}
    </LogtoContext.Provider>
  );
}
