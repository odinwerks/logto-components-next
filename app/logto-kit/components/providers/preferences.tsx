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

  useEffect(() => {
    themeRef.current = theme;
    langRef.current = lang;
    asOrgRef.current = asOrg;
  }, [theme, lang, asOrg]);

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

   
  function createPersister<T>(
    label: string,
    seqRef: React.MutableRefObject<number>,
    revertStorage: (val: T) => void,
    revertState: React.Dispatch<React.SetStateAction<T>>,
  ) {
    return async (
      update: Partial<{ theme: 'dark' | 'light'; lang: string; asOrg: string | null }>,
      prev: T,
    ) => {
      if (!onUpdateCustomData) return;
      const seq = ++seqRef.current;
      try {
        /* eslint-disable react-hooks/refs */
        const currentPrefs = { theme: themeRef.current, lang: langRef.current, asOrg: asOrgRef.current };
        const r = await onUpdateCustomData({ Preferences: { ...currentPrefs, ...update } });
        if (seq !== seqRef.current) return; // stale
        if (!r.ok) {
          console.error(`[PreferencesProvider] Failed to persist ${label}:`, r.error);
          revertStorage(prev);
          revertState(prev);
        }
      } catch {
        if (seq !== seqRef.current) return;
        revertStorage(prev);
        revertState(prev);
      }
    };
        /* eslint-enable react-hooks/refs */
  }

   
  const persistTheme = createPersister('theme', themePersistMutationSeqRef, (v) => setStoredTheme(v), setThemeState);
   
  const persistLang = createPersister('lang', langPersistMutationSeqRef, (v) => setStoredLang(v), setLangState);
   
  const persistOrg = createPersister('org', asOrgPersistMutationSeqRef, (v) => setStoredOrg(v), setAsOrgState);

  const setMode = useCallback((newTheme: 'dark' | 'light') => {
    const prev = themeRef.current;
    setStoredTheme(newTheme);
    setThemeState(newTheme);
    persistTheme({ theme: newTheme, lang: langRef.current, asOrg: asOrgRef.current }, prev);
    window.dispatchEvent(new Event('theme-changed'));
  }, [persistTheme]);

  const toggleMode = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setMode(next);
  }, [theme, setMode]);

  const setLang = useCallback((newLang: string) => {
    const prev = langRef.current;
    setStoredLang(newLang);
    setLangState(newLang);
    persistLang({ theme: themeRef.current, lang: newLang, asOrg: asOrgRef.current }, prev);
    window.dispatchEvent(new Event('preferences-changed'));
    onLangChange?.();
  }, [persistLang, onLangChange]);

  const setAsOrg = useCallback((newOrgId: string | null) => {
    const prev = asOrgRef.current;
    setStoredOrg(newOrgId);
    setAsOrgState(newOrgId);
    persistOrg({ theme: themeRef.current, lang: langRef.current, asOrg: newOrgId }, prev);
    window.dispatchEvent(new Event('preferences-changed'));
  }, [persistOrg]);

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
