'use client';

import { createContext, useContext, useState, useMemo, useEffect, type ReactNode } from 'react';
import { darkColors, lightColors, type ThemeColors } from '../themes';

export type { ThemeColors };

const STORAGE_KEY = 'theme-mode';

function getStoredTheme(): 'dark' | 'light' | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(STORAGE_KEY) as 'dark' | 'light' | null;
}

function setStoredTheme(theme: 'dark' | 'light') {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(STORAGE_KEY, theme);
}

function clearStoredTheme() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(STORAGE_KEY);
}

interface ThemeModeContextValue {
  theme: 'dark' | 'light';
  themeColors: ThemeColors;
  setTheme: (theme: 'dark' | 'light') => void;
  toggleTheme: () => void;
}

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

function getAutoDetectedTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') {
    return 'dark';
  }
  
  const html = document.documentElement;
  const dataTheme = html.getAttribute('data-theme');
  
  if (dataTheme === 'light') {
    return 'light';
  }
  if (dataTheme === 'dark') {
    return 'dark';
  }
  
  if (typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  
  return 'dark';
}

function getInitialTheme(serverDefault: 'dark' | 'light'): 'dark' | 'light' {
  const stored = getStoredTheme();
  if (stored) return stored;
  return serverDefault;
}

export function ThemeModeProvider({
  children,
  initialTheme = 'dark',
}: {
  children: ReactNode;
  initialTheme?: 'dark' | 'light';
}) {
  const [theme, setThemeState] = useState<'dark' | 'light'>(() => getInitialTheme(initialTheme));

  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const currentDataTheme = document.documentElement.getAttribute('data-theme');
      if (!currentDataTheme) {
        setThemeState(e.matches ? 'dark' : 'light');
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const themeColors = useMemo(
    () => (theme === 'dark' ? darkColors : lightColors),
    [theme]
  );

  const setTheme = (newTheme: 'dark' | 'light') => {
    setStoredTheme(newTheme);
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  return (
    <ThemeModeContext.Provider value={{ theme, themeColors, setTheme, toggleTheme }}>
      {children}
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode(): ThemeModeContextValue {
  const context = useContext(ThemeModeContext);

  if (context) {
    return context;
  }

  if (typeof window === 'undefined') {
    return {
      theme: 'dark',
      themeColors: darkColors,
      setTheme: () => {},
      toggleTheme: () => {},
    };
  }

  const autoTheme = getAutoDetectedTheme();
  return {
    theme: autoTheme,
    themeColors: autoTheme === 'dark' ? darkColors : lightColors,
    setTheme: () => {},
    toggleTheme: () => {},
  };
}
