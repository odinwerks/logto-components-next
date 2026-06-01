'use client';

import { useDocStyles } from '../../components/useDocStyles';
import CodeBlock from '../../components/SyntaxBlock';
import { SectionWrap } from '../../components/SectionComponents';

export default function AnatomyI18nDoc() {
  const styles = useDocStyles();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <SectionWrap label="Static File-Based Localization">
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
      </SectionWrap>

      <SectionWrap label="Dynamic Key Resolution: Server vs Client">
        <p style={styles.textStyle}>
          Translation keys are resolved differently depending on the execution context (Server Component vs Client Component):
        </p>

        <table style={styles.tableStyle}>
          <thead>
            <tr>
              <th style={styles.thStyle}>Resolution Environment</th>
              <th style={styles.thStyle}>Mechanism</th>
              <th style={styles.thStyle}>Capabilities and Limitations</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.tdPropStyle}>Server-Side</td>
              <td style={styles.tdStyle}>
                Uses <code>getTranslations(locale)</code> with <code>getMainLocale()</code>.
              </td>
              <td style={styles.tdStyle}>
                Resolves the catalogue statically on the server using environment default properties. It cannot read client-side <code>sessionStorage</code> and is unaffected by real-time user selections.
              </td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>Client-Side</td>
              <td style={styles.tdStyle}>
                Uses <code>useLangMode()</code> and <code>getAllTranslations()</code>.
              </td>
              <td style={styles.tdStyle}>
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
      </SectionWrap>

      <SectionWrap label="Adding Locales to the System">
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
      </SectionWrap>
    </div>
  );
}
