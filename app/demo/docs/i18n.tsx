'use client';

import CodeBlock from '../utils/CodeBlock';
import { SectionContainer, Section } from '../utils/Section';

// ─── Shared styles ──────────────────────────────────────────────────────────

const twoColLayoutStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '16px',
  alignItems: 'start',
};

const colLeftStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
};

const sectionWrapStyle: React.CSSProperties = {
  border: '1px solid rgba(255,255,255,0.058)',
  borderRadius: '5px',
  overflow: 'hidden',
  background: 'rgba(255,255,255,0.01)',
  display: 'flex',
  flexDirection: 'column',
};

const sectionHeadStyle: React.CSSProperties = {
  padding: '8px 14px',
  borderBottom: '1px solid rgba(255,255,255,0.045)',
  display: 'flex',
  alignItems: 'center',
  gap: '7px',
  background: 'rgba(255,255,255,0.015)',
};

const sectionDotStyle: React.CSSProperties = {
  width: '4px',
  height: '4px',
  borderRadius: '50%',
  background: 'rgba(255,255,255,0.18)',
  flexShrink: 0,
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: '9px',
  fontWeight: 600,
  color: 'rgba(255,255,255,0.28)',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
};

const sectionBodyStyle: React.CSSProperties = {
  padding: '20px 16px',
};

const textStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  lineHeight: 1.7,
  color: 'rgba(255,255,255,0.5)',
  fontFamily: "'DM Sans', system-ui, sans-serif",
  marginBottom: '0.75rem',
};

const codeStyle: React.CSSProperties = {
  color: '#9cdcdb',
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: '0.75rem',
};

const codeSmStyle: React.CSSProperties = {
  color: '#ce9178',
  fontSize: '0.6875rem',
  fontFamily: "'IBM Plex Mono', monospace",
};

const noteStyle: React.CSSProperties = {
  fontSize: '0.6875rem',
  lineHeight: 1.7,
  color: 'rgba(255,255,255,0.38)',
  fontFamily: "'DM Sans', system-ui, sans-serif",
  marginBottom: '0.625rem',
  paddingLeft: '10px',
  borderLeft: '2px solid rgba(255,255,255,0.06)',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: '0.6875rem',
  marginBottom: '0.75rem',
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '7px 10px',
  borderBottom: '1px solid rgba(255,255,255,0.08)',
  color: 'rgba(255,255,255,0.35)',
  fontWeight: 600,
  fontSize: '0.5625rem',
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '7px 10px',
  borderBottom: '1px solid rgba(255,255,255,0.035)',
  color: 'rgba(255,255,255,0.5)',
  verticalAlign: 'top',
  lineHeight: 1.5,
};

const tdPathStyle: React.CSSProperties = {
  ...tdStyle,
  color: '#9cdcdb',
  fontFamily: "'IBM Plex Mono', monospace",
  whiteSpace: 'nowrap',
};

// ─── Section wrappers ────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <div style={sectionHeadStyle}>
      <div style={sectionDotStyle} />
      <span style={sectionLabelStyle}>{label}</span>
    </div>
  );
}

function SectionWrap({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={sectionWrapStyle}>
      <SectionHeader label={label} />
      <div style={{ ...sectionBodyStyle, flex: 1 }}>{children}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page 1: Overview + ENV + Pipeline
// ═══════════════════════════════════════════════════════════════════════════════

function OverviewSection() {
  return (
    <SectionWrap label="Overview">
      <p style={textStyle}>
        File-based i18n system. All locales are statically imported and bundled.{' '}
        <code style={codeStyle}>LANG_AVAILABLE</code> controls which languages appear
        in the Preferences tab dropdown — it does NOT dynamically import files.
      </p>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Export</th>
            <th style={thStyle}>Type</th>
            <th style={thStyle}>Purpose</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdPathStyle}>useLangMode</td>
            <td style={tdStyle}>Hook</td>
            <td style={tdStyle}>{`{ lang, setLang }`}</td>
          </tr>
          <tr>
            <td style={tdPathStyle}>getAllTranslations</td>
            <td style={tdStyle}>Function</td>
            <td style={tdStyle}>{`Record<string, Translations>`}</td>
          </tr>
          <tr>
            <td style={tdPathStyle}>getTranslations</td>
            <td style={tdStyle}>Function</td>
            <td style={tdStyle}>{`Translations`}</td>
          </tr>
          <tr>
            <td style={tdPathStyle}>getSupportedLangs</td>
            <td style={tdStyle}>Function</td>
            <td style={tdStyle}>{`string[]`}</td>
          </tr>
          <tr>
            <td style={tdPathStyle}>Translations</td>
            <td style={tdStyle}>Type</td>
            <td style={tdStyle}>Full translation object</td>
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
  return (
    <SectionWrap label="How it works">
      <p style={textStyle}>
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
  return (
    <SectionWrap label="ENV variables">
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Variable</th>
            <th style={thStyle}>Default</th>
            <th style={thStyle}>Purpose</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdPathStyle}>LANG_MAIN</td>
            <td style={tdStyle}><code style={codeStyle}>en-US</code></td>
            <td style={tdStyle}>Default language</td>
          </tr>
          <tr>
            <td style={tdPathStyle}>LANG_AVAILABLE</td>
            <td style={tdStyle}><code style={codeStyle}>en-US</code></td>
            <td style={tdStyle}>UI filter — which languages appear in selector</td>
          </tr>
        </tbody>
      </table>
      <CodeBlock title=".env" code={`LANG_MAIN=en-US
LANG_AVAILABLE=en-US,ka-GE`} />
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>How filtering works:</strong>{' '}
        <code style={codeSmStyle}>getSupportedLangs()</code> parses the env, then filters
        to only codes that exist in <code style={codeSmStyle}>AVAILABLE_LOCALES</code>.
        If <code style={codeSmStyle}>ru-RU</code> is in env but not in the codebase, it's
        silently dropped.
      </div>
    </SectionWrap>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page 2: Custom Components
// ═══════════════════════════════════════════════════════════════════════════════

function PatternDirectSection() {
  return (
    <SectionWrap label="Pattern 1: Direct imports">
      <p style={textStyle}>
        Import <code style={codeStyle}>useLangMode</code> +{' '}
        <code style={codeStyle}>getAllTranslations</code> and look up{' '}
        <code style={codeStyle}>t</code> from the map. Re-renders on language change.
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
  return (
    <SectionWrap label="Pattern 2: Custom hook">
      <p style={textStyle}>
        Wrap the lookup in a <code style={codeStyle}>useTranslations</code> hook
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
  return (
    <SectionWrap label="Pattern 3: Server Components">
      <p style={textStyle}>
        Server Components can't use hooks. Use{' '}
        <code style={codeStyle}>getTranslations(getMainLocale())</code> instead.
      </p>
      <CodeBlock title="Server component" code={`import { getMainLocale, getTranslations } from './logto-kit/locales';

export default async function MyServerComponent() {
  const locale = getMainLocale();
  const t = getTranslations(locale);

  return <div>{t.common.loading}</div>;
}`} />
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Limitation:</strong>{' '}
        Server Components read the ENV default (<code style={codeSmStyle}>LANG_MAIN</code>),
        not the user's current selection. The user's selection is stored in{' '}
        <code style={codeSmStyle}>sessionStorage</code>, which is client-side only.
        For reactive translations, use a Client Component.
      </div>
    </SectionWrap>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page 3: Adding a Language
// ═══════════════════════════════════════════════════════════════════════════════

function AddLangSection() {
  return (
    <SectionWrap label="Adding a language">
      <p style={textStyle}>
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
  return (
    <SectionWrap label="Translations type">
      <p style={textStyle}>
        The <code style={codeStyle}>Translations</code> interface defines all translation
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
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Tip:</strong>{' '}
        Copy <code style={codeSmStyle}>en-US/index.ts</code> as a starting point.
        TypeScript will enforce that all keys are present.
      </div>
    </SectionWrap>
  );
}

function AppTranslationsSection() {
  return (
    <SectionWrap label="Kit vs App translations">
      <p style={textStyle}>
        The kit ships <code style={codeStyle}>KitTranslations</code> for its own UI.
        Your app can extend it with <code style={codeStyle}>AppTranslations</code>{' '}
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
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Key:</strong>{' '}
        Both share the same <code style={codeSmStyle}>useLangMode()</code> state.
        When the user switches language, both kit and app components re-render
        with the new translations.
      </div>
    </SectionWrap>
  );
}

function UseLangModeSection() {
  return (
    <SectionWrap label="useLangMode hook">
      <p style={textStyle}>
        Reads current language from context. Reads{' '}
        <code style={codeStyle}>sessionStorage</code> key <code style={codeStyle}>lang-mode</code>{' '}
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
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Fallback paths:</strong>{' '}
        Context exists → reads from sessionStorage first. SSR → returns default.{' '}
        No context → returns stored or default.
      </div>
    </SectionWrap>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export default function I18nDoc() {
  return (
    <SectionContainer>
      {/* Page 1: Overview + Pipeline + ENV */}
      <Section id={1}>
        <div style={{ ...twoColLayoutStyle, height: '100%', padding: '16px' }}>
          <div style={colLeftStyle}>
            <OverviewSection />
            <EnvSection />
          </div>
          <div style={colLeftStyle}>
            <PipelineSection />
          </div>
        </div>
      </Section>

      {/* Page 2: Custom Components */}
      <Section id={2}>
        <div style={{ ...twoColLayoutStyle, height: '100%', padding: '16px' }}>
          <div style={colLeftStyle}>
            <PatternDirectSection />
            <PatternHookSection />
          </div>
          <div style={colLeftStyle}>
            <PatternServerSection />
            <UseLangModeSection />
          </div>
        </div>
      </Section>

      {/* Page 3: Adding a Language */}
      <Section id={3}>
        <div style={{ ...twoColLayoutStyle, height: '100%', padding: '16px' }}>
          <div style={colLeftStyle}>
            <AddLangSection />
          </div>
          <div style={colLeftStyle}>
            <AppTranslationsSection />
          </div>
        </div>
      </Section>
    </SectionContainer>
  );
}
