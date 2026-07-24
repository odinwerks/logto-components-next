'use client';

import { useEffect } from 'react';
import { createStorageHelpers } from '../logic/client-storage';

export interface LangSyncProps {
  defaultLang?: string;
}

// Shared `SecurityError`-safe sessionStorage helper (Phase 6). Reads only —
// `PreferencesProvider` is the single owner of `lang-mode` writes (Phase 6
// race fix). `LangSync` no longer calls `setItem('lang-mode', ...)`; it only
// reads the stored value and applies it to the DOM attribute.
const langStorage = createStorageHelpers<string>('lang-mode');

/**
 * Syncs the user's language preference from sessionStorage to the
 * document's `lang` attribute so screen readers pronounce text correctly.
 *
 * sessionStorage key: `lang-mode` (owned and written by `PreferencesProvider`).
 *
 * Phase 6 race fix: this component is now a READ-ONLY syncer. It no longer
 * writes `lang-mode` to sessionStorage. Previously both `LangSync` and
 * `PreferencesProvider` wrote the key on mount and "last writer wins"
 * produced a race where the DOM-derived default could overwrite the
 * server-derived one. Now `PreferencesProvider` is the single writer; this
 * component only reads and applies the value to
 * `document.documentElement.lang`. When no stored value exists yet (the
 * brief window before `PreferencesProvider`'s mount effect runs), this
 * component applies `defaultLang || document.documentElement.lang || 'en'`
 * to the DOM attribute WITHOUT persisting — `PreferencesProvider` will
 * persist the canonical initial value.
 *
 * Also listens for `preferences-changed` events to stay in sync when the
 * language changes elsewhere.
 */
export function LangSync({ defaultLang }: LangSyncProps = {}) {
  useEffect(() => {
    const sync = () => {
      // READ-ONLY: never call `sessionStorage.setItem` from here.
      // `PreferencesProvider` owns all `lang-mode` writes.
      const stored = langStorage.get();
      const effective = stored || defaultLang || document.documentElement.lang || 'en';
      if (effective) {
        document.documentElement.lang = effective;
      }
    };
    sync();
    window.addEventListener('preferences-changed', sync);
    return () => window.removeEventListener('preferences-changed', sync);
  }, [defaultLang]);

  return null;
}
