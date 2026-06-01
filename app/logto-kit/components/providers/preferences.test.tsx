import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useEffect } from 'react';
import { PreferencesProvider, useThemeMode, useLangMode, useOrgMode } from './preferences';

describe('PreferencesProvider & useThemeMode (BUG-001)', () => {
  beforeEach(() => {
    // Clear and mock sessionStorage
    const store: Record<string, string> = {};
    vi.stubGlobal('sessionStorage', {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
    });

    // Mock window.matchMedia
    vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // Deprecated
      removeListener: vi.fn(), // Deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes theme state directly to cached theme in sessionStorage on reload', () => {
    // Simulate cached theme in sessionStorage
    sessionStorage.setItem('theme-mode', 'dark');

    let renderedTheme: 'dark' | 'light' | undefined;
    
    function TestComponent() {
      const theme = useThemeMode();
      renderedTheme = theme.mode;
      return <div>Theme: {theme.mode}</div>;
    }

    render(
      <PreferencesProvider initialTheme="light">
        <TestComponent />
      </PreferencesProvider>
    );

    // It should respect sessionStorage and initialize to 'dark', not 'light'
    expect(renderedTheme).toBe('dark');
  });

  it('does not overwrite cached theme in sessionStorage on mount', () => {
    sessionStorage.setItem('theme-mode', 'dark');

    render(
      <PreferencesProvider initialTheme="light">
        <div>Test</div>
      </PreferencesProvider>
    );

    // Since the write-on-mount useEffect is removed, the cached 'dark' should NOT be overwritten
    expect(sessionStorage.getItem('theme-mode')).toBe('dark');
  });

  it('listens for preferences-changed events and updates lang and org state dynamically', () => {
    let renderedLang: string | undefined;
    let renderedOrg: string | null | undefined;
    
    function TestComponent() {
      const { lang } = useLangMode();
      const { asOrg } = useOrgMode();
      renderedLang = lang;
      renderedOrg = asOrg;
      return <div>Lang: {lang}, Org: {asOrg}</div>;
    }

    render(
      <PreferencesProvider initialLang="en" initialOrgId="org_1">
        <TestComponent />
      </PreferencesProvider>
    );

    expect(renderedLang).toBe('en');
    expect(renderedOrg).toBe('org_1');

    // Now, let's update lang and org in storage and dispatch the event
    sessionStorage.setItem('lang-mode', 'fr');
    sessionStorage.setItem('org-mode', 'org_2');

    act(() => {
      window.dispatchEvent(new Event('preferences-changed'));
    });

    // It should have reactive update
    expect(renderedLang).toBe('fr');
    expect(renderedOrg).toBe('org_2');

    // Also support CustomEvent detail
    act(() => {
      window.dispatchEvent(new CustomEvent('preferences-changed', {
        detail: { lang: 'es', asOrg: 'org_3' }
      }));
    });

    expect(renderedLang).toBe('es');
    expect(renderedOrg).toBe('org_3');
  });
});
