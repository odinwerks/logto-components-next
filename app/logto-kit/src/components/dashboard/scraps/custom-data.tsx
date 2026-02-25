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
}

export function CustomDataTab({
  userData,
  themeColors,
  t,
  onUpdateCustomData,
  onSuccess,
  onError,
  refreshData,
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
