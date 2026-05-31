import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useEffect } from 'react';
import { PreferencesProvider, useThemeMode } from './preferences';

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

  it('initializes theme state directly to initialTheme and disregards cached sessionStorage initially', () => {
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

    // During render (and first mount), the theme state should be initialized directly to initialTheme ("light")
    // and useThemeMode should return that React state from context, rather than the cached "dark" from sessionStorage
    expect(renderedTheme).toBe('light');
  });

  it('updates sessionStorage with initialTheme on mount', () => {
    sessionStorage.setItem('theme-mode', 'dark');

    render(
      <PreferencesProvider initialTheme="light">
        <div>Test</div>
      </PreferencesProvider>
    );

    // After mount/useEffect, sessionStorage should be overwritten with initialTheme ("light")
    expect(sessionStorage.getItem('theme-mode')).toBe('light');
  });
});
