import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PhoneCountrySelect } from './PhoneCountrySelect';
import { DARK_COLORS } from '../../themes';
import { enUS } from '../../locales/en-US';

describe('PhoneCountrySelect', () => {
  const defaultProps = {
    value: '995',
    onChange: vi.fn(),
    mode: 'dark' as const,
    colors: DARK_COLORS,
    t: enUS,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders trigger with selected country flag and code', () => {
    render(<PhoneCountrySelect {...defaultProps} />);

    expect(screen.getByText('🇬🇪')).toBeInTheDocument();
    expect(screen.getByText('+995')).toBeInTheDocument();
  });

  it('opens dropdown portal on click', () => {
    render(<PhoneCountrySelect {...defaultProps} />);

    expect(screen.queryByPlaceholderText('Search...')).not.toBeInTheDocument();

    const trigger = screen.getByRole('combobox', { name: /country calling code/i });
    fireEvent.click(trigger);

    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('filters countries on search query', () => {
    render(<PhoneCountrySelect {...defaultProps} />);

    const trigger = screen.getByRole('combobox', { name: /country calling code/i });
    fireEvent.click(trigger);

    const searchInput = screen.getByPlaceholderText('Search...');
    fireEvent.change(searchInput, { target: { value: 'Ukraine' } });

    expect(screen.getByText('Ukraine')).toBeInTheDocument();
    expect(screen.queryByText('Georgia')).not.toBeInTheDocument();
  });

  it('calls onChange and closes on country click', () => {
    const onChange = vi.fn();
    render(<PhoneCountrySelect {...defaultProps} onChange={onChange} />);

    const trigger = screen.getByRole('combobox', { name: /country calling code/i });
    fireEvent.click(trigger);

    const searchInput = screen.getByPlaceholderText('Search...');
    fireEvent.change(searchInput, { target: { value: 'Ukraine' } });

    const ukraineOption = screen.getByText('Ukraine');
    fireEvent.click(ukraineOption);

    expect(onChange).toHaveBeenCalledWith('380');
    expect(screen.queryByPlaceholderText('Search...')).not.toBeInTheDocument();
  });

  it('supports keyboard navigation', () => {
    const onChange = vi.fn();
    render(<PhoneCountrySelect {...defaultProps} onChange={onChange} />);

    const trigger = screen.getByRole('combobox', { name: /country calling code/i });
    fireEvent.click(trigger);

    const searchInput = screen.getByPlaceholderText('Search...');
    fireEvent.change(searchInput, { target: { value: 'Ukraine' } });
    fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });

    expect(onChange).toHaveBeenCalledWith('380');
  });

  it('closes on Escape key press', () => {
    render(<PhoneCountrySelect {...defaultProps} />);

    const trigger = screen.getByRole('combobox', { name: /country calling code/i });
    fireEvent.click(trigger);

    const searchInput = screen.getByPlaceholderText('Search...');
    fireEvent.keyDown(searchInput, { key: 'Escape', code: 'Escape' });

    expect(screen.queryByPlaceholderText('Search...')).not.toBeInTheDocument();
  });

  it('supports countryFilter allow list', () => {
    render(
      <PhoneCountrySelect
        {...defaultProps}
        countryFilter={{
          mode: 'allow',
          codes: ['995', '380'],
        }}
      />
    );

    const trigger = screen.getByRole('combobox', { name: /country calling code/i });
    fireEvent.click(trigger);

    expect(screen.getByText('Georgia')).toBeInTheDocument();
    expect(screen.getByText('Ukraine')).toBeInTheDocument();
    expect(screen.queryByText('Germany')).not.toBeInTheDocument();
  });

  it('supports countryFilter block list', () => {
    render(
      <PhoneCountrySelect
        {...defaultProps}
        countryFilter={{
          mode: 'block',
          codes: ['49'],
        }}
      />
    );

    const trigger = screen.getByRole('combobox', { name: /country calling code/i });
    fireEvent.click(trigger);

    expect(screen.getByText('Georgia')).toBeInTheDocument();
    expect(screen.queryByText('Germany')).not.toBeInTheDocument();
  });

  it('exposes combobox/listbox accessibility semantics', () => {
    render(<PhoneCountrySelect {...defaultProps} />);

    const trigger = screen.getByRole('combobox');
    expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('supports trigger keyboard open and sets active descendant', () => {
    render(<PhoneCountrySelect {...defaultProps} />);

    const trigger = screen.getByRole('combobox');
    fireEvent.keyDown(trigger, { key: 'ArrowDown', code: 'ArrowDown' });

    const searchInput = screen.getByRole('searchbox', { name: /search countries/i });

    fireEvent.keyDown(searchInput, { key: 'ArrowDown', code: 'ArrowDown' });
    const activeId = searchInput.getAttribute('aria-activedescendant');
    expect(activeId).toBeTruthy();

    const activeOption = document.getElementById(String(activeId));
    expect(activeOption).toHaveAttribute('role', 'option');
  });

  it('returns focus to trigger when dropdown closes with Escape', () => {
    render(<PhoneCountrySelect {...defaultProps} />);

    const trigger = screen.getByRole('combobox');
    trigger.focus();
    fireEvent.keyDown(trigger, { key: 'Enter', code: 'Enter' });

    const searchInput = screen.getByRole('searchbox', { name: /search countries/i });
    fireEvent.keyDown(searchInput, { key: 'Escape', code: 'Escape' });

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);
  });
});
