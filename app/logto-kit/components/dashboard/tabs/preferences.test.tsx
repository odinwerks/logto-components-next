import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PreferencesTab } from './preferences';
import { DARK_COLORS } from '../../../themes';
import { enUS } from '../../../locales/en-US';

const { mockSetTheme, mockSetLang } = vi.hoisted(() => ({
  mockSetTheme: vi.fn(),
  mockSetLang: vi.fn(),
}));

vi.mock('../../providers/preferences', () => ({
  useThemeMode: () => ({ mode: 'light' as const, setMode: mockSetTheme }),
  useLangMode: () => ({ lang: 'en-US', setLang: mockSetLang }),
}));

describe('PreferencesTab theme semantics', () => {
  it('exposes selected state through radio semantics', () => {
    render(
      <PreferencesTab
        mode="dark"
        colors={DARK_COLORS}
        t={enUS}
        supportedLangs={['en-US', 'uk-UA']}
      />,
    );

    const light = screen.getByRole('radio', { name: enUS.common.lightTheme });
    const dark = screen.getByRole('radio', { name: enUS.common.darkTheme });

    expect(light).toHaveAttribute('aria-checked', 'true');
    expect(dark).toHaveAttribute('aria-checked', 'false');
  });

  it('selects a theme option when clicked', () => {
    render(
      <PreferencesTab
        mode="dark"
        colors={DARK_COLORS}
        t={enUS}
        supportedLangs={['en-US']}
      />,
    );

    fireEvent.click(screen.getByRole('radio', { name: enUS.common.darkTheme }));
    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });

  it('navigates theme options via Arrow keys (BUG-039: roving tabindex)', () => {
    render(
      <PreferencesTab
        mode="dark"
        colors={DARK_COLORS}
        t={enUS}
        supportedLangs={['en-US']}
      />,
    );

    const radiogroup = screen.getByRole('radiogroup', { name: enUS.common.appearance });
    const light = screen.getByRole('radio', { name: enUS.common.lightTheme });
    const dark = screen.getByRole('radio', { name: enUS.common.darkTheme });

    // Light is selected (activeMode = 'light' from mock), so it gets tabIndex=0
    expect(light).toHaveAttribute('tabindex', '0');
    expect(dark).toHaveAttribute('tabindex', '-1');

    // ArrowRight selects dark
    mockSetTheme.mockClear();
    fireEvent.keyDown(radiogroup, { key: 'ArrowRight' });
    expect(mockSetTheme).toHaveBeenCalledWith('dark');

    // ArrowUp on dark wraps back to light
    mockSetTheme.mockClear();
    fireEvent.keyDown(radiogroup, { key: 'ArrowUp' });
    expect(mockSetTheme).toHaveBeenCalledWith('light');

    // Home selects first option (light)
    mockSetTheme.mockClear();
    fireEvent.keyDown(radiogroup, { key: 'Home' });
    expect(mockSetTheme).toHaveBeenCalledWith('light');

    // End selects last option (dark)
    mockSetTheme.mockClear();
    fireEvent.keyDown(radiogroup, { key: 'End' });
    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });
});

describe('PreferencesTab language semantics', () => {
  it('renders a combobox trigger for language selection', () => {
    render(
      <PreferencesTab
        mode="dark"
        colors={DARK_COLORS}
        t={enUS}
        supportedLangs={['en-US', 'uk-UA']}
      />,
    );

    // Language heading is rendered
    expect(screen.getByText(enUS.common.language)).toBeInTheDocument();

    // The language selector is a combobox button, not a <select> element
    const combobox = screen.getByRole('combobox', { name: /language selector/i });
    expect(combobox).toBeInTheDocument();
    expect(combobox.tagName).toBe('BUTTON');
    expect(combobox).toHaveAttribute('aria-haspopup', 'listbox');
  });

  it('opens dropdown and selects a language via click', () => {
    render(
      <PreferencesTab
        mode="dark"
        colors={DARK_COLORS}
        t={enUS}
        supportedLangs={['en-US', 'ka-GE', 'uk-UA']}
      />,
    );

    const combobox = screen.getByRole('combobox', { name: /language selector/i });
    fireEvent.click(combobox);

    // Dropdown is open — search input visible
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();

    // Find and click a language option
    const ukrainianOption = screen.getByText('Ukrainian');
    fireEvent.click(ukrainianOption);

    expect(mockSetLang).toHaveBeenCalledWith('uk-UA');
  });

  it('opens dropdown and selects a language via keyboard (Enter)', () => {
    render(
      <PreferencesTab
        mode="dark"
        colors={DARK_COLORS}
        t={enUS}
        supportedLangs={['en-US', 'ka-GE', 'uk-UA']}
      />,
    );

    const combobox = screen.getByRole('combobox', { name: /language selector/i });
    fireEvent.keyDown(combobox, { key: 'Enter', code: 'Enter' });

    const searchInput = screen.getByRole('searchbox', { name: /search languages/i });
    // With en-US selected, Georgian is index 1 — ArrowDown moves to it
    fireEvent.keyDown(searchInput, { key: 'ArrowDown', code: 'ArrowDown' });
    fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });

    expect(mockSetLang).toHaveBeenCalledWith('ka-GE');
  });
});
