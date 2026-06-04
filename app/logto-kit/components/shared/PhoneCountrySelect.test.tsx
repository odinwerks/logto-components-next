import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { PhoneCountrySelect } from './PhoneCountrySelect';
import { DARK_COLORS } from '../../themes';
import { enUS } from '../../locales/en-US';

describe('PhoneCountrySelect', () => {
  const defaultProps = {
    value: '995', // Georgia
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
    
    // Georgia flag is 🇬🇪, code is +995
    expect(screen.getByText('🇬🇪')).toBeInTheDocument();
    expect(screen.getByText('+995')).toBeInTheDocument();
  });

  it('opens dropdown portal on click', () => {
    render(<PhoneCountrySelect {...defaultProps} />);
    
    // Dropdown should not be in document initially
    expect(screen.queryByPlaceholderText('Search...')).not.toBeInTheDocument();

    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);

    // After clicking, search input should be present
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('filters countries on search query', () => {
    render(<PhoneCountrySelect {...defaultProps} />);
    
    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);

    const searchInput = screen.getByPlaceholderText('Search...');
    
    // Type "Ukraine"
    fireEvent.change(searchInput, { target: { value: 'Ukraine' } });

    // Ukraine should be in document, Georgia should not be matched
    expect(screen.getByText('Ukraine')).toBeInTheDocument();
    expect(screen.queryByText('Georgia')).not.toBeInTheDocument();
  });

  it('calls onChange and closes on country click', () => {
    const onChange = vi.fn();
    render(<PhoneCountrySelect {...defaultProps} onChange={onChange} />);

    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);

    // Click on Ukraine (+380)
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

    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);

    const searchInput = screen.getByPlaceholderText('Search...');
    fireEvent.change(searchInput, { target: { value: 'Ukraine' } });

    // Highlight is at 0 (Ukraine), hit Enter
    fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });

    expect(onChange).toHaveBeenCalledWith('380');
  });

  it('closes on Escape key press', () => {
    render(<PhoneCountrySelect {...defaultProps} />);

    const trigger = screen.getByRole('button');
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

    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);

    // Georgia (+995) and Ukraine (+380) should be available
    expect(screen.getByText('Georgia')).toBeInTheDocument();
    expect(screen.getByText('Ukraine')).toBeInTheDocument();

    // Germany (+49) should NOT be available
    expect(screen.queryByText('Germany')).not.toBeInTheDocument();
  });

  it('supports countryFilter block list', () => {
    render(
      <PhoneCountrySelect
        {...defaultProps}
        countryFilter={{
          mode: 'block',
          codes: ['49'], // Block Germany
        }}
      />
    );

    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);

    // Georgia (+995) should be available
    expect(screen.getByText('Georgia')).toBeInTheDocument();

    // Germany (+49) should NOT be available
    expect(screen.queryByText('Germany')).not.toBeInTheDocument();
  });
});
