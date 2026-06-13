'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';
import { Search, Globe, Check, ChevronDown } from 'lucide-react';
import type { ThemeColors } from '../../themes';
import type { Translations } from '../../locales';
import { COUNTRY_CODES, getFlagEmoji } from '../../logic/country-codes';
import { isCountryAllowed } from '../../logic/country-list-filter';

export interface PhoneCountrySelectProps {
  value: string;
  onChange: (code: string) => void;
  countryFilter?: {
    mode: 'allow' | 'block' | 'none';
    codes: string[];
  };
  mode: 'dark' | 'light';
  colors: ThemeColors;
  t: Translations;
  disabled?: boolean;
}

export function PhoneCountrySelect({
  value,
  onChange,
  countryFilter,
  mode: _mode,
  colors,
  t: _t,
  disabled = false,
}: PhoneCountrySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const mountedRef = useRef(false);

  const triggerId = useId();
  const listboxId = useId();

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    mountedRef.current = true;
  }, []);

  const activeCountries = useMemo(() => {
    const filter = countryFilter ?? { mode: 'none' as const, codes: [] };
    const filtered = COUNTRY_CODES.filter((c) => isCountryAllowed(c.code, filter));
    return filtered.length > 0 ? filtered : [...COUNTRY_CODES];
  }, [countryFilter]);

  const selectedCountry = useMemo(() => {
    return activeCountries.find((c) => c.code === value);
  }, [activeCountries, value]);

  const updateCoords = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
      });
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener('resize', updateCoords);
      window.addEventListener('scroll', updateCoords, { passive: true });
    }
    return () => {
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords);
    };
  }, [isOpen, updateCoords]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const closeDropdown = useCallback((restoreTriggerFocus = false) => {
    setIsOpen(false);
    if (restoreTriggerFocus) {
      setTimeout(() => triggerRef.current?.focus(), 0);
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        closeDropdown(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, closeDropdown]);

  const filteredCountries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return activeCountries;
    return activeCountries.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.iso.toLowerCase().includes(query) ||
        c.code.includes(query)
    );
  }, [activeCountries, searchQuery]);

  useEffect(() => {
    if (!isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- CANNOT_FIX_SAFELY: multi-trigger sync for highlightedIndex (open/close, search, selection)
      setHighlightedIndex(0);
      return;
    }

    const selectedIndex = filteredCountries.findIndex((country) => country.code === value);
    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [filteredCountries, isOpen, value]);

  useEffect(() => {
    if (listRef.current) {
      const highlightedEl = listRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedEl && typeof highlightedEl.scrollIntoView === 'function') {
        highlightedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  const handleToggle = () => {
    if (disabled) return;
    setSearchQuery('');
    setIsOpen((prev) => !prev);
  };

  const openDropdown = useCallback(() => {
    if (disabled) return;
    setSearchQuery('');
    setIsOpen(true);
  }, [disabled]);

  const selectCountry = (country: typeof COUNTRY_CODES[number]) => {
    onChange(country.code);
    closeDropdown(true);
  };

  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openDropdown();
      return;
    }

    if (e.key === 'Escape' && isOpen) {
      e.preventDefault();
      closeDropdown(true);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredCountries.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCountries[highlightedIndex]) {
        selectCountry(filteredCountries[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeDropdown(true);
    }
  };

  const activeOption = filteredCountries[highlightedIndex];
  const activeOptionId = activeOption
    ? `phone-country-option-${activeOption.iso}-${activeOption.code}`
    : undefined;

  const triggerStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.5625rem 0.75rem',
    background: colors.bgPrimary,
    border: `1px solid ${colors.borderColor}`,
    color: colors.textPrimary,
    fontSize: '0.8125rem',
    borderRadius: '0.25rem',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    boxSizing: 'border-box',
    fontFamily: "'DM Sans', system-ui, sans-serif",
    height: '100%',
    outline: 'none',
    gap: '0.25rem',
    width: '6.5rem',
  };

  const dropdownStyle: React.CSSProperties = {
    position: 'absolute',
    top: `${coords.top}px`,
    left: `${coords.left}px`,
    width: '16rem',
    maxHeight: '15rem',
    overflow: 'hidden',
    background: colors.bgSecondary,
    border: `1px solid ${colors.borderColor}`,
    borderRadius: '0.25rem',
    boxShadow: _mode === 'dark' ? '0 4px 12px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.15)',
    zIndex: 2100,
    display: 'flex',
    flexDirection: 'column',
  };

  const searchContainerStyle: React.CSSProperties = {
    position: 'relative',
    padding: '0.5rem',
    borderBottom: `1px solid ${colors.borderColor}`,
    display: 'flex',
    alignItems: 'center',
    background: colors.bgSecondary,
  };

  const searchInputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.375rem 0.5rem 0.375rem 1.75rem',
    background: colors.bgPrimary,
    border: `1px solid ${colors.borderColor}`,
    color: colors.textPrimary,
    fontSize: '0.8125rem',
    fontFamily: "'DM Sans', system-ui, sans-serif",
    borderRadius: '0.25rem',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const listStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: '0.25rem 0',
    margin: 0,
    listStyle: 'none',
  };

  const itemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.5rem 0.75rem',
    cursor: 'pointer',
    fontSize: '0.8125rem',
    fontFamily: "'DM Sans', system-ui, sans-serif",
    color: colors.textPrimary,
    gap: '0.5rem',
  };

  const flag = selectedCountry ? getFlagEmoji(selectedCountry.iso) : '🌐';
  const displayValue = value ? `+${value}` : '+';

  return (
    <>
      <button
        type="button"
        id={triggerId}
        ref={triggerRef}
        disabled={disabled}
        onClick={handleToggle}
        onKeyDown={handleTriggerKeyDown}
        role="combobox"
        aria-label="Country calling code"
        aria-haspopup="listbox"
        aria-controls={isOpen ? listboxId : undefined}
        aria-expanded={isOpen}
        aria-activedescendant={isOpen ? activeOptionId : undefined}
        style={triggerStyle}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          {selectedCountry ? (
            <>
              <span>{flag}</span>
              <span>{displayValue}</span>
            </>
          ) : (
            <>
              <Globe size={14} style={{ color: colors.textTertiary, flexShrink: 0 }} />
              <span>{displayValue}</span>
            </>
          )}
        </span>
        <ChevronDown size={14} style={{ opacity: 0.7, flexShrink: 0 }} />
      </button>

      {isOpen &&
        // eslint-disable-next-line react-hooks/refs -- Portal gate: one-way hydration guard, never reverts, no reactive dependency
        mountedRef.current &&
        typeof document !== 'undefined' &&
        createPortal(
          <div ref={dropdownRef} style={dropdownStyle}>
            <div style={searchContainerStyle}>
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: '0.875rem',
                  color: colors.textTertiary,
                  pointerEvents: 'none',
                }}
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                style={searchInputStyle}
                onKeyDown={handleSearchKeyDown}
                role="searchbox"
                aria-label="Search countries"
                aria-autocomplete="list"
                aria-controls={listboxId}
                aria-activedescendant={activeOptionId}
              />
            </div>
            <ul
              ref={listRef}
              id={listboxId}
              role="listbox"
              aria-labelledby={triggerId}
              style={listStyle}
            >
              {filteredCountries.map((country, index) => {
                const isSelected = selectedCountry?.iso === country.iso;
                const isHighlighted = index === highlightedIndex;
                const optionId = `phone-country-option-${country.iso}-${country.code}`;

                return (
                  <li
                    key={`${country.iso}-${country.code}`}
                    id={optionId}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => selectCountry(country)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    style={{
                      ...itemStyle,
                      background: isHighlighted ? colors.bgTertiary : 'transparent',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                      <span style={{ flexShrink: 0 }}>{getFlagEmoji(country.iso)}</span>
                      <span
                        style={{
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {country.name}
                      </span>
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
                      <span style={{ color: colors.textSecondary }}>+{country.code}</span>
                      {isSelected && <Check size={14} style={{ color: colors.accentGreen }} />}
                    </span>
                  </li>
                );
              })}
              {filteredCountries.length === 0 && (
                <li
                  role="option"
                  aria-disabled="true"
                  aria-selected="false"
                  style={{
                    ...itemStyle,
                    color: colors.textTertiary,
                    cursor: 'default',
                    justifyContent: 'center',
                  }}
                >
                  No results
                </li>
              )}
            </ul>
          </div>,
          document.body
        )}
    </>
  );
}
