'use client';

import { useState } from 'react';
import type { UserData } from '../../../logic/types';
import type { ThemeColors } from '../../../themes';
import type { Translations } from '../../../locales';
import { CodeBlock } from '../shared/CodeBlock';

interface CustomDataTabProps {
  userData: UserData;
  themeColors: ThemeColors;
  t: Translations;
  onUpdateCustomData: (customData: Record<string, unknown>) => Promise<void>;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  refreshData: () => void;
  theme?: 'dark' | 'light';
  lang?: string;
  supportedLangs?: string[];
  onThemeChange?: (theme: 'dark' | 'light') => void;
  onLangChange?: (lang: string) => void;
}

export function CustomDataTab({
  userData,
  themeColors,
  t,
  onUpdateCustomData,
  onSuccess,
  onError,
  refreshData,
  theme,
  lang,
  supportedLangs,
  onThemeChange,
  onLangChange,
}: CustomDataTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(JSON.stringify(userData.customData || {}, null, 2));
  const [isLoading, setIsLoading] = useState(false);
  const [parseError, setParseError] = useState('');

  const handleEdit = () => {
    setEditValue(JSON.stringify(userData.customData || {}, null, 2));
    setIsEditing(true);
    setParseError('');
  };

  const handleCancel = () => {
    setEditValue(JSON.stringify(userData.customData || {}, null, 2));
    setIsEditing(false);
    setParseError('');
  };

  const handleSave = async () => {
    try {
      const parsed = JSON.parse(editValue);

      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        setParseError(t.customData.mustBeObject);
        return;
      }

      setIsLoading(true);
      await onUpdateCustomData(parsed);
      onSuccess(t.customData.success);
      setIsEditing(false);
      setParseError('');
      refreshData();
    } catch (error) {
      if (error instanceof SyntaxError) {
        setParseError(`${t.customData.invalidJson}: ${error.message}`);
      } else {
        onError(error instanceof Error ? error.message : t.customData.error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {/* Theme & Language Settings */}
      {(onThemeChange || onLangChange) && (
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              fontFamily: 'var(--font-ibm-plex-mono)',
              fontWeight: 600,
              fontSize: 10.5,
              color: themeColors.textTertiary,
              textTransform: 'uppercase',
              letterSpacing: '0.09em',
              marginBottom: 12,
            }}
          >
            Appearance
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
            {[
              { id: 'light', label: 'Light' },
              { id: 'dark', label: 'Dark' },
              { id: 'system', label: 'System' },
            ].map((opt) => {
              const isSelected = (opt.id === 'system' ? theme : opt.id) === theme;
              return (
                <button
                  key={opt.id}
                  onClick={() => onThemeChange?.(opt.id === 'system' ? (theme === 'light' ? 'dark' : 'light') : opt.id as 'dark' | 'light')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '9px 12px',
                    cursor: 'pointer',
                    background: isSelected ? themeColors.bgTertiary : themeColors.bgSecondary,
                    border: `1px solid ${themeColors.borderColor}`,
                    transition: 'background 0.15s',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-ibm-plex-mono)',
                      fontWeight: 500,
                      fontSize: 12,
                      color: isSelected ? themeColors.textPrimary : themeColors.textSecondary,
                    }}
                  >
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>

          {onLangChange && supportedLangs && supportedLangs.length > 0 && (
            <>
              <div
                style={{
                  fontFamily: 'var(--font-ibm-plex-mono)',
                  fontWeight: 600,
                  fontSize: 10.5,
                  color: themeColors.textTertiary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.09em',
                  marginBottom: 12,
                }}
              >
                Language
              </div>
              <div style={{ position: 'relative' }}>
                <select
                  value={lang}
                  onChange={(e) => onLangChange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 36px 9px 12px',
                    background: themeColors.bgPage,
                    border: `1px solid ${themeColors.borderColor}`,
                    color: themeColors.textPrimary,
                    fontFamily: 'var(--font-ibm-plex-mono)',
                    fontSize: 13,
                    outline: 'none',
                    cursor: 'pointer',
                    appearance: 'none',
                  }}
                >
                  {supportedLangs.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
                <span
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%) rotate(90deg)',
                    color: themeColors.textTertiary,
                    pointerEvents: 'none',
                    fontSize: 10,
                  }}
                >
                  ▶
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Custom Data Section */}
      <div
        style={{
          background: themeColors.bgSecondary,
          border: `1px solid ${themeColors.borderColor}`,
          borderRadius: '6px',
          padding: '16px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
          }}
        >
          <h3
            style={{
              margin: 0,
              color: themeColors.textPrimary,
              fontSize: '12px',
              fontWeight: 600,
              fontFamily: 'var(--font-ibm-plex-mono)',
            }}
          >
            {t.customData.title}
          </h3>
          {!isEditing && (
            <button
              onClick={handleEdit}
              style={{
                padding: '6px 12px',
                background: themeColors.bgTertiary,
                color: themeColors.textPrimary,
                border: `1px solid ${themeColors.borderColor}`,
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '10px',
                fontFamily: 'var(--font-ibm-plex-mono)',
              }}
            >
              {t.customData.editCustomData}
            </button>
          )}
        </div>

        <p
          style={{
            color: themeColors.textTertiary,
            fontSize: '10px',
            marginBottom: '12px',
            fontFamily: 'var(--font-ibm-plex-mono)',
          }}
        >
          {t.customData.description}
        </p>

        {isEditing ? (
          <div>
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              disabled={isLoading}
              spellCheck={false}
              style={{
                width: '100%',
                minHeight: '300px',
                padding: '12px',
                background: themeColors.bgPrimary,
                border: `1px solid ${parseError ? themeColors.accentRed : themeColors.borderColor}`,
                borderRadius: '4px',
                color: themeColors.textPrimary,
                fontSize: '11px',
                fontFamily: 'var(--font-ibm-plex-mono)',
                lineHeight: '1.5',
                resize: 'vertical',
                marginBottom: '8px',
              }}
            />

            {parseError && (
              <div
                style={{
                  color: themeColors.accentRed,
                  fontSize: '10px',
                  marginBottom: '12px',
                  fontFamily: 'var(--font-ibm-plex-mono)',
                  padding: '8px',
                  background: `${themeColors.accentRed}15`,
                  borderRadius: '4px',
                }}
              >
                {parseError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleSave}
                disabled={isLoading}
                style={{
                  padding: '8px 16px',
                  background: '#059669',
                  color: '#fff',
                  border: '1px solid #059669',
                  borderRadius: '4px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontSize: '11px',
                  fontFamily: 'var(--font-ibm-plex-mono)',
                  opacity: isLoading ? 0.6 : 1,
                }}
              >
                {isLoading ? t.common.loading : t.customData.save}
              </button>
              <button
                onClick={handleCancel}
                disabled={isLoading}
                style={{
                  padding: '8px 16px',
                  background: themeColors.bgTertiary,
                  color: themeColors.textPrimary,
                  border: `1px solid ${themeColors.borderColor}`,
                  borderRadius: '4px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontSize: '11px',
                  fontFamily: 'var(--font-ibm-plex-mono)',
                }}
              >
                {t.profile.cancel}
              </button>
            </div>
          </div>
        ) : (
          <CodeBlock
            title={t.customData.jsonData}
            data={userData.customData}
            themeColors={themeColors}
            maxHeight="400px"
            t={t}
          />
        )}
      </div>
    </div>
  );
}
