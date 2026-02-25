'use client';

import type { UserData } from '../../../logic/types';
import type { ThemeColors } from '../../../themes';
import type { Translations } from '../../../locales';
import { CodeBlock } from '../shared/CodeBlock';

interface RawDataTabProps {
  userData: UserData;
  themeColors: ThemeColors;
  t: Translations;
}

export function RawDataTab({ userData, themeColors, t }: RawDataTabProps) {
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
        <h3
          style={{
            margin: '0 0 12px 0',
            color: themeColors.textPrimary,
            fontSize: '12px',
            fontWeight: 600,
            fontFamily: 'var(--font-ibm-plex-mono)',
          }}
        >
          {t.raw.rawUserData}
        </h3>
        <CodeBlock title={t.raw.dataTitle} data={userData} themeColors={themeColors} maxHeight="600px" t={t} />
      </div>
    </div>
  );
}
