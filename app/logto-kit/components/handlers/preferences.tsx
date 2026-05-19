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
  const [lang, setLangState] = useState<string>(serverDefaultLang);
  const [asOrg, setAsOrgState] = useState<string | null>(initialOrgId ?? null);

  // Track the initial theme to skip the redundant first render — the theme
  // script in <head> already sets data-theme before React hydrates.
  const initialThemeRef = useRef(initialTheme);

  // After mount, sync with sessionStorage (avoids hydration mismatch)
  useEffect(() => {
    const storedTheme = getStoredTheme();
    if (storedTheme && storedTheme !== initialTheme) setThemeState(storedTheme);

    const storedLang = getStoredLang();
    if (storedLang && storedLang !== serverDefaultLang) setLangState(storedLang);

    const storedOrg = getStoredOrg();
    if (storedOrg !== null && storedOrg !== (initialOrgId ?? null)) setAsOrgState(storedOrg);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Refs to avoid stale closures in persist callbacks
  const themeRef = useRef(theme);
  useEffect(() => { themeRef.current = theme; }, [theme]);

  const langRef = useRef(lang);
  useEffect(() => { langRef.current = lang; }, [lang]);

  const asOrgRef = useRef(asOrg);
  useEffect(() => { asOrgRef.current = asOrg; }, [asOrg]);

  useEffect(() => {
    // Skip the initial render — the theme script in <head> already set data-theme.
    // Only apply updates when the user explicitly changes the theme.
    if (theme !== initialThemeRef.current) {
      document.documentElement.setAttribute('data-theme', theme);
    }
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

  const persistTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistPreferences = useCallback(async (
    updates: Partial<{ theme: 'dark' | 'light'; lang: string; asOrg: string | null }>,
  ): Promise<ActionResult> => {
    if (!onUpdateCustomData) return { ok: true };

    return new Promise<ActionResult>((resolve) => {
      if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current);
      persistTimeoutRef.current = setTimeout(async () => {
        // Read latest refs at flush time
        const r = await onUpdateCustomData({
          Preferences: {
            theme: themeRef.current,
            lang: langRef.current,
            asOrg: asOrgRef.current,
          },
        });
        if (!r.ok) {
          console.error('[PreferencesProvider] Failed to persist preferences:', r.error);
        }
        resolve(r);
      }, 100);
    });
  }, [onUpdateCustomData]);

  const setMode = useCallback(async (newTheme: 'dark' | 'light') => {
    const prev = theme;
    setStoredTheme(newTheme);
    setThemeState(newTheme);
    const r = await persistPreferences({ theme: newTheme });
    if (!r.ok) {
      // Rollback
      setStoredTheme(prev);
      setThemeState(prev);
      console.error('[PreferencesProvider] Failed to persist theme, rolled back:', r.error);
    }
    window.dispatchEvent(new Event('theme-changed'));
  }, [persistPreferences, theme]);

  const toggleMode = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setMode(next);
  }, [theme, setMode]);

  const setLang = useCallback(async (newLang: string) => {
    const prev = lang;
    setStoredLang(newLang);
    setLangState(newLang);
    const r = await persistPreferences({ lang: newLang });
    if (!r.ok) {
      // Rollback
      setStoredLang(prev);
      setLangState(prev);
      console.error('[PreferencesProvider] Failed to persist lang, rolled back:', r.error);
    }
    window.dispatchEvent(new Event('preferences-changed'));
    onLangChange?.();
  }, [persistPreferences, onLangChange, lang]);

  const setAsOrg = useCallback(async (newOrgId: string | null) => {
    const prev = asOrg;
    setStoredOrg(newOrgId);
    setAsOrgState(newOrgId);
    const r = await persistPreferences({ asOrg: newOrgId });
    if (!r.ok) {
      // Rollback
      setStoredOrg(prev);
      setAsOrgState(prev);
      console.error('[PreferencesProvider] Failed to persist org, rolled back:', r.error);
    }
    window.dispatchEvent(new Event('preferences-changed'));
  }, [persistPreferences, asOrg]);

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

export function clearAllPreferences(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(THEME_STORAGE_KEY);
  sessionStorage.removeItem(LANG_STORAGE_KEY);
  sessionStorage.removeItem(ORG_STORAGE_KEY);
  sessionStorage.removeItem('user-data');
}
