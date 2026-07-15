'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';
import { Search, Globe, Check, ChevronDown } from 'lucide-react';
import type { ThemeColors } from '../../themes';
import type { Translations } from '../../locales';
import { LANGUAGE_META, getLangFlag } from '../../logic/languages';
import type { LocaleCode } from '../../logic/i18n';
import { AVAILABLE_LOCALES } from '../../logic/i18n';

export interface LanguageSelectProps {
  value: string;
  onChange: (code: string) => void;
  options: string[];
  mode: 'dark' | 'light';
  colors: ThemeColors;
  t: Translations;
  disabled?: boolean;
  /** Scale factor for font sizes, padding, and icon sizes. Default 1. */
  scale?: number;
}

export function LanguageSelect({
  value,
  onChange,
  options,
  mode: _mode,
  colors,
  t: _t,
  disabled = false,
  scale = 1,
}: LanguageSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [triggerWidth, setTriggerWidth] = useState<number | null>(null);
  const mountedRef = useRef(false);
  const isKeyboardNavRef = useRef(false);

  const triggerId = useId();
  const listboxId = useId();

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    mountedRef.current = true;
  }, []);

  // Filter options to only valid AVAILABLE_LOCALES that exist in LANGUAGE_META
  const activeLangs = useMemo(() => {
    return options
      .filter((code): code is LocaleCode =>
        (AVAILABLE_LOCALES as readonly string[]).includes(code) && code in LANGUAGE_META
      )
      .map((code) => LANGUAGE_META[code]);
  }, [options]);

  const selectedLang = useMemo(() => {
    return activeLangs.find((l) => l.code === value);
  }, [activeLangs, value]);

  const updateCoords = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
      });
      setTriggerWidth(rect.width);
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

  useEffect(() => {
    const handleFocusOut = (event: FocusEvent) => {
      const relatedTarget = event.relatedTarget as Node | null;
      if (relatedTarget) {
        if (
          (triggerRef.current && triggerRef.current.contains(relatedTarget)) ||
          (dropdownRef.current && dropdownRef.current.contains(relatedTarget))
        ) {
          return;
        }
        // Defer close to allow click event to fire before unmount (defense-in-depth)
        setTimeout(() => closeDropdown(false), 0);
      } else {
        // Fallback for null relatedTarget (e.g. clicking non-focusable elements)
        setTimeout(() => {
          const activeEl = document.activeElement;
          if (
            (triggerRef.current && triggerRef.current.contains(activeEl)) ||
            (dropdownRef.current && dropdownRef.current.contains(activeEl))
          ) {
            return;
          }
          closeDropdown(false);
        }, 0);
      }
    };

    const dropdownEl = dropdownRef.current;
    if (isOpen && dropdownEl) {
      dropdownEl.addEventListener('focusout', handleFocusOut);
    }
    return () => {
      if (dropdownEl) {
        dropdownEl.removeEventListener('focusout', handleFocusOut);
      }
    };
  }, [isOpen, closeDropdown]);

  const filteredLangs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return activeLangs;
    return activeLangs.filter(
      (l) =>
        l.name.toLowerCase().includes(query) ||
        l.nativeName.toLowerCase().includes(query) ||
        l.code.toLowerCase().includes(query)
    );
  }, [activeLangs, searchQuery]);

  useEffect(() => {
    if (!isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- CANNOT_FIX_SAFELY: multi-trigger sync
      setHighlightedIndex(0);
      return;
    }

    const selectedIndex = filteredLangs.findIndex((l) => l.code === value);
    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [filteredLangs, isOpen, value]);

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
    if (!isOpen) {
      updateCoords();
    }
    setIsOpen((prev) => !prev);
  };

  const openDropdown = useCallback(() => {
    if (disabled) return;
    setSearchQuery('');
    updateCoords();
    setIsOpen(true);
  }, [disabled, updateCoords]);

  const selectLang = (lang: (typeof activeLangs)[number]) => {
    onChange(lang.code);
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
      isKeyboardNavRef.current = true;
      setHighlightedIndex((prev) =>
        prev < filteredLangs.length - 1 ? prev + 1 : prev
      );
      setTimeout(() => {
        isKeyboardNavRef.current = false;
      }, 50);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      isKeyboardNavRef.current = true;
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
      setTimeout(() => {
        isKeyboardNavRef.current = false;
      }, 50);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredLangs[highlightedIndex]) {
        selectLang(filteredLangs[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeDropdown(true);
    }
  };

  const activeOption = filteredLangs[highlightedIndex];
  const activeOptionId = activeOption
    ? `lang-option-${activeOption.code}`
    : undefined;

  const triggerStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${0.5625 * scale}rem ${0.75 * scale}rem`,
    background: colors.bgPrimary,
    border: `1px solid ${colors.borderColor}`,
    color: colors.textPrimary,
    fontSize: `${0.8125 * scale}rem`,
    borderRadius: `${0.25 * scale}rem`,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    boxSizing: 'border-box',
    fontFamily: "'DM Sans', system-ui, sans-serif",
    width: '100%',
  };

  const dropdownStyle: React.CSSProperties = {
    position: 'absolute',
    top: `${coords.top}px`,
    left: `${coords.left}px`,
    width: triggerWidth ? `${triggerWidth}px` : `${16 * scale}rem`,
    maxHeight: `${15 * scale}rem`,
    overflow: 'hidden',
    background: colors.bgSecondary,
    border: `1px solid ${colors.borderColor}`,
    borderRadius: `${0.25 * scale}rem`,
    boxShadow: _mode === 'dark' ? '0 4px 12px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.15)',
    zIndex: 2100,
    display: 'flex',
    flexDirection: 'column',
  };

  const searchContainerStyle: React.CSSProperties = {
    position: 'relative',
    padding: `${0.5 * scale}rem`,
    borderBottom: `1px solid ${colors.borderColor}`,
    display: 'flex',
    alignItems: 'center',
    background: colors.bgSecondary,
  };

  const searchInputStyle: React.CSSProperties = {
    width: '100%',
    padding: `${0.375 * scale}rem ${0.5 * scale}rem ${0.375 * scale}rem ${1.75 * scale}rem`,
    background: colors.bgPrimary,
    border: `1px solid ${colors.borderColor}`,
    color: colors.textPrimary,
    fontSize: `${0.8125 * scale}rem`,
    fontFamily: "'DM Sans', system-ui, sans-serif",
    borderRadius: `${0.25 * scale}rem`,
    boxSizing: 'border-box',
  };

  const listStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: `${0.25 * scale}rem 0`,
    margin: 0,
    listStyle: 'none',
  };

  const itemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${0.5 * scale}rem ${0.75 * scale}rem`,
    cursor: 'pointer',
    fontSize: `${0.8125 * scale}rem`,
    fontFamily: "'DM Sans', system-ui, sans-serif",
    color: colors.textPrimary,
    gap: `${0.5 * scale}rem`,
  };

  const flag = selectedLang ? getLangFlag(selectedLang.code) : null;

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
        aria-label="Language selector"
        aria-haspopup="listbox"
        aria-controls={isOpen ? listboxId : undefined}
        aria-expanded={isOpen}
        aria-activedescendant={isOpen ? activeOptionId : undefined}
        style={triggerStyle}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: `${0.25 * scale}rem` }}>
          {selectedLang ? (
            <>
              <span>{flag}</span>
              <span>{selectedLang.nativeName}</span>
            </>
          ) : (
            <>
              <Globe size={Math.round(14 * scale)} style={{ color: colors.textTertiary, flexShrink: 0 }} />
              <span>{value || ''}</span>
            </>
          )}
        </span>
        <ChevronDown size={Math.round(14 * scale)} style={{ opacity: 0.7, flexShrink: 0 }} />
      </button>

      {isOpen &&
        // eslint-disable-next-line react-hooks/refs -- Portal gate: one-way hydration guard
        mountedRef.current &&
        typeof document !== 'undefined' &&
        createPortal(
          <div ref={dropdownRef} style={dropdownStyle}>
            <div style={searchContainerStyle}>
              <Search
                size={Math.round(14 * scale)}
                style={{
                  position: 'absolute',
                  left: `${0.875 * scale}rem`,
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
                aria-label="Search languages"
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
              {filteredLangs.map((lang, index) => {
                const isSelected = selectedLang?.code === lang.code;
                const isHighlighted = index === highlightedIndex;
                const optionId = `lang-option-${lang.code}`;

                return (
                  <li
                    key={lang.code}
                    id={optionId}
                    role="option"
                    tabIndex={-1}
                    aria-selected={isSelected}
                    onClick={() => selectLang(lang)}
                    onMouseEnter={() => {
                      if (!isKeyboardNavRef.current) {
                        setHighlightedIndex(index);
                      }
                    }}
                    style={{
                      ...itemStyle,
                      background: isHighlighted ? colors.bgTertiary : 'transparent',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: `${0.5 * scale}rem`, overflow: 'hidden' }}>
                      <span style={{ flexShrink: 0 }}>{getLangFlag(lang.code)}</span>
                      <span
                        style={{
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {lang.name}
                      </span>
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: `${0.25 * scale}rem`, flexShrink: 0 }}>
                      <span style={{ color: colors.textSecondary }}>{lang.nativeName}</span>
                      {isSelected && <Check size={Math.round(14 * scale)} style={{ color: colors.accentGreen }} />}
                    </span>
                  </li>
                );
              })}
              {filteredLangs.length === 0 && (
                <li
                  role="option"
                  tabIndex={-1}
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
