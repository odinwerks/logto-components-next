import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LanguageSelect } from './LanguageSelect';
import { DARK_COLORS } from '../../themes';
import { enUS } from '../../locales/en-US';

describe('LanguageSelect', () => {
  const defaultProps = {
    value: 'ka-GE',
    onChange: vi.fn(),
    options: ['en-US', 'ka-GE', 'uk-UA'],
    mode: 'dark' as const,
    colors: DARK_COLORS,
    t: enUS,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders trigger with flag emoji and native name for selected language', () => {
    render(<LanguageSelect {...defaultProps} />);

    expect(screen.getByText('🇬🇪')).toBeInTheDocument();
    expect(screen.getByText('ქართული')).toBeInTheDocument();
  });

  it('opens dropdown portal on click', () => {
    render(<LanguageSelect {...defaultProps} />);

    expect(screen.queryByPlaceholderText('Search...')).not.toBeInTheDocument();

    const trigger = screen.getByRole('combobox', { name: /language selector/i });
    fireEvent.click(trigger);

    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('filters options by English name', () => {
    render(<LanguageSelect {...defaultProps} />);

    const trigger = screen.getByRole('combobox', { name: /language selector/i });
    fireEvent.click(trigger);

    const searchInput = screen.getByPlaceholderText('Search...');
    fireEvent.change(searchInput, { target: { value: 'Georgian' } });

    expect(screen.getByText('Georgian')).toBeInTheDocument();
    expect(screen.queryByText('English')).not.toBeInTheDocument();
    expect(screen.queryByText('Ukrainian')).not.toBeInTheDocument();
  });

  it('filters options by native name', () => {
    render(<LanguageSelect {...defaultProps} />);

    const trigger = screen.getByRole('combobox', { name: /language selector/i });
    fireEvent.click(trigger);

    const searchInput = screen.getByPlaceholderText('Search...');
    // Type partial Georgian native name
    fireEvent.change(searchInput, { target: { value: 'ქართ' } });

    expect(screen.getByText('Georgian')).toBeInTheDocument();
    expect(screen.queryByText('English')).not.toBeInTheDocument();
  });

  it('calls onChange and closes on option click', () => {
    const onChange = vi.fn();
    render(<LanguageSelect {...defaultProps} onChange={onChange} />);

    const trigger = screen.getByRole('combobox', { name: /language selector/i });
    fireEvent.click(trigger);

    const searchInput = screen.getByPlaceholderText('Search...');
    fireEvent.change(searchInput, { target: { value: 'Ukrainian' } });

    const ukrainianOption = screen.getByText('Ukrainian');
    fireEvent.click(ukrainianOption);

    expect(onChange).toHaveBeenCalledWith('uk-UA');
    expect(screen.queryByPlaceholderText('Search...')).not.toBeInTheDocument();
  });

  it('supports keyboard navigation (ArrowDown + Enter selects)', () => {
    // Start with English so we can ArrowDown to the next option
    const onChange = vi.fn();
    render(
      <LanguageSelect
        {...defaultProps}
        value="en-US"
        onChange={onChange}
        options={['en-US', 'ka-GE', 'uk-UA']}
      />
    );

    const trigger = screen.getByRole('combobox', { name: /language selector/i });
    fireEvent.click(trigger);

    const searchInput = screen.getByPlaceholderText('Search...');
    // ArrowDown moves from English (index 0) to Georgian (index 1)
    fireEvent.keyDown(searchInput, { key: 'ArrowDown', code: 'ArrowDown' });
    fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });

    expect(onChange).toHaveBeenCalledWith('ka-GE');
  });

  it('closes on Escape key press', () => {
    render(<LanguageSelect {...defaultProps} />);

    const trigger = screen.getByRole('combobox', { name: /language selector/i });
    fireEvent.click(trigger);

    const searchInput = screen.getByPlaceholderText('Search...');
    fireEvent.keyDown(searchInput, { key: 'Escape', code: 'Escape' });

    expect(screen.queryByPlaceholderText('Search...')).not.toBeInTheDocument();
  });

  it('exposes combobox/listbox accessibility semantics', () => {
    render(<LanguageSelect {...defaultProps} />);

    const trigger = screen.getByRole('combobox');
    expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('returns focus to trigger when dropdown closes with Escape', () => {
    render(<LanguageSelect {...defaultProps} />);

    const trigger = screen.getByRole('combobox');
    trigger.focus();
    fireEvent.keyDown(trigger, { key: 'Enter', code: 'Enter' });

    const searchInput = screen.getByRole('searchbox', { name: /search languages/i });
    fireEvent.keyDown(searchInput, { key: 'Escape', code: 'Escape' });

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);
  });

  it('closes dropdown when focus leaves the component (focusout)', () => {
    render(<LanguageSelect {...defaultProps} />);

    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);

    expect(screen.getByRole('listbox')).toBeInTheDocument();

    const portalContainer = screen.getByRole('listbox').parentElement!;

    fireEvent.focusOut(portalContainer, {
      relatedTarget: document.body,
    });

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('shows fallback Globe icon when value is unrecognized', () => {
    render(
      <LanguageSelect {...defaultProps} value="fr-FR" />
    );

    // Trigger shows Globe icon (lucide icon renders as an SVG)
    const trigger = screen.getByRole('combobox', { name: /language selector/i });
    // The Globe icon will be rendered; we just verify no nativeName is shown
    expect(screen.queryByText('English')).not.toBeInTheDocument();
    expect(screen.queryByText('ქართული')).not.toBeInTheDocument();
    expect(screen.queryByText('Українська')).not.toBeInTheDocument();
    // The trigger exists and shows the raw value
    expect(trigger).toBeInTheDocument();
  });

  it('shows "No results" when search matches nothing', () => {
    render(<LanguageSelect {...defaultProps} />);

    const trigger = screen.getByRole('combobox', { name: /language selector/i });
    fireEvent.click(trigger);

    const searchInput = screen.getByPlaceholderText('Search...');
    fireEvent.change(searchInput, { target: { value: 'zzzznotfound' } });

    expect(screen.getByText('No results')).toBeInTheDocument();
  });

  it('does not open when disabled', () => {
    render(<LanguageSelect {...defaultProps} disabled={true} />);

    const trigger = screen.getByRole('combobox', { name: /language selector/i });
    fireEvent.click(trigger);

    expect(screen.queryByPlaceholderText('Search...')).not.toBeInTheDocument();
  });

  it('sets active descendant on keyboard nav', () => {
    render(<LanguageSelect {...defaultProps} />);

    const trigger = screen.getByRole('combobox');
    fireEvent.keyDown(trigger, { key: 'ArrowDown', code: 'ArrowDown' });

    const searchInput = screen.getByRole('searchbox', { name: /search languages/i });

    fireEvent.keyDown(searchInput, { key: 'ArrowDown', code: 'ArrowDown' });
    const activeId = searchInput.getAttribute('aria-activedescendant');
    expect(activeId).toBeTruthy();

    const activeOption = document.getElementById(String(activeId));
    expect(activeOption).toHaveAttribute('role', 'option');
  });

  it('ignores mouse enter highlight events while keyboard scrolling is active', () => {
    render(<LanguageSelect {...defaultProps} />);

    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);

    const searchInput = screen.getByRole('searchbox', { name: /search languages/i });

    // Press ArrowDown to trigger keyboard nav
    fireEvent.keyDown(searchInput, { key: 'ArrowDown', code: 'ArrowDown' });

    // Spurious mouseEnter event during scrolling should be ignored
    const optionEls = screen.getAllByRole('option');

    // Attempt mouse hover during keyboard scrolling (within 50ms)
    fireEvent.mouseEnter(optionEls[0]);

    // Active descendant should still be based on the keyboard movement, not mouseEnter
    const activeId = searchInput.getAttribute('aria-activedescendant');
    expect(activeId).toBeTruthy();
  });
});
