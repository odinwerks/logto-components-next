'use client';

import { createContext, useContext, useState, useMemo, useEffect, useCallback, type ReactNode } from 'react';
import { getDefaultLang, type LocaleCode } from '../../logic/i18n';

export type { LocaleCode };

const STORAGE_KEY = 'lang-mode';

function getStoredLang(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(STORAGE_KEY);
}

function setStoredLang(lang: string) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(STORAGE_KEY, lang);
}

interface LangModeContextValue {
  lang: string;
  setLang: (lang: string) => void;
}

const LangModeContext = createContext<LangModeContextValue | null>(null);

function getInitialLang(serverDefault: string): string {
  const stored = getStoredLang();
  if (stored) return stored;
  return serverDefault;
}

export function LangModeProvider({
  children,
  initialLang,
  onUpdateCustomData,
  onLangChange,
}: {
  children: ReactNode;
  initialLang?: string;
  onUpdateCustomData?: (customData: Record<string, unknown>) => Promise<void>;
  onLangChange?: () => void;
}) {
  const serverDefault = initialLang ?? getDefaultLang();
  const [lang, setLangState] = useState<string>(() => getInitialLang(serverDefault));

  useEffect(() => {
    const stored = getStoredLang();
    if (stored && stored !== lang) {
      setLangState(stored);
    }
  }, []);

  const persistToApi = useCallback(async (newLang: string) => {
    if (!onUpdateCustomData) return;
    try {
      await onUpdateCustomData({ Preferences: { theme: 'dark', lang: newLang } });
    } catch (err) {
      console.error('[LangModeProvider] Failed to persist:', err);
    }
  }, [onUpdateCustomData]);

  const setLang = useCallback((newLang: string) => {
    setStoredLang(newLang);
    setLangState(newLang);
    persistToApi(newLang);
    onLangChange?.();
  }, [persistToApi, onLangChange]);

  const value = useMemo(
    () => ({ lang, setLang }),
    [lang]
  );

  return (
    <LangModeContext.Provider value={value}>
      {children}
    </LangModeContext.Provider>
  );
}

export function useLangMode(): LangModeContextValue {
  const context = useContext(LangModeContext);

  if (context) {
    return context;
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
