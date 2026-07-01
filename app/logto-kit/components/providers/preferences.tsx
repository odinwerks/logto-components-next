'use client';

import { createContext, useContext, useState, useMemo, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { type ThemeColors, DARK_COLORS, LIGHT_COLORS } from '../../themes';
import { getDefaultLang, type LocaleCode } from '../../logic/i18n';
import type { ActionResult } from '../../logic/actions/safe';

export type { ThemeColors, LocaleCode };

const THEME_STORAGE_KEY = 'theme-mode';
const LANG_STORAGE_KEY = 'lang-mode';
const ORG_STORAGE_KEY = 'org-mode';

// 1 year in seconds — keeps the language preference available to server-side
// sign-in entry points (e.g. /api/auth/sign-in) across sessions.
const LANG_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function setLangCookie(lang: string) {
  if (typeof document === 'undefined') return;
  try {
    document.cookie = `${LANG_STORAGE_KEY}=${encodeURIComponent(lang)};path=/;max-age=${LANG_COOKIE_MAX_AGE_SECONDS};SameSite=Lax`;
  } catch {
    // Safe no-op if cookies are disabled.
  }
}

function createStorageHelpers<T>(key: string) {
  return {
    get: (): T | null => {
      if (typeof window === 'undefined') return null;
      try {
        return sessionStorage.getItem(key) as T | null;
      } catch {
        return null;
      }
    },
    set: (value: T) => {
      if (typeof window === 'undefined') return;
      try {
        if (value === null) {
          sessionStorage.removeItem(key);
        } else {
          sessionStorage.setItem(key, String(value));
        }
      } catch {
        // Safe no-op on SecurityError
      }
    },
  };
}

const themeStorage = createStorageHelpers<'dark' | 'light'>(THEME_STORAGE_KEY);
const langStorage = createStorageHelpers<string>(LANG_STORAGE_KEY);
const orgStorage = createStorageHelpers<string | null>(ORG_STORAGE_KEY);

function getStoredTheme(): 'dark' | 'light' | null {
  const raw = themeStorage.get();
  // Validate at runtime: sessionStorage returns raw strings, so we must guard
  // against corrupted or unexpected values before using the typed result.
  if (raw === 'dark' || raw === 'light') return raw;
  return null;
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
  initialTheme,
  initialLang,
  initialOrgId,
  onUpdateCustomData,
  onLangChange,
  onPersistError,
}: {
  children: ReactNode;
  initialTheme?: 'dark' | 'light';
  initialLang?: string;
  initialOrgId?: string | null;
  onUpdateCustomData?: (customData: Record<string, unknown>) => Promise<ActionResult>;
  onLangChange?: () => void;
  onPersistError?: (message: string) => void;
}) {
  const serverDefaultLang = initialLang ?? getDefaultLang();

  const [theme, setThemeState] = useState<'dark' | 'light'>(initialTheme ?? 'dark');
  const [lang, setLangState] = useState<string>(serverDefaultLang);
  const [asOrg, setAsOrgState] = useState<string | null>(initialOrgId ?? null);

  // Refs for preference values to avoid stale closures in persist callbacks
  const themeRef = useRef(theme);
  const langRef = useRef(lang);
  const asOrgRef = useRef(asOrg);
  const themePersistMutationSeqRef = useRef(0);
  const langPersistMutationSeqRef = useRef(0);
  const asOrgPersistMutationSeqRef = useRef(0);
  // Ref to onUpdateCustomData so stable persist callbacks can access the latest value
  const onUpdateCustomDataRef = useRef(onUpdateCustomData);
  // Ref to onPersistError so stable persist callbacks can access the latest value
  const onPersistErrorRef = useRef(onPersistError);

  const didSyncFromStorage = useRef(false);
  useEffect(() => {
    onUpdateCustomDataRef.current = onUpdateCustomData;
  }, [onUpdateCustomData]);
  useEffect(() => {
    onPersistErrorRef.current = onPersistError;
  }, [onPersistError]);
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (didSyncFromStorage.current) return;
    didSyncFromStorage.current = true;
    
    // Fix: cached user preference wins over server-provided initial value.
    // Only fall back to server prop when no user selection is stored.
    const cachedTheme = getStoredTheme();
    if (cachedTheme) {
      if (cachedTheme !== themeRef.current) setThemeState(cachedTheme);
    } else if (initialTheme) {
      setStoredTheme(initialTheme);
      setThemeState(initialTheme);
    }

    const cachedLang = getStoredLang();
    if (cachedLang) {
      if (cachedLang !== langRef.current) setLangState(cachedLang);
      setLangCookie(cachedLang);
    } else if (initialLang) {
      setStoredLang(initialLang);
      setLangCookie(initialLang);
      setLangState(initialLang);
    }

    const cachedOrg = getStoredOrg();
    if (cachedOrg !== null) {
      if (cachedOrg !== asOrgRef.current) setAsOrgState(cachedOrg);
    } else if (initialOrgId !== undefined) {
      setStoredOrg(initialOrgId ?? null);
      setAsOrgState(initialOrgId ?? null);
    }
  }, [initialTheme, initialLang, initialOrgId]);
  /* eslint-enable react-hooks/set-state-in-effect */

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
      const customEvent = e as CustomEvent<{ lang?: string }>;
      const detail = customEvent.detail || {};
      
      const hasDetail = 'lang' in detail;
      const newLang = hasDetail ? detail.lang : getStoredLang();

      if (newLang && newLang !== langRef.current) {
        setStoredLang(newLang);
        setLangCookie(newLang);
        setLangState(newLang);
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

  // Persisters are stable callbacks created once at mount.
  // useCallback with [] deps ensures they never change reference.
  // Ref access inside useCallback is allowed (refs are not needed for rendering).
  const persistTheme = useCallback(async (
    newTheme: 'dark' | 'light',
    prev: 'dark' | 'light',
  ) => {
    const onUpdateCustomData = onUpdateCustomDataRef.current;
    if (!onUpdateCustomData) return;
    const seq = ++themePersistMutationSeqRef.current;
    try {
      const r = await onUpdateCustomData({ Preferences: { theme: newTheme } });
      if (seq !== themePersistMutationSeqRef.current) return;
      if (!r.ok) {
        console.error('[PreferencesProvider] Failed to persist theme:', r.error);
        setStoredTheme(prev);
        setThemeState(prev);
        onPersistErrorRef.current?.('Failed to save theme preference');
      }
    } catch {
      if (seq !== themePersistMutationSeqRef.current) return;
      setStoredTheme(prev);
      setThemeState(prev);
      onPersistErrorRef.current?.('Failed to save theme preference');
    }
  }, []);

  const persistLang = useCallback(async (
    newLang: string,
    prev: string,
  ) => {
    const onUpdateCustomData = onUpdateCustomDataRef.current;
    if (!onUpdateCustomData) return;
    const seq = ++langPersistMutationSeqRef.current;
    try {
      const r = await onUpdateCustomData({ Preferences: { lang: newLang } });
      if (seq !== langPersistMutationSeqRef.current) return;
      if (!r.ok) {
        console.error('[PreferencesProvider] Failed to persist lang:', r.error);
        setStoredLang(prev);
        setLangState(prev);
        onPersistErrorRef.current?.('Failed to save language preference');
      }
    } catch {
      if (seq !== langPersistMutationSeqRef.current) return;
      setStoredLang(prev);
      setLangState(prev);
      onPersistErrorRef.current?.('Failed to save language preference');
    }
  }, []);

  const persistOrg = useCallback(async (
    newOrgId: string | null,
    prev: string | null,
  ) => {
    const onUpdateCustomData = onUpdateCustomDataRef.current;
    if (!onUpdateCustomData) return;
    const seq = ++asOrgPersistMutationSeqRef.current;
    try {
      const r = await onUpdateCustomData({ Preferences: { asOrg: newOrgId } });
      if (seq !== asOrgPersistMutationSeqRef.current) return;
      if (!r.ok) {
        console.error('[PreferencesProvider] Failed to persist org:', r.error);
        setStoredOrg(prev);
        setAsOrgState(prev);
        onPersistErrorRef.current?.('Failed to save organization preference');
      }
    } catch {
      if (seq !== asOrgPersistMutationSeqRef.current) return;
      setStoredOrg(prev);
      setAsOrgState(prev);
      onPersistErrorRef.current?.('Failed to save organization preference');
    }
  }, []);

  const setMode = useCallback((newTheme: 'dark' | 'light') => {
    const prev = themeRef.current;
    themeRef.current = newTheme;
    setStoredTheme(newTheme);
    setThemeState(newTheme);
    persistTheme(newTheme, prev);
    window.dispatchEvent(new Event('theme-changed'));
  }, [persistTheme]);

  const toggleMode = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setMode(next);
  }, [theme, setMode]);

  const setLang = useCallback((newLang: string) => {
    const prev = langRef.current;
    langRef.current = newLang;
    setStoredLang(newLang);
    setLangCookie(newLang);
    setLangState(newLang);
    persistLang(newLang, prev);
    window.dispatchEvent(new CustomEvent('preferences-changed', { detail: { lang: newLang } }));
    onLangChange?.();
  }, [persistLang, onLangChange]);

  const setAsOrg = useCallback((newOrgId: string | null) => {
    const prev = asOrgRef.current;
    asOrgRef.current = newOrgId;
    setStoredOrg(newOrgId);
    setAsOrgState(newOrgId);
    persistOrg(newOrgId, prev);
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
