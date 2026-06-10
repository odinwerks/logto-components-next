'use client';

import { useEffect } from 'react';

/**
 * Syncs the user's language preference from sessionStorage to the
 * document's `lang` attribute so screen readers pronounce text correctly.
 *
 * sessionStorage key: `lang-mode` (set by PreferencesProvider).
 * Also listens for `preferences-changed` events to stay in sync.
 */
export function LangSync() {
  useEffect(() => {
    const sync = () => {
      const stored = sessionStorage.getItem('lang-mode');
      if (stored) {
        document.documentElement.lang = stored;
      }
    };
    sync();
    window.addEventListener('preferences-changed', sync);
    return () => window.removeEventListener('preferences-changed', sync);
  }, []);

  return null;
}
