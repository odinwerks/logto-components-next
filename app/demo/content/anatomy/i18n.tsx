'use client';

import { useDocStyles } from '../../components/useDocStyles';
import CodeBlock from '../../components/SyntaxBlock';
import { slugify } from '../../components/SectionComponents';
import { useThemeMode } from '../../../logto-kit/components/providers/preferences';

export default function AnatomyI18nDoc() {
  const styles = useDocStyles();
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';

  const h2Style: React.CSSProperties = {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: isDark ? '#f3f4f6' : '#111827',
    marginTop: '32px',
    marginBottom: '16px',
    borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`,
    paddingBottom: '8px',
  };

  const customTableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.8rem',
    marginBottom: '20px',
    marginTop: '12px',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`,
  };

  const customThStyle: React.CSSProperties = {
    textAlign: 'left',
    padding: '10px 12px',
    borderBottom: `2px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#cbd5e1'}`,
    background: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc',
    color: isDark ? 'rgba(255,255,255,0.6)' : '#475569',
    fontWeight: 600,
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };

  const customTdStyle: React.CSSProperties = {
    padding: '10px 12px',
    borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9'}`,
    color: isDark ? 'rgba(255,255,255,0.55)' : '#334155',
    verticalAlign: 'top',
    lineHeight: '1.5',
  };

  const customTdPropStyle: React.CSSProperties = {
    ...customTdStyle,
    color: isDark ? '#9cdcdb' : '#0369a1',
    fontFamily: "'IBM Plex Mono', monospace",
    fontWeight: 600,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h2 id={slugify("Static File-Based Localization")} style={{ ...h2Style, marginTop: 0 }}>
        Static File-Based Localization
      </h2>
      <p style={styles.textStyle}>
        The application implements a file-based internationalization (i18n) model. Translation catalogues are statically imported, verified, and bundled at build-time. This eliminates runtime network requests to load translation chunks, enabling instant local resolution.
      </p>
      <p style={styles.textStyle}>
        The active list of user-selectable languages is configured through the environment variable <code>LANG_AVAILABLE</code>. If a locale is defined in this environment parameter but has not been compiled and registered within the codebase, it is filtered out and omitted from display in selection menus.
      </p>

      <CodeBlock
        title="Locale Registration Structure"
        code={`// Locales are statically registered in the locales bundle map:
const locales: Record<LocaleCode, Translations> = {
  'en-US': enUS,
  'ka-GE': kaGE,
};`}
      />

      <h2 id={slugify("Dynamic Key Resolution: Server vs Client")} style={h2Style}>
        Dynamic Key Resolution: Server vs Client
      </h2>
      <p style={styles.textStyle}>
        Translation keys are resolved differently depending on the execution context (Server Component vs Client Component):
      </p>

      <table style={customTableStyle}>
        <thead>
          <tr>
            <th style={customThStyle}>Resolution Environment</th>
            <th style={customThStyle}>Mechanism</th>
            <th style={customThStyle}>Capabilities and Limitations</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={customTdPropStyle}>Server-Side</td>
            <td style={customTdStyle}>
              Uses <code>getTranslations(locale)</code> with <code>getMainLocale()</code>.
            </td>
            <td style={customTdStyle}>
              Resolves the catalogue statically on the server using environment default properties. It cannot read client-side <code>sessionStorage</code> and is unaffected by real-time user selections.
            </td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>Client-Side</td>
            <td style={customTdStyle}>
              Uses <code>useLangMode()</code> and <code>getAllTranslations()</code>.
            </td>
            <td style={customTdStyle}>
              Re-evaluates dynamically as the language state updates. Changes to the language within the active window/tab propagate instantly to other components in the same tab using custom DOM events (note that cross-tab synchronization would require storage synchronization, as standard window events do not cross tab boundaries).
            </td>
          </tr>
        </tbody>
      </table>

      <CodeBlock
        title="Client-Side Translation Hook Pattern"
        code={`import { useMemo } from 'react';
import { useLangMode, getAllTranslations, type Translations } from './logto-kit';

export function useTranslations(): Translations {
  const { lang } = useLangMode();
  const allTranslations = getAllTranslations();

  return useMemo(
    () => allTranslations[lang] ?? allTranslations['en-US'],
    [lang, allTranslations]
  );
}`}
      />

      <CodeBlock
        title="Server-Side Static Catalogue Resolution"
        code={`import { getMainLocale, getTranslations } from './logto-kit/locales';

export default async function ServerInformationBlock() {
  const locale = getMainLocale(); // Reads default configuration from env
  const t = getTranslations(locale);

  return <div>{t.common.loading}</div>;
}`}
      />

      <h2 id={slugify("Adding Locales to the System")} style={h2Style}>
        Adding Locales to the System
      </h2>
      <p style={styles.textStyle}>
        Adding a new locale to the application requires completing four configuration and registration steps:
      </p>

      <p style={styles.textStyle}>
        <strong>Step 1: Create the translation catalog file</strong><br />
        Define a dictionary representing the structure of the <code>Translations</code> type.
      </p>
      <CodeBlock
        title="app/logto-kit/locales/ru-RU.ts"
        code={`import type { Translations } from './index';

export const ruRU: Translations = {
  dashboard: { loading: 'Загрузка...', /* ... */ },
  tabs: { profile: 'Профиль', /* ... */ },
  // Must implement all nested keys of the Translations type
};`}
      />

      <p style={styles.textStyle}>
        <strong>Step 2: Register within the locales package index</strong><br />
        Add the new code to the <code>LocaleCode</code> type union, import the catalog file, and assign it to the export bundle.
      </p>
      <CodeBlock
        title="app/logto-kit/locales/index.ts"
        code={`export type LocaleCode = 'en-US' | 'ka-GE' | 'uk-UA';

import { ukUA } from './uk-UA';

const locales: Record<LocaleCode, Translations> = {
  'en-US': enUS,
  'ka-GE': kaGE,
  'uk-UA': ukUA,
};`}
      />

      <p style={styles.textStyle}>
        <strong>Step 3: Add to available locales registry</strong><br />
        Update the static constant tracking permitted locale identifiers.
      </p>
      <CodeBlock
        title="app/logto-kit/logic/i18n.ts"
        code={`export const AVAILABLE_LOCALES = ['en-US', 'ka-GE', 'uk-UA'] as const;`}
      />

      <p style={styles.textStyle}>
        <strong>Step 4: Update the environment configuration</strong><br />
        Expose the new code to the selection interface by appending it to the environment setup files.
      </p>
      <CodeBlock
        title=".env"
        code={`LANG_AVAILABLE=en-US,ka-GE,uk-UA`}
      />
    </div>
  );
}
