'use client';

import { createContext, useContext, useState, useMemo, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { type ThemeColors, DARK_COLORS, LIGHT_COLORS } from '../../themes';
import { getDefaultLang, type LocaleCode } from '../../logic/i18n';
import type { ActionResult } from '../../logic/actions/safe';

export type { ThemeColors, LocaleCode };

const THEME_STORAGE_KEY = 'theme-mode';
const LANG_STORAGE_KEY = 'lang-mode';
const ORG_STORAGE_KEY = 'org-mode';

function createStorageHelpers<T>(key: string) {
  return {
    get: (): T | null => {
      if (typeof window === 'undefined') return null;
      return sessionStorage.getItem(key) as T | null;
    },
    set: (value: T) => {
      if (typeof window === 'undefined') return;
      if (value === null) {
        sessionStorage.removeItem(key);
      } else {
        sessionStorage.setItem(key, String(value));
      }
    },
  };
}

const themeStorage = createStorageHelpers<'dark' | 'light'>(THEME_STORAGE_KEY);
const langStorage = createStorageHelpers<string>(LANG_STORAGE_KEY);
const orgStorage = createStorageHelpers<string | null>(ORG_STORAGE_KEY);

function getStoredTheme(): 'dark' | 'light' | null {
  return themeStorage.get();
}

function setStoredTheme(theme: 'dark' | 'light') {
  themeStorage.set(theme);
}

function getStoredLang(): string | null {
  return langStorage.get();
}

function setStoredLang(lang: string) {
  langStorage.set(lang);
}

function getStoredOrg(): string | null {
  return orgStorage.get();
}

function setStoredOrg(orgId: string | null) {
  orgStorage.set(orgId);
}

interface ThemeModeContextValue {
  mode: 'dark' | 'light';
  colors: ThemeColors;
  setMode: (mode: 'dark' | 'light') => void;
  toggleMode: () => void;
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
  onUpdateCustomData?: (customData: Record<string, unknown>) => Promise<ActionResult>;
  onLangChange?: () => void;
}) {
  const serverDefaultLang = initialLang ?? getDefaultLang();

  const [theme, setThemeState] = useState<'dark' | 'light'>(initialTheme);
  const [lang, setLangState] = useState<string>(() => getInitialLang(serverDefaultLang));
  const [asOrg, setAsOrgState] = useState<string | null>(() => {
    const stored = getStoredOrg();
    if (stored) return stored;
    return initialOrgId ?? null;
  });

  // Client-only mount effect to write initialTheme to sessionStorage
  useEffect(() => {
    setStoredTheme(initialTheme);
  }, []);

  // Refs for preference values to avoid stale closures in persist callbacks
  const themeRef = useRef(theme);
  const langRef = useRef(lang);
  const asOrgRef = useRef(asOrg);
  useEffect(() => { themeRef.current = theme; }, [theme]);
  useEffect(() => { langRef.current = lang; }, [lang]);
  useEffect(() => { asOrgRef.current = asOrg; }, [asOrg]);

  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      // Only respond to OS theme changes if the user hasn't explicitly set a preference
      const stored = getStoredTheme();
      if (!stored) {
        setThemeState(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    const handleThemeChange = () => {
      const stored = getStoredTheme();
      if (stored && stored !== themeRef.current) {
        setThemeState(stored);
      }
    };

    window.addEventListener('theme-changed', handleThemeChange);
    return () => window.removeEventListener('theme-changed', handleThemeChange);
  }, []);

  const colors = useMemo(
    () => (theme === 'dark' ? DARK_COLORS : LIGHT_COLORS),
    [theme]
  );

  const persistThemeToApi = useCallback(async (newTheme: 'dark' | 'light') => {
    if (!onUpdateCustomData) return;
    const r = await onUpdateCustomData({ Preferences: { theme: newTheme, lang: langRef.current, asOrg: asOrgRef.current } });
    if (!r.ok) {
      console.error('[PreferencesProvider] Failed to persist theme:', r.error);
    }
  }, [onUpdateCustomData]);

  const persistLangToApi = useCallback(async (newLang: string) => {
    if (!onUpdateCustomData) return;
    const r = await onUpdateCustomData({ Preferences: { theme: themeRef.current, lang: newLang, asOrg: asOrgRef.current } });
    if (!r.ok) {
      console.error('[PreferencesProvider] Failed to persist lang:', r.error);
    }
  }, [onUpdateCustomData]);

  const persistOrgToApi = useCallback(async (newOrgId: string | null) => {
    if (!onUpdateCustomData) return true;
    const r = await onUpdateCustomData({ Preferences: { theme: themeRef.current, lang: langRef.current, asOrg: newOrgId } });
    if (!r.ok) {
      console.error('[PreferencesProvider] Failed to persist org:', r.error);
    }
    return r.ok;
  }, [onUpdateCustomData]);

  const setMode = useCallback((newTheme: 'dark' | 'light') => {
    setStoredTheme(newTheme);
    setThemeState(newTheme);
    persistThemeToApi(newTheme);
    window.dispatchEvent(new Event('theme-changed'));
  }, [persistThemeToApi]);

  const toggleMode = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setMode(next);
  }, [theme, setMode]);

  const setLang = useCallback((newLang: string) => {
    setStoredLang(newLang);
    setLangState(newLang);
    persistLangToApi(newLang);
    window.dispatchEvent(new Event('preferences-changed'));
    onLangChange?.();
  }, [persistLangToApi, onLangChange]);

  const setAsOrg = useCallback((newOrgId: string | null) => {
    const previousOrg = asOrgRef.current;
    setStoredOrg(newOrgId);
    setAsOrgState(newOrgId);
    persistOrgToApi(newOrgId).then((ok) => {
      if (!ok) {
        console.warn('[PreferencesProvider] Org persistence failed, reverting');
        setStoredOrg(previousOrg);
        setAsOrgState(previousOrg); // also revert React state
      }
    });
    window.dispatchEvent(new Event('preferences-changed'));
  }, [persistOrgToApi]);

  const value = useMemo(
    () => ({
      theme: { mode: theme, colors, setMode, toggleMode },
      lang: { lang, setLang },
      org: { asOrg, setAsOrg },
    }),
    [theme, colors, setMode, toggleMode, lang, setLang, asOrg, setAsOrg]
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

  if (process.env.NODE_ENV === 'development') {
    console.warn('[useThemeMode] No PreferencesProvider found. Theme changes will not persist.');
  }

  if (typeof window === 'undefined') {
    return {
      mode: 'dark',
      colors: DARK_COLORS,
      setMode: () => {},
      toggleMode: () => {},
    };
  }

  const storedTheme = getStoredTheme();
  if (storedTheme) {
    return {
      mode: storedTheme,
      colors: storedTheme === 'dark' ? DARK_COLORS : LIGHT_COLORS,
      setMode: () => {},
      toggleMode: () => {},
    };
  }

  const autoTheme = getAutoDetectedTheme();
  return {
    mode: autoTheme,
    colors: autoTheme === 'dark' ? DARK_COLORS : LIGHT_COLORS,
    setMode: () => {},
    toggleMode: () => {},
  };
}

export function useLangMode(): LangModeContextValue {
  const context = useContext(PreferencesContext);

  if (context) {
    // Always read current value from storage, not React state
    const storedLang = getStoredLang();
    return {
      ...context.lang,
      lang: storedLang ?? context.lang.lang,
    };
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
    // Always read current value from storage, not React state
    const storedOrg = getStoredOrg();
    return {
      ...context.org,
      asOrg: storedOrg ?? context.org.asOrg,
    };
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
