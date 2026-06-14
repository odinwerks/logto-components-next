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
});

describe('PreferencesTab language semantics', () => {
  it('associates the language select with its label', () => {
    render(
      <PreferencesTab
        mode="dark"
        colors={DARK_COLORS}
        t={enUS}
        supportedLangs={['en-US', 'uk-UA']}
      />,
    );

    const select = screen.getByLabelText(enUS.common.language);
    expect(select).toBeInTheDocument();
    expect(select.tagName).toBe('SELECT');
    expect(select).toHaveAttribute('id', 'lang-select');
  });
});
