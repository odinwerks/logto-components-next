'use client';

import { useEffect } from 'react';

export interface LangSyncProps {
  defaultLang?: string;
}

/**
 * Syncs the user's language preference from sessionStorage to the
 * document's `lang` attribute so screen readers pronounce text correctly.
 *
 * sessionStorage key: `lang-mode` (set by PreferencesProvider).
 * Also listens for `preferences-changed` events to stay in sync.
 */
export function LangSync({ defaultLang }: LangSyncProps = {}) {
  useEffect(() => {
    const sync = () => {
      try {
        let stored = sessionStorage.getItem('lang-mode');
        if (!stored) {
          stored = defaultLang || document.documentElement.lang || 'en';
          sessionStorage.setItem('lang-mode', stored);
        }
        if (stored) {
          document.documentElement.lang = stored;
        }
      } catch {
        // Safe no-op on SecurityError
      }
    };
    sync();
    window.addEventListener('preferences-changed', sync);
    return () => window.removeEventListener('preferences-changed', sync);
  }, [defaultLang]);

  return null;
}
