'use client';

import { createContext, useContext, useState, useMemo, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { darkColors, lightColors, type ThemeColors } from '../../themes';
import { getDefaultLang, type LocaleCode } from '../../logic/i18n';

export type { ThemeColors, LocaleCode };

const THEME_STORAGE_KEY = 'theme-mode';
const LANG_STORAGE_KEY = 'lang-mode';

function getStoredTheme(): 'dark' | 'light' | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(THEME_STORAGE_KEY) as 'dark' | 'light' | null;
}

function setStoredTheme(theme: 'dark' | 'light') {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(THEME_STORAGE_KEY, theme);
}

function getStoredLang(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(LANG_STORAGE_KEY);
}

function setStoredLang(lang: string) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(LANG_STORAGE_KEY, lang);
}

interface ThemeModeContextValue {
  theme: 'dark' | 'light';
  themeColors: ThemeColors;
  setTheme: (theme: 'dark' | 'light') => void;
  toggleTheme: () => void;
}

interface LangModeContextValue {
  lang: string;
  setLang: (lang: string) => void;
}

interface PreferencesContextValue {
  theme: ThemeModeContextValue;
  lang: LangModeContextValue;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

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

function getInitialLang(serverDefault: string): string {
  const stored = getStoredLang();
  if (stored) return stored;
  return serverDefault;
}

export function PreferencesProvider({
  children,
  initialTheme = 'dark',
  initialLang,
  onUpdateCustomData,
  onLangChange,
}: {
  children: ReactNode;
  initialTheme?: 'dark' | 'light';
  initialLang?: string;
  onUpdateCustomData?: (customData: Record<string, unknown>) => Promise<void>;
  onLangChange?: () => void;
}) {
  const serverDefaultLang = initialLang ?? getDefaultLang();
  
  const [theme, setThemeState] = useState<'dark' | 'light'>(() => getInitialTheme(initialTheme));
  const [lang, setLangState] = useState<string>(() => getInitialLang(serverDefaultLang));

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

  useEffect(() => {
    const stored = getStoredLang();
    if (stored && stored !== lang) {
      setLangState(stored);
    }
  }, []);

  const themeColors = useMemo(
    () => (theme === 'dark' ? darkColors : lightColors),
    [theme]
  );

  const persistThemeToApi = useCallback(async (newTheme: 'dark' | 'light') => {
    if (!onUpdateCustomData) return;
    try {
      await onUpdateCustomData({ Preferences: { theme: newTheme, lang: '' } });
    } catch (err) {
      console.error('[PreferencesProvider] Failed to persist theme:', err);
    }
  }, [onUpdateCustomData]);

  const persistLangToApi = useCallback(async (newLang: string) => {
    if (!onUpdateCustomData) return;
    try {
      await onUpdateCustomData({ Preferences: { theme, lang: newLang } });
    } catch (err) {
      console.error('[PreferencesProvider] Failed to persist lang:', err);
    }
  }, [onUpdateCustomData, theme]);

  const persistLockRef = useRef<{ theme: boolean; lang: boolean }>({ theme: false, lang: false });

  const setTheme = useCallback((newTheme: 'dark' | 'light') => {
    setStoredTheme(newTheme);
    setThemeState(newTheme);
    persistThemeToApi(newTheme);
  }, [persistThemeToApi]);

  const toggleTheme = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  }, [theme, setTheme]);

  const setLang = useCallback((newLang: string) => {
    setStoredLang(newLang);
    setLangState(newLang);
    persistLangToApi(newLang);
    onLangChange?.();
  }, [persistLangToApi, onLangChange]);

  const value = useMemo(
    () => ({
      theme: { theme, themeColors, setTheme, toggleTheme },
      lang: { lang, setLang },
    }),
    [theme, themeColors, setTheme, toggleTheme, lang, setLang]
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function useThemeMode(): ThemeModeContextValue {
  const context = useContext(PreferencesContext);

  if (context) {
    return context.theme;
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

export function useLangMode(): LangModeContextValue {
  const context = useContext(PreferencesContext);

  if (context) {
    return context.lang;
  }

  if (typeof window === 'undefined') {
    return {
      lang: getDefaultLang(),
      setLang: () => {},
    };
  }

  const stored = getStoredLang();
  return {
    lang: stored ?? getDefaultLang(),
    setLang: () => {},
  };
}
