import React from 'react';
import { describe, expect, it, vi } from 'vitest';

const { mockResolveLang, mockLangSync } = vi.hoisted(() => ({
  mockResolveLang: vi.fn((lang: string | undefined | null) => (lang === 'ka-GE' ? 'ka-GE' : 'en-US')),
  mockLangSync: vi.fn(() => null),
}));

vi.mock('next/font/google', () => ({
  IBM_Plex_Mono: () => ({ variable: 'plex-mono' }),
  Instrument_Serif: () => ({ variable: 'instrument-serif' }),
  DM_Sans: () => ({ variable: 'dm-sans' }),
}));

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers()),
}));

vi.mock('./logto-kit/logic/cached-dashboard', () => ({
  fetchDashboardDataCached: vi.fn(async () => ({
    success: true,
    userData: { customData: { Preferences: { lang: 'not-a-locale' } } },
  })),
}));

vi.mock('./logto-kit/logic/i18n', () => ({
  resolveLang: mockResolveLang,
}));

vi.mock('./logto-kit/logic/preferences', () => ({
  getPreferencesFromUserData: vi.fn(() => ({ lang: 'not-a-locale' })),
}));

vi.mock('./logto-kit/themes', () => ({
  getDefaultThemeMode: vi.fn(() => 'dark'),
}));

vi.mock('./logto-kit/locales', () => ({
  getAllTranslations: vi.fn(() => ({ 'en-US': {} })),
}));

vi.mock('./logto-kit/components/LangSync', () => ({
  LangSync: mockLangSync,
}));

vi.mock('./logto-kit/components/providers/logto-provider', () => ({
  LogtoProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('./logto-kit/components/providers/auth-watcher', () => ({ default: () => null }));
vi.mock('./logto-kit/components/providers/session-heartbeat', () => ({ default: () => null }));
vi.mock('./logto-kit/components/shared/motion', () => ({
  MotionConfigProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('./logto-kit/components/dashboard', () => ({ Dashboard: () => null }));
vi.mock('./logto-kit/components/dashboard/mobile-page', () => ({ MobileDashboard: () => null }));

import RootLayout from './layout';

describe('RootLayout', () => {
  it('uses the canonical locale fallback for an invalid stored preference during SSR', async () => {
    const tree = await RootLayout({ children: <main>content</main> });
    const html = tree;

    expect(html.props.lang).toBe('en-US');
    expect(mockResolveLang).toHaveBeenCalledWith('not-a-locale');
    const langSync = findElementByType(html, mockLangSync);
    expect(langSync?.props.defaultLang).toBe('en-US');
  });
});

function findElementByType(
  element: React.ReactNode,
  type: unknown,
): React.ReactElement<Record<string, unknown>> | undefined {
  if (!React.isValidElement(element)) return undefined;
  const validElement = element as React.ReactElement<Record<string, unknown>>;
  if (validElement.type === type) return validElement;

  for (const child of React.Children.toArray(validElement.props.children as React.ReactNode)) {
    const match = findElementByType(child, type);
    if (match) return match;
  }
  return undefined;
}
