'use client';

import CodeBlock from '../components/SyntaxBlock';
import { SectionContainer, Section } from '../components/Section';
import { useDocStyles } from '../components/useDocStyles';
import { SectionHeader, SectionWrap } from '../components/SectionComponents';

// ═══════════════════════════════════════════════════════════════════════════════
// Page 1: Overview
// ═══════════════════════════════════════════════════════════════════════════════

function OverviewSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Overview">
      <p style={styles.textStyle}>
        Every <code style={styles.codeStyle}>'use server'</code> function is callable from
        the browser with arbitrary arguments. This file provides the validators used
        at every server-action trust boundary.
      </p>
      <CodeBlock title="Design rules" code={`1. Every guard throws on bad input - never check a return value.
   All guards throw ValidationError, caught by the sanitization layer.

2. Guards are at the entry point, never downstream.
   Validate immediately, not after partial processing.

3. Every guard has explicit test coverage (guards.test.ts).`} />
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Threat model:</strong>{' '}
        Path/query injection in URLs built from client IDs, mass-assignment of customData
        with unexpected keys, malformed JWT payloads decoded to empty permission sets,
        bad MIME type claims (handled by magic-byte detection in avatar.ts).
      </div>
      <table style={styles.tableStyle}>
        <thead>
          <tr>
            <th style={styles.thStyle}>Category</th>
            <th style={styles.thStyle}>File</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tdPropStyle}>Assertion guards</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>logic/guards.ts</code></td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>Validation functions</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>logic/validation.ts</code></td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>Origin check</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>logic/origin-guard.ts</code></td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>Env reader</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>logic/env.ts</code></td>
          </tr>
        </tbody>
      </table>
    </SectionWrap>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page 2: ID + Enum Guards
// ═══════════════════════════════════════════════════════════════════════════════

function IdGuardsSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="ID Guards">
      <p style={styles.textStyle}>
        Logto IDs are opaque alphanumeric strings. Guards prevent path/query injection
        when these IDs are interpolated into URLs.
      </p>
      <CodeBlock title="assertSafeUserId / assertSafeLogtoId" code={`const SAFE_ID_REGEX = /^[A-Za-z0-9_-]{1,128}$/;

// For user IDs specifically - always labels the error field as 'userId'
export function assertSafeUserId(id: unknown): asserts id is string {
  if (typeof id !== 'string' || !SAFE_ID_REGEX.test(id)) {
    throw new ValidationError('INVALID_USER_ID', 'userId');
  }
}

// For any Logto-issued ID - accepts a custom field name
export function assertSafeLogtoId(id: unknown, field = 'id'): asserts id is string {
  if (typeof id !== 'string' || !SAFE_ID_REGEX.test(id)) {
    throw new ValidationError('INVALID_ID', field);
  }
}`} />
    </SectionWrap>
  );
}

function EnumGuardsSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Enum Guards">
      <p style={styles.textStyle}>
        Allowlist-based guards for enum-valued parameters. These prevent unexpected
        values from reaching Logto's API.
      </p>
      <CodeBlock title="assertRevokeGrantsTarget" code={`const REVOKE_GRANTS_TARGETS = ['all', 'firstParty'] as const;
export type RevokeGrantsTarget = (typeof REVOKE_GRANTS_TARGETS)[number];

export function assertRevokeGrantsTarget(value: unknown): asserts value is RevokeGrantsTarget | undefined {
  if (value === undefined || value === null) return;
  if (typeof value !== 'string' || !(REVOKE_GRANTS_TARGETS as readonly string[]).includes(value)) {
    throw new ValidationError('INVALID_ENUM', 'revokeGrantsTarget');
  }
}`} />
      <CodeBlock title="assertMfaType / assertVerificationType" code={`const MFA_TYPES = ['Totp', 'WebAuthn', 'BackupCode'] as const;
export function assertMfaType(value: unknown): asserts value is MfaType {
  if (typeof value !== 'string' || !(MFA_TYPES as readonly string[]).includes(value)) {
    throw new ValidationError('INVALID_MFA_TYPE', 'type');
  }
}

const VERIFICATION_TYPES = ['email', 'phone'] as const;
export function assertVerificationType(value: unknown): asserts value is VerificationType {
  if (typeof value !== 'string' || !(VERIFICATION_TYPES as readonly string[]).includes(value)) {
    throw new ValidationError('INVALID_VERIFICATION_TYPE', 'type');
  }
}`} />
    </SectionWrap>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page 3: Field Guards + Validation
// ═══════════════════════════════════════════════════════════════════════════════

function FieldGuardsSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Field Guards">
      <p style={styles.textStyle}>
        Length, content, and format validators for user-editable fields.
      </p>
      <CodeBlock title="assertPasskeyName / assertNameField / assertUsername" code={`export function assertPasskeyName(value: unknown): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0)
    throw new ValidationError('INVALID_FIELD_TYPE', 'name');
  if (value.trim().length > 64)
    throw new ValidationError('FIELD_TOO_LONG', 'name');
  if (value !== stripControlChars(value))
    throw new ValidationError('INVALID_CHARS', 'name');
}

export function assertNameField(value: unknown, field: string): asserts value is string {
  if (value === undefined || value === null) return; // optional
  if (typeof value !== 'string')
    throw new ValidationError('INVALID_FIELD_TYPE', field);
  if (value.length > 128)
    throw new ValidationError('FIELD_TOO_LONG', field);
  if (value !== stripControlChars(value))
    throw new ValidationError('INVALID_CHARS', field);
}

export function assertUsername(value: unknown): asserts value is string {
  if (value === undefined || value === null || value === '') return;
  if (typeof value !== 'string')
    throw new ValidationError('INVALID_FIELD_TYPE', 'username');
  if (value.length < 3 || value.length > 32)
    throw new ValidationError('FIELD_TOO_LONG', 'username');
  if (!/^[a-zA-Z0-9_-]+$/.test(value))
    throw new ValidationError('INVALID_CHARS', 'username');
}`} />
      <CodeBlock title="assertHttpUrl / assertVerificationCode" code={`export function assertHttpUrl(value: unknown, field: string): asserts value is string {
  if (value === undefined || value === null || value === '') return;
  if (typeof value !== 'string' || value.length > 2048)
    throw new ValidationError('INVALID_URL', field);
  try {
    const u = new URL(value);
    if (u.protocol !== 'http:' && u.protocol !== 'https:')
      throw new ValidationError('INVALID_URL_PROTOCOL', field);
  } catch {
    throw new ValidationError('INVALID_URL', field);
  }
}

export function assertVerificationCode(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !/^\\d{6}$/.test(value))
    throw new ValidationError('INVALID_CODE', 'code');
}`} />
    </SectionWrap>
  );
}

function ValidationSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Validation Functions">
      <p style={styles.textStyle}>
        Client-safe validation functions that throw <code style={styles.codeStyle}>ValidationError</code>
        with user-facing translation keys. These are i18n-aware and produce messages
        the UI can display directly.
      </p>
      <CodeBlock title="validateE164 / validateEmail / validatePassword" code={`export function validateE164(phone: string, t: Translations['validation'], field = 'phone'): void {
  const cleaned = phone.replace(/[\\s-]/g, '');
  if (!/^\\+[1-9]\\d{1,14}$/.test(cleaned))
    throw new ValidationError(t.phoneE164Format, field);
}

export function validateEmail(email: string, t: Translations['validation'], field = 'email'): void {
  if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email))
    throw new ValidationError(t.invalidEmailFormat, field);
  if (email.length > 128)
    throw new ValidationError(t.emailTooLong, field);
}

export function validatePassword(password: string, t: Translations['validation'], field = 'password'): void {
  if (!password || password.length === 0)
    throw new ValidationError(t.passwordRequired, field);
  if (password.length > 256)
    throw new ValidationError(t.passwordTooLong, field);
}`} />
      <CodeBlock title="validateVerificationCode / validateUsername / validateUrl" code={`export function validateVerificationCode(code: string, t: Translations['validation']): void {
  if (!/^\\d{6}$/.test(code))
    throw new ValidationError(t.codeMustBeSixDigits, 'code');
}

export function validateUsername(username: string, t: Translations['validation']): void {
  if (!username) return;
  if (username.length < 3) throw new ValidationError(t.usernameTooShort, 'username');
  if (username.length > 32) throw new ValidationError(t.usernameTooLong, 'username');
  if (!/^[a-zA-Z0-9_-]+$/.test(username))
    throw new ValidationError(t.usernameInvalidCharacters, 'username');
}

export function validateUrl(url: string, t: Translations['validation']): void {
  if (!url) return;
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol))
      throw new ValidationError(t.urlInvalidProtocol, 'url');
  } catch {
    throw new ValidationError(t.urlInvalidFormat, 'url');
  }
}`} />
      <CodeBlock title="validateJsonObject" code={`export function validateJsonObject(value: string, t: Translations['validation']): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))
      throw new ValidationError(t.jsonMustBeObject, 'json');
    return parsed;
  } catch (e) {
    if (e instanceof ValidationError) throw e;
    throw new ValidationError(\`\${t.invalidJson}: \${e instanceof Error ? e.message : 'parse error'}\`, 'json');
  }
}`} />
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>ValidationResult type:</strong>{' '}
        <code style={styles.codeSmStyle}>{'{ success: true, value } | { success: false, error, field? }'}</code>
        Useful for composing validators in custom server actions.
      </div>
    </SectionWrap>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page 4: URL Builder + Mass Assignment
// ═══════════════════════════════════════════════════════════════════════════════

function UrlBuilderSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="safeUrl() builder">
      <p style={styles.textStyle}>
        Builds URLs with path segments and query parameters safely encoded.
        Use this whenever a client-controlled value is interpolated into a URL.
      </p>
      <CodeBlock title="safeUrl()" code={`export function safeUrl(
  base: string,
  path: string,
  params: Record<string, string> = {},
  query: Record<string, string | undefined> = {},
): string {
  const cleanBase = base.replace(/\\/+$/, '');
  const normalised = path.startsWith('/') ? path : \`/\${path}\`;

  const filled = normalised.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, key) => {
    const value = params[key];
    if (typeof value !== 'string' || value.length === 0)
      throw new ValidationError('MISSING_URL_PARAM', key);
    if (value.includes('..') || value.includes('/'))
      throw new ValidationError('INVALID_URL_PARAM', key);
    return encodeURIComponent(value);
  });

  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '') continue;
    usp.set(k, v);
  }

  return \`\${cleanBase}\${filled}\${usp.toString() ? \`?\${usp.toString()}\` : ''}\`;
}`} />
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Protections:</strong>{' '}
        Path traversal via <code style={styles.codeSmStyle}>..</code> rejected. Query-parameter
        smuggling via <code style={styles.codeSmStyle}>?</code> in path segments prevented.
        Segments must not be pre-encoded - <code style={styles.codeSmStyle}>encodeURIComponent</code>
        is called on each one.
      </div>
    </SectionWrap>
  );
}

function MassAssignmentSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Mass-assignment guard (pickPreferences)">
      <p style={styles.textStyle}>
        Whitelists allowed <code style={styles.codeStyle}>Preferences</code> keys, dropping
        anything else. Used by <code style={styles.codeStyle}>updateUserCustomData</code> to
        prevent mass-assignment of unexpected fields into Logto customData.
      </p>
      <CodeBlock title="pickPreferences()" code={`const PREFERENCES_ALLOWED_KEYS = ['asOrg', 'theme', 'lang'] as const;

export function pickPreferences(input: unknown): PreferencesShape {
  if (input === null || input === undefined) return {};
  if (typeof input !== 'object' || Array.isArray(input))
    throw new ValidationError('INVALID_PREFERENCES', 'Preferences');

  const out: PreferencesShape = {};
  const src = input as Record<string, unknown>;

  for (const key of PREFERENCES_ALLOWED_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(src, key)) continue;
    const value = src[key];

    if (key === 'asOrg') {
      if (value === null) { out.asOrg = null; }
      else if (typeof value === 'string' && SAFE_ID_REGEX.test(value)) { out.asOrg = value; }
      else { throw new ValidationError('INVALID_ORG_ID', 'Preferences.asOrg'); }
    } else if (key === 'theme') {
      if (value === 'light' || value === 'dark') { out.theme = value; }
      else { throw new ValidationError('INVALID_THEME_MODE', 'Preferences.theme'); }
    } else if (key === 'lang') {
      if (typeof value === 'string' && /^[A-Za-z0-9-]{1,16}$/.test(value)) { out.lang = value; }
      else { throw new ValidationError('INVALID_LANGUAGE', 'Preferences.lang'); }
    }
  }
  return out;
}`} />
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Unknown keys:</strong>{' '}
        Silently dropped (no throw). Downstream must not be able to cause errors by
        sending garbage they wouldn't otherwise send.
      </div>
    </SectionWrap>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page 5: Origin Guard + readEnv
// ═══════════════════════════════════════════════════════════════════════════════

function OriginGuardSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Origin guard">
      <p style={styles.textStyle}>
        CSRF guard for plain route handlers. Next.js Server Actions enforce same-origin
        automatically at the framework level, but plain <code style={styles.codeStyle}>route.ts</code>{' '}
        handlers do NOT - they need an explicit check.
      </p>
      <CodeBlock title="checkSameOrigin()" code={`export function checkSameOrigin(request: NextRequest): NextResponse | null {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

  let expectedOrigin: string;
  try { expectedOrigin = new URL(baseUrl).origin; }
  catch {
    warn('[origin-guard] BASE_URL is malformed, rejecting request');
    return NextResponse.json({ error: 'FORBIDDEN_ORIGIN' }, { status: 403 });
  }

  const origin = request.headers.get('origin') ?? request.headers.get('referer');
  if (!origin)
    return NextResponse.json({ error: 'FORBIDDEN_ORIGIN' }, { status: 403 });

  let requestOrigin: string;
  try { requestOrigin = new URL(origin).origin; }
  catch { return NextResponse.json({ error: 'FORBIDDEN_ORIGIN' }, { status: 403 }); }

  if (requestOrigin !== expectedOrigin)
    return NextResponse.json({ error: 'FORBIDDEN_ORIGIN' }, { status: 403 });

  return null; // same-origin - allow
}`} />
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Fail-closed:</strong>{' '}
        Returns 403 if Origin/Referer is absent or doesn't match BASE_URL.
        Cross-origin POST requests from browsers always include an Origin header.
      </div>
    </SectionWrap>
  );
}

function EnvSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="readEnv()">
      <p style={styles.textStyle}>
        Reads environment variables with automatic <code style={styles.codeStyle}>NEXT_PUBLIC_</code>{' '}
        fallback. Works in both server and client contexts.
      </p>
      <CodeBlock title="readEnv()" code={`const NEXT_PUBLIC_ENV: Record<string, string | undefined> = {
  USER_SHAPE: process.env.NEXT_PUBLIC_USER_SHAPE,
  THEME: process.env.NEXT_PUBLIC_THEME,
  DEFAULT_THEME_MODE: process.env.NEXT_PUBLIC_DEFAULT_THEME_MODE,
  LANG_MAIN: process.env.NEXT_PUBLIC_LANG_MAIN,
  LANG_AVAILABLE: process.env.NEXT_PUBLIC_LANG_AVAILABLE,
  LOAD_TABS: process.env.NEXT_PUBLIC_LOAD_TABS,
  MFA_ISSUER: process.env.NEXT_PUBLIC_MFA_ISSUER,
  NAME_TYPE: process.env.NEXT_PUBLIC_NAME_TYPE,
  DELETE_REDIRECT_DELAY: process.env.NEXT_PUBLIC_DELETE_REDIRECT_DELAY,
};

export function readEnv(name: string, allowPublic = true): string | undefined {
  if (typeof process !== 'undefined' && process.env) {
    const val = process.env[name];
    if (val !== undefined) return val;
    if (allowPublic) {
      if (name in NEXT_PUBLIC_ENV) return NEXT_PUBLIC_ENV[name];
      return process.env[\`NEXT_PUBLIC_\${name}\`];
    }
  }
  return undefined;
}`} />
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>allowPublic=false:</strong>{' '}
        Use for secrets (APP_SECRET, COOKIE_SECRET, etc.) to prevent accidental client exposure.
        When false, skips the NEXT_PUBLIC_ fallback entirely.
      </div>
    </SectionWrap>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export default function GuardsDoc() {
  const styles = useDocStyles();
  return (
    <SectionContainer>
      {/* Page 1: Overview */}
      <Section id={1}>
        <div style={{ ...styles.twoColLayoutStyle, minHeight: '100%', padding: '16px' }}>
          <div style={{ ...styles.colLeftStyle, gridColumn: '1 / -1' }}>
            <OverviewSection />
          </div>
        </div>
      </Section>

      {/* Page 2: ID + Enum Guards */}
      <Section id={2}>
        <div style={{ ...styles.twoColLayoutStyle, minHeight: '100%', padding: '16px' }}>
          <div style={styles.colLeftStyle}>
            <IdGuardsSection />
          </div>
          <div style={styles.colLeftStyle}>
            <EnumGuardsSection />
          </div>
        </div>
      </Section>

      {/* Page 3: Field Guards + Validation */}
      <Section id={3}>
        <div style={{ ...styles.twoColLayoutStyle, minHeight: '100%', padding: '16px' }}>
          <div style={styles.colLeftStyle}>
            <FieldGuardsSection />
          </div>
          <div style={styles.colLeftStyle}>
            <ValidationSection />
          </div>
        </div>
      </Section>

      {/* Page 4: URL Builder + Mass Assignment */}
      <Section id={4}>
        <div style={{ ...styles.twoColLayoutStyle, minHeight: '100%', padding: '16px' }}>
          <div style={styles.colLeftStyle}>
            <UrlBuilderSection />
          </div>
          <div style={styles.colLeftStyle}>
            <MassAssignmentSection />
          </div>
        </div>
      </Section>

      {/* Page 5: Origin Guard + readEnv */}
      <Section id={5}>
        <div style={{ ...styles.twoColLayoutStyle, minHeight: '100%', padding: '16px' }}>
          <div style={styles.colLeftStyle}>
            <OriginGuardSection />
          </div>
          <div style={styles.colLeftStyle}>
            <EnvSection />
          </div>
        </div>
      </Section>
    </SectionContainer>
  );
}
