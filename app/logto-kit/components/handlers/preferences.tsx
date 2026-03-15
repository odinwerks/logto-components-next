'use client';

import { createContext, useContext, useState, useMemo, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { darkTheme, lightTheme, lightColors, type ThemeSpec, type ThemeColors } from '../../themes';
import { getDefaultLang, type LocaleCode } from '../../logic/i18n';

export type { ThemeColors, ThemeSpec, LocaleCode };

const THEME_STORAGE_KEY = 'theme-mode';
const LANG_STORAGE_KEY = 'lang-mode';
const ORG_STORAGE_KEY = 'org-mode';

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

function getStoredOrg(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(ORG_STORAGE_KEY);
}

function setStoredOrg(orgId: string | null) {
  if (typeof window === 'undefined') return;
  if (orgId === null) {
    sessionStorage.removeItem(ORG_STORAGE_KEY);
  } else {
    sessionStorage.setItem(ORG_STORAGE_KEY, orgId);
  }
}

interface ThemeModeContextValue {
  theme: 'dark' | 'light';
  themeSpec: ThemeSpec;
  themeColors: ThemeColors;
  setTheme: (theme: 'dark' | 'light') => void;
  toggleTheme: () => void;
}

interface LangModeContextValue {
  lang: string;
  setLang: (lang: string) => void;
}

interface OrgModeContextValue {
  asOrg: string | null;
  setAsOrg: (orgId: string | null) => void;
}

interface PreferencesContextValue {
  theme: ThemeModeContextValue;
  lang: LangModeContextValue;
  org: OrgModeContextValue;
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
  initialOrgId,
  onUpdateCustomData,
  onLangChange,
}: {
  children: ReactNode;
  initialTheme?: 'dark' | 'light';
  initialLang?: string;
  initialOrgId?: string | null;
  onUpdateCustomData?: (customData: Record<string, unknown>) => Promise<void>;
  onLangChange?: () => void;
}) {
  const serverDefaultLang = initialLang ?? getDefaultLang();
  
  const [theme, setThemeState] = useState<'dark' | 'light'>(() => getInitialTheme(initialTheme));
  const [lang, setLangState] = useState<string>(() => getInitialLang(serverDefaultLang));
  const [asOrg, setAsOrgState] = useState<string | null>(() => {
    const stored = getStoredOrg();
    if (stored) return stored;
    return initialOrgId ?? null;
  });

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
    () => (theme === 'dark' ? darkTheme.colors : lightColors),
    [theme]
  );

  const themeSpec = useMemo(
    () => (theme === 'dark' ? darkTheme : lightTheme),
    [theme]
  );

  const persistThemeToApi = useCallback(async (newTheme: 'dark' | 'light') => {
    if (!onUpdateCustomData) return;
    try {
      await onUpdateCustomData({ Preferences: { theme: newTheme, lang, asOrg } });
    } catch (err) {
      console.error('[PreferencesProvider] Failed to persist theme:', err);
    }
  }, [onUpdateCustomData, lang, asOrg]);

  const persistLangToApi = useCallback(async (newLang: string) => {
    if (!onUpdateCustomData) return;
    try {
      await onUpdateCustomData({ Preferences: { theme, lang: newLang, asOrg } });
    } catch (err) {
      console.error('[PreferencesProvider] Failed to persist lang:', err);
    }
  }, [onUpdateCustomData, theme, asOrg]);

  const persistOrgToApi = useCallback(async (newOrgId: string | null) => {
    if (!onUpdateCustomData) return;
    try {
      await onUpdateCustomData({ Preferences: { theme, lang, asOrg: newOrgId } });
    } catch (err) {
      console.error('[PreferencesProvider] Failed to persist org:', err);
    }
  }, [onUpdateCustomData, theme, lang]);

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

  const setAsOrg = useCallback((newOrgId: string | null) => {
    setStoredOrg(newOrgId);
    setAsOrgState(newOrgId);
    persistOrgToApi(newOrgId);
  }, [persistOrgToApi]);

  const value = useMemo(
    () => ({
      theme: { theme, themeSpec, themeColors, setTheme, toggleTheme },
      lang: { lang, setLang },
      org: { asOrg, setAsOrg },
    }),
    [theme, themeSpec, themeColors, setTheme, toggleTheme, lang, setLang, asOrg, setAsOrg]
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
      themeSpec: darkTheme,
      themeColors: darkTheme.colors,
      setTheme: () => {},
      toggleTheme: () => {},
    };
  }

  const autoTheme = getAutoDetectedTheme();
  return {
    theme: autoTheme,
    themeSpec: autoTheme === 'dark' ? darkTheme : lightTheme,
    themeColors: autoTheme === 'dark' ? darkTheme.colors : lightColors,
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

export function useOrgMode(): OrgModeContextValue {
  const context = useContext(PreferencesContext);

  if (context) {
    return context.org;
  }

  if (typeof window === 'undefined') {
    return {
      asOrg: null,
      setAsOrg: () => {},
    };
  }

  const stored = getStoredOrg();
  return {
    asOrg: stored,
    setAsOrg: () => {},
  };
}
