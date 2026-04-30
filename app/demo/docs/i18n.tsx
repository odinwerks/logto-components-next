'use client';

import CodeBlock from '../utils/CodeBlock';
import { SectionContainer, Section } from '../utils/Section';
import { useDocStyles } from '../utils/useDocStyles';
import { SectionHeader, SectionWrap } from '../utils/SectionComponents';

// ═══════════════════════════════════════════════════════════════════════════════
// Page 1: Overview + ENV + Pipeline
// ═══════════════════════════════════════════════════════════════════════════════

function OverviewSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Overview">
      <p style={styles.textStyle}>
        File-based i18n system. All locales are statically imported and bundled.{' '}
        <code style={styles.codeStyle}>LANG_AVAILABLE</code> controls which languages appear
        in the Preferences tab dropdown — it does NOT dynamically import files.
      </p>
      <table style={styles.tableStyle}>
        <thead>
          <tr>
            <th style={styles.thStyle}>Export</th>
            <th style={styles.thStyle}>Type</th>
            <th style={styles.thStyle}>Purpose</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tdPathStyle}>useLangMode</td>
            <td style={styles.tdStyle}>Hook</td>
            <td style={styles.tdStyle}>{`{ lang, setLang }`}</td>
          </tr>
          <tr>
            <td style={styles.tdPathStyle}>getAllTranslations</td>
            <td style={styles.tdStyle}>Function</td>
            <td style={styles.tdStyle}>{`Record<string, Translations>`}</td>
          </tr>
          <tr>
            <td style={styles.tdPathStyle}>getTranslations</td>
            <td style={styles.tdStyle}>Function</td>
            <td style={styles.tdStyle}>{`Translations`}</td>
          </tr>
          <tr>
            <td style={styles.tdPathStyle}>getSupportedLangs</td>
            <td style={styles.tdStyle}>Function</td>
            <td style={styles.tdStyle}>{`string[]`}</td>
          </tr>
          <tr>
            <td style={styles.tdPathStyle}>Translations</td>
            <td style={styles.tdStyle}>Type</td>
            <td style={styles.tdStyle}>Full translation object</td>
          </tr>
        </tbody>
      </table>
      <CodeBlock title="Import" code={`import {
  useLangMode,
  getAllTranslations,
  getSupportedLangs,
  type Translations,
} from './logto-kit';`} />
    </SectionWrap>
  );
}

function PipelineSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="How it works">
      <p style={styles.textStyle}>
        Server Component provides translations, Client Component re-renders
        on language change — no server round-trip needed.
      </p>
      <CodeBlock title="Server Component pipeline" code={`// Dashboard (Server Component)
const locale = getMainLocale();           // ENV default
const translations = getTranslations(locale);  // server-side T
const allTranslations = getAllTranslations();   // Record<string, Translations>
const supportedLangs = getSupportedLangs();    // from LANG_AVAILABLE env

// Passes to DashboardClient:
<DashboardClient
  translations={translations}
  allTranslations={allTranslations}
  supportedLangs={supportedLangs}
  ...`} />
      <CodeBlock title="Client Component pipeline" code={`// DashboardClient
const { lang } = useLangMode();  // reads sessionStorage + context
const t = useMemo<Translations>(
  () => allTranslations[lang] ?? serverTranslations,
  [lang, allTranslations, serverTranslations]
);

// When lang changes:
// 1. sessionStorage update
// 2. React state update
// 3. Logto custom_data (async)
// 4. preferences-changed event
// 5. useLangMode() picks up new lang
// 6. useMemo creates new t — CLIENT-SIDE re-render`} />
    </SectionWrap>
  );
}

function EnvSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="ENV variables">
      <table style={styles.tableStyle}>
        <thead>
          <tr>
            <th style={styles.thStyle}>Variable</th>
            <th style={styles.thStyle}>Default</th>
            <th style={styles.thStyle}>Purpose</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tdPathStyle}>LANG_MAIN</td>
            <td style={styles.tdStyle}><code style={styles.codeStyle}>en-US</code></td>
            <td style={styles.tdStyle}>Default language</td>
          </tr>
          <tr>
            <td style={styles.tdPathStyle}>LANG_AVAILABLE</td>
            <td style={styles.tdStyle}><code style={styles.codeStyle}>en-US</code></td>
            <td style={styles.tdStyle}>UI filter — which languages appear in selector</td>
          </tr>
        </tbody>
      </table>
      <CodeBlock title=".env" code={`LANG_MAIN=en-US
LANG_AVAILABLE=en-US,ka-GE`} />
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>How filtering works:</strong>{' '}
        <code style={styles.codeSmStyle}>getSupportedLangs()</code> parses the env, then filters
        to only codes that exist in <code style={styles.codeSmStyle}>AVAILABLE_LOCALES</code>.
        If <code style={styles.codeSmStyle}>ru-RU</code> is in env but not in the codebase, it's
        silently dropped.
      </div>
    </SectionWrap>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page 2: Custom Components
// ═══════════════════════════════════════════════════════════════════════════════

function PatternDirectSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Pattern 1: Direct imports">
      <p style={styles.textStyle}>
        Import <code style={styles.codeStyle}>useLangMode</code> +{' '}
        <code style={styles.codeStyle}>getAllTranslations</code> and look up{' '}
        <code style={styles.codeStyle}>t</code> from the map. Re-renders on language change.
      </p>
      <CodeBlock title="Client component" code={`import { useLangMode, getAllTranslations } from './logto-kit';

function MyComponent() {
  const { lang } = useLangMode();
  const allTranslations = getAllTranslations();
  const t = allTranslations[lang] ?? allTranslations['en-US'];

  return <div>{t.common.loading}</div>;
}`} />
    </SectionWrap>
  );
}

function PatternHookSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Pattern 2: Custom hook">
      <p style={styles.textStyle}>
        Wrap the lookup in a <code style={styles.codeStyle}>useTranslations</code> hook
        for cleaner usage across components.
      </p>
      <CodeBlock title="useTranslations hook" code={`import { useMemo } from 'react';
import { useLangMode, getAllTranslations, type Translations } from './logto-kit';

export function useTranslations(): Translations {
  const { lang } = useLangMode();
  const allTranslations = getAllTranslations();

  return useMemo(
    () => allTranslations[lang] ?? allTranslations['en-US'],
    [lang, allTranslations]
  );
}`} />
      <CodeBlock title="Usage" code={`function MyComponent() {
  const t = useTranslations();
  return <div>{t.common.loading}</div>;
}`} />
    </SectionWrap>
  );
}

function PatternServerSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Pattern 3: Server Components">
      <p style={styles.textStyle}>
        Server Components can't use hooks. Use{' '}
        <code style={styles.codeStyle}>getTranslations(getMainLocale())</code> instead.
      </p>
      <CodeBlock title="Server component" code={`import { getMainLocale, getTranslations } from './logto-kit/locales';

export default async function MyServerComponent() {
  const locale = getMainLocale();
  const t = getTranslations(locale);

  return <div>{t.common.loading}</div>;
}`} />
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Limitation:</strong>{' '}
        Server Components read the ENV default (<code style={styles.codeSmStyle}>LANG_MAIN</code>),
        not the user's current selection. The user's selection is stored in{' '}
        <code style={styles.codeSmStyle}>sessionStorage</code>, which is client-side only.
        For reactive translations, use a Client Component.
      </div>
    </SectionWrap>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page 3: Adding a Language
// ═══════════════════════════════════════════════════════════════════════════════

function AddLangSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Adding a language">
      <p style={styles.textStyle}>
        Create a new locale file, register it, and add to the available list.
      </p>
      <CodeBlock title="Step 1: Create locale file" code={`// app/logto-kit/locales/ru-RU.ts
import type { Translations } from './index';

export const ruRU: Translations = {
  dashboard: { loading: 'Загрузка...', /* ... */ },
  tabs: { profile: 'Профиль', /* ... */ },
  // ... all other keys from Translations type
};`} />
      <CodeBlock title="Step 2: Register in locales/index.ts" code={`// 1. Add to LocaleCode union
export type LocaleCode = 'en-US' | 'ka-GE' | 'ru-RU';

// 2. Import
import { ruRU } from './ru-RU';

// 3. Add to locales record
const locales: Record<LocaleCode, Translations> = {
  'en-US': enUS,
  'ka-GE': kaGE,
  'ru-RU': ruRU,
};`} />
      <CodeBlock title="Step 3: Update AVAILABLE_LOCALES" code={`// app/logto-kit/logic/i18n.ts
export const AVAILABLE_LOCALES = ['en-US', 'ka-GE', 'ru-RU'] as const;`} />
      <CodeBlock title="Step 4: Update ENV" code={`# .env
LANG_AVAILABLE=en-US,ka-GE,ru-RU`} />
    </SectionWrap>
  );
}

function TranslationsTypeSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Translations type">
      <p style={styles.textStyle}>
        The <code style={styles.codeStyle}>Translations</code> interface defines all translation
        keys. Every locale must implement this fully.
      </p>
      <CodeBlock title="Key hierarchy" code={`interface Translations {
  dashboard: { loading, error, refresh, signOut, session, ... };
  tabs: { profile, preferences, security, identities, organizations, mfa, dev };
  security: { title, description, email, phone, password, ... };
  sidebar: { profileAvatar, token, userId, ... };
  profile: { basicInfo, givenName, familyName, saveChanges, ... };
  verification: { password, verifyPassword, verificationCode, ... };
  validation: { phoneE164Format, invalidEmailFormat, ... };
  preferences: { title, jsonData, save, ... };
  identities: { title, noIdentities, connected, ... };
  organizations: { title, orgs, orgRoles, beYourself, ... };
  mfa: { title, totp, backupCodes, ... };
  raw: { title, rawUserData, cookieActions, ... };
  common: { copy, copied, close, success, error, loading, ... };
}`} />
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Tip:</strong>{' '}
        Copy <code style={styles.codeSmStyle}>en-US/index.ts</code> as a starting point.
        TypeScript will enforce that all keys are present.
      </div>
    </SectionWrap>
  );
}

function AppTranslationsSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Kit vs App translations">
      <p style={styles.textStyle}>
        The kit ships <code style={styles.codeStyle}>KitTranslations</code> for its own UI.
        Your app can extend it with <code style={styles.codeStyle}>AppTranslations</code>{' '}
        to add your own keys.
      </p>
      <CodeBlock title="KitTranslations (kit provides)" code={`// Kit keys — used by Dashboard, UserButton, etc.
export interface KitTranslations {
  dashboard: { loading, error, refresh, ... };
  tabs: { profile, preferences, security, ... };
  security: { title, description, email, ... };
  common: { copy, close, success, ... };
  // ... all other kit keys
}`} />
      <CodeBlock title="AppTranslations (you define)" code={`import type { KitTranslations } from './logto-kit';

// Extend with your own keys
export interface AppTranslations extends KitTranslations {
  app: {
    welcome: string;
    settings: string;
    myCustomKey: string;
  };
}`} />
      <CodeBlock title="App locale file" code={`// app/locales/en-US.ts
import type { AppTranslations } from './types';
import { enUS as kitEnUS } from './logto-kit/locales';

export const enUS: AppTranslations = {
  ...kitEnUS,     // inherit all kit keys
  app: {          // your custom keys
    welcome: 'Welcome back',
    settings: 'Settings',
    myCustomKey: 'Hello',
  },
};`} />
      <CodeBlock title="Usage in your components" code={`import { useLangMode } from './logto-kit';
import { enUS, kaGE } from './app/locales';

const appTranslations: Record<string, AppTranslations> = {
  'en-US': enUS, 'ka-GE': kaGE,
};

function MyComponent() {
  const { lang } = useLangMode();
  const t = appTranslations[lang] ?? appTranslations['en-US'];

  // Kit keys work
  return <div>{t.common.loading}</div>;
  // App keys work too
  // return <div>{t.app.welcome}</div>;
}`} />
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Key:</strong>{' '}
        Both share the same <code style={styles.codeSmStyle}>useLangMode()</code> state.
        When the user switches language, both kit and app components re-render
        with the new translations.
      </div>
    </SectionWrap>
  );
}

function UseLangModeSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="useLangMode hook">
      <p style={styles.textStyle}>
        Reads current language from context. Reads{' '}
        <code style={styles.codeStyle}>sessionStorage</code> key <code style={styles.codeStyle}>lang-mode</code>{' '}
        for cross-tab sync.
      </p>
      <CodeBlock title="Interface" code={`interface LangModeContextValue {
  lang: string;
  setLang: (lang: string) => void;
}`} />
      <CodeBlock title="setLang internals" code={`// When you call setLang('ka-GE'):
// 1. sessionStorage.setItem('lang-mode', 'ka-GE')
// 2. React state update
// 3. persistLangToApi('ka-GE') — writes to Logto custom_data
//    { Preferences: { theme, lang: 'ka-GE', asOrg } }
// 4. window.dispatchEvent(new Event('preferences-changed'))
// 5. onLangChange?.() — optional callback`} />
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Fallback paths:</strong>{' '}
        Context exists → reads from sessionStorage first. SSR → returns default.{' '}
        No context → returns stored or default.
      </div>
    </SectionWrap>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export default function I18nDoc() {
  const styles = useDocStyles();
  return (
    <SectionContainer>
      {/* Page 1: Overview + Pipeline + ENV */}
      <Section id={1}>
        <div style={{ ...styles.twoColLayoutStyle, minHeight: '100%', padding: '16px' }}>
          <div style={styles.colLeftStyle}>
            <OverviewSection />
            <EnvSection />
          </div>
          <div style={styles.colLeftStyle}>
            <PipelineSection />
          </div>
        </div>
      </Section>

      {/* Page 2: Custom Components */}
      <Section id={2}>
        <div style={{ ...styles.twoColLayoutStyle, minHeight: '100%', padding: '16px' }}>
          <div style={styles.colLeftStyle}>
            <PatternDirectSection />
            <PatternHookSection />
          </div>
          <div style={styles.colLeftStyle}>
            <PatternServerSection />
            <UseLangModeSection />
          </div>
        </div>
      </Section>

      {/* Page 3: Adding a Language */}
      <Section id={3}>
        <div style={{ ...styles.twoColLayoutStyle, minHeight: '100%', padding: '16px' }}>
          <div style={styles.colLeftStyle}>
            <AddLangSection />
          </div>
          <div style={styles.colLeftStyle}>
            <AppTranslationsSection />
          </div>
        </div>
      </Section>
    </SectionContainer>
  );
}
