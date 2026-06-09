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

  // Refs for preference values to avoid stale closures in persist callbacks
  const themeRef = useRef(theme);
  const langRef = useRef(lang);
  const asOrgRef = useRef(asOrg);
  const themePersistMutationSeqRef = useRef(0);
  const langPersistMutationSeqRef = useRef(0);
  const asOrgPersistMutationSeqRef = useRef(0);

  const didSyncFromStorage = useRef(false);
  useEffect(() => {
    if (didSyncFromStorage.current) return;
    didSyncFromStorage.current = true;
    const cachedTheme = getStoredTheme();
    if (cachedTheme && cachedTheme !== themeRef.current) setThemeState(cachedTheme);

    const cachedLang = getStoredLang();
    if (cachedLang && cachedLang !== langRef.current) setLangState(cachedLang);

    const cachedOrg = getStoredOrg();
    if (cachedOrg && cachedOrg !== asOrgRef.current) setAsOrgState(cachedOrg);
  }, []);

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

    const handlePreferencesChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ lang?: string; asOrg?: string | null }>;
      const detail = customEvent.detail || {};
      const newLang = detail.lang || getStoredLang();
      const newAsOrg = detail.asOrg !== undefined ? detail.asOrg : getStoredOrg();

      if (newLang && newLang !== langRef.current) {
        setStoredLang(newLang);
        setLangState(newLang);
      }
      if (newAsOrg !== undefined && newAsOrg !== asOrgRef.current) {
        setStoredOrg(newAsOrg);
        setAsOrgState(newAsOrg);
      }
    };

    window.addEventListener('preferences-changed', handlePreferencesChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
      window.removeEventListener('preferences-changed', handlePreferencesChange);
    };
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

  const persistThemeToApi = useCallback(async (newTheme: 'dark' | 'light', currentLang: string, currentAsOrg: string | null): Promise<boolean> => {
    if (!onUpdateCustomData) return true;
    const r = await onUpdateCustomData({ Preferences: { theme: newTheme, lang: currentLang, asOrg: currentAsOrg } });
    if (!r.ok) {
      console.error('[PreferencesProvider] Failed to persist theme:', r.error);
    }
    return r.ok;
  }, [onUpdateCustomData]);

  const persistLangToApi = useCallback(async (newLang: string, currentTheme: 'dark' | 'light', currentAsOrg: string | null): Promise<boolean> => {
    if (!onUpdateCustomData) return true;
    const r = await onUpdateCustomData({ Preferences: { theme: currentTheme, lang: newLang, asOrg: currentAsOrg } });
    if (!r.ok) {
      console.error('[PreferencesProvider] Failed to persist lang:', r.error);
    }
    return r.ok;
  }, [onUpdateCustomData]);

  const persistOrgToApi = useCallback(async (newOrgId: string | null, currentTheme: 'dark' | 'light', currentLang: string) => {
    if (!onUpdateCustomData) return true;
    const r = await onUpdateCustomData({ Preferences: { theme: currentTheme, lang: currentLang, asOrg: newOrgId } });
    if (!r.ok) {
      console.error('[PreferencesProvider] Failed to persist org:', r.error);
    }
    return r.ok;
  }, [onUpdateCustomData]);

  const setMode = useCallback((newTheme: 'dark' | 'light') => {
    const prev = themeRef.current;
    const mutationSeq = ++themePersistMutationSeqRef.current;
    setStoredTheme(newTheme);
    setThemeState(newTheme);
    persistThemeToApi(newTheme, langRef.current, asOrgRef.current).then((ok) => {
      if (mutationSeq !== themePersistMutationSeqRef.current) {
        return;
      }

      if (!ok) {
        console.warn('[PreferencesProvider] Theme persistence failed, reverting');
        setStoredTheme(prev);
        setThemeState(prev);
      }
    });
    window.dispatchEvent(new Event('theme-changed'));
  }, [persistThemeToApi]);

  const toggleMode = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setMode(next);
  }, [theme, setMode]);

  const setLang = useCallback((newLang: string) => {
    const prev = langRef.current;
    const mutationSeq = ++langPersistMutationSeqRef.current;
    setStoredLang(newLang);
    setLangState(newLang);
    persistLangToApi(newLang, themeRef.current, asOrgRef.current).then((ok) => {
      if (mutationSeq !== langPersistMutationSeqRef.current) {
        return;
      }

      if (!ok) {
        console.warn('[PreferencesProvider] Lang persistence failed, reverting');
        setStoredLang(prev);
        setLangState(prev);
      }
    });
    window.dispatchEvent(new Event('preferences-changed'));
    onLangChange?.();
  }, [persistLangToApi, onLangChange]);

  const setAsOrg = useCallback((newOrgId: string | null) => {
    const previousOrg = asOrgRef.current;
    const mutationSeq = ++asOrgPersistMutationSeqRef.current;
    setStoredOrg(newOrgId);
    setAsOrgState(newOrgId);
    persistOrgToApi(newOrgId, themeRef.current, langRef.current).then((ok) => {
      if (mutationSeq !== asOrgPersistMutationSeqRef.current) {
        return;
      }

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

  return {
    mode: 'dark',
    colors: DARK_COLORS,
    setMode: () => {},
    toggleMode: () => {},
  };
}

export function useLangMode(): LangModeContextValue {
  const context = useContext(PreferencesContext);

  if (context) {
    return context.lang;
  }

  return {
    lang: getDefaultLang(),
    setLang: () => {},
  };
}

export function useOrgMode(): OrgModeContextValue {
  const context = useContext(PreferencesContext);

  if (context) {
    return context.org;
  }

  return {
    asOrg: null,
    setAsOrg: () => {},
  };
}
