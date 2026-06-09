'use client';

import { useEffect } from 'react';

/**
 * Syncs the user's language preference from sessionStorage to the
 * document's `lang` attribute so screen readers pronounce text correctly.
 *
 * sessionStorage key: `lang-mode` (set by PreferencesProvider).
 */
export function LangSync() {
  useEffect(() => {
    const stored = sessionStorage.getItem('lang-mode');
    if (stored) {
      document.documentElement.lang = stored;
    }
  }, []);

  return null;
}
