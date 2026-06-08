'use client';

import { useDocStyles } from "../../components/useDocStyles";
import CodeBlock from "../../components/SyntaxBlock";
import { useThemeMode } from "../../../logto-kit/components/providers/preferences";
import { slugify } from "../../components/SectionComponents";

export default function SecurityInputGuardsDoc() {
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
      <h2 id={slugify("Trust Boundary Input Guards")} style={{ ...h2Style, marginTop: 0 }}>Trust Boundary Input Guards</h2>
      <p style={styles.textStyle}>
        Server actions are exposed as public HTTP endpoints. To maintain security, the server validates all inputs at the entry boundary. The input validation system enforces explicit checks on IDs, enums, text fields, and configurations before any processing or downstream queries execute.
      </p>

      <h2 id={slugify("ID and Enum Format Guards")} style={h2Style}>ID and Enum Format Guards</h2>
      <p style={styles.textStyle}>
        ID guards prevent path traversal and query injection by enforcing strict alphanumeric format checks using a safe regular expression.
      </p>
      <CodeBlock
        title="Safe ID Regular Expression"
        code={`// Restricts input to alphanumeric characters, underscores, and hyphens, between 1 and 128 characters
const SAFE_ID_REGEX = /^[A-Za-z0-9_-]{1,128}$/;`}
      />
      <p style={styles.textStyle}>
        The application exposes specific validation functions that throw ValidationError on mismatch:
      </p>
      <ul style={{ ...styles.textStyle, paddingLeft: '20px', listStyleType: 'disc' }}>
        <li>
          <code style={styles.codeStyle}>assertSafeUserId(id)</code>: Verifies that the user ID conforms to SAFE_ID_REGEX to protect downstream database queries.
        </li>
        <li>
          <code style={styles.codeStyle}>assertSafeLogtoId(id, field)</code>: Validates general Logto identifiers (such as session IDs or grant IDs) against the safe regex.
        </li>
      </ul>
      <p style={styles.textStyle}>
        Enum guards restrict incoming string inputs to predefined lists of acceptable values:
      </p>
      <ul style={{ ...styles.textStyle, paddingLeft: '20px', listStyleType: 'disc' }}>
        <li>
          <code style={styles.codeStyle}>assertRevokeGrantsTarget(value)</code>: Rejects any input that does not match &quot;all&quot; or &quot;firstParty&quot;.
        </li>
        <li>
          <code style={styles.codeStyle}>assertMfaType(value)</code>: Restricts inputs to valid Multi-Factor Authentication types: &quot;Totp&quot;, &quot;WebAuthn&quot;, or &quot;BackupCode&quot;.
        </li>
      </ul>

      <h2 id={slugify("Field and Content Guards")} style={h2Style}>Field and Content Guards</h2>
      <p style={styles.textStyle}>
        Text field inputs are validated to prevent buffer overflows, SQL injection patterns, and control-character exploitation. The field guards sanitize and enforce strict constraints on all user-controlled text fields:
      </p>
      <table style={customTableStyle}>
        <thead>
          <tr>
            <th style={{ ...customThStyle, width: '30%' }}>Field Guard</th>
            <th style={{ ...customThStyle, width: '25%' }}>Length Limit</th>
            <th style={{ ...customThStyle, width: '45%' }}>Validation Constraints</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={customTdPropStyle}>assertPasskeyName</td>
            <td style={customTdStyle}>64 characters</td>
            <td style={customTdStyle}>Requires string type, rejects ASCII control characters (throwing a ValidationError), forbids empty inputs.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>assertNameField</td>
            <td style={customTdStyle}>128 characters</td>
            <td style={customTdStyle}>Rejects ASCII control characters (throwing a ValidationError), allows null or undefined, validates string type.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>assertUsername</td>
            <td style={customTdStyle}>3 to 32 characters</td>
            <td style={customTdStyle}>Restricts characters to alphanumeric, underscores, and hyphens (/^[a-zA-Z0-9_-]+$/).</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>assertHttpUrl</td>
            <td style={customTdStyle}>2048 characters</td>
            <td style={customTdStyle}>Requires string type, validates HTTP/HTTPS protocol structure, handles S3 or CDN origins.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>assertVerificationCode</td>
            <td style={customTdStyle}>6 characters</td>
            <td style={customTdStyle}>Requires a numeric string conforming to a strict 6-digit match expression (/^\d{6}$/).</td>
          </tr>
        </tbody>
      </table>
      <p style={styles.textStyle}>
        To prevent terminal injection and formatting manipulation, inputs are validated against ASCII control characters. If any control characters are present, the input is rejected by throwing a <code style={styles.codeStyle}>ValidationError</code>, rather than being sanitized or stripped in-place:
      </p>
      <CodeBlock
        title="Control Character Stripping"
        code={`function stripControlChars(s: string): string {
  // Strips ASCII control characters except whitespace-ish
  return s.replace(/[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]/g, '');
}`}
      />

      <h2 id={slugify("Safe URL Construction")} style={h2Style}>Safe URL Construction</h2>
      <p style={styles.textStyle}>
        The <code style={styles.codeStyle}>safeUrl()</code> builder constructs URLs containing client-controlled values. It protects against path traversal attacks and query-parameter smuggling by verifying that placeholders do not contain directory traversal markers, null bytes, or route separators.
      </p>
      <CodeBlock
        title="Safe URL Builder Implementation"
        code={`export function safeUrl(
  base: string,
  path: string,
  params: Record<string, string> = {},
  query: Record<string, string | undefined> = {},
): string {
  const cleanBase = base.replace(/\\/+$/, '');
  const normalised = path.startsWith('/') ? path : \`/\${path}\`;

  const filled = normalised.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, key) => {
    const value = params[key];
    if (typeof value !== 'string' || value.length === 0) {
      throw new ValidationError('MISSING_URL_PARAM', key);
    }
    // Reject directory traversal segments or raw path separators
    if (value.includes('..') || value.includes('/') || value.includes('\\\\') || value.includes('\\x00')) {
      throw new ValidationError('INVALID_URL_PARAM', key);
    }
    return encodeURIComponent(value);
  });

  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '') continue;
    usp.set(k, v);
  }
  const qs = usp.toString();

  return \`\${cleanBase}\${filled}\${qs ? \`?\${qs}\` : ''}\`;
}`}
      />

      <h2 id={slugify("Mass-Assignment Blocker")} style={h2Style}>Mass-Assignment Blocker</h2>
      <p style={styles.textStyle}>
        When users update preferences, sending raw structures can lead to mass-assignment vulnerabilities. This occurs when unexpected fields are merged into user profile structures, potentially overwriting internal settings or custom configuration data.
      </p>
      <p style={styles.textStyle}>
        The <code style={styles.codeStyle}>pickPreferences()</code> utility implements a strict whitelist for custom preference keys. It filters out any unexpected attributes from customData objects before they reach Logto update endpoints:
      </p>
      <CodeBlock
        title="Mass-Assignment Prevention via Whitelist Filtering"
        code={`const PREFERENCES_ALLOWED_KEYS = ['asOrg', 'theme', 'lang'] as const;

export function pickPreferences(input: unknown): PreferencesShape {
  if (input === null || input === undefined) return {};
  if (typeof input !== 'object' || Array.isArray(input)) {
    throw new ValidationError('INVALID_PREFERENCES', 'Preferences');
  }

  const out: PreferencesShape = {};
  const src = input as Record<string, unknown>;

  for (const key of PREFERENCES_ALLOWED_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(src, key)) continue;
    const value = src[key];

    if (key === 'asOrg') {
      if (value === null) {
        out.asOrg = null;
      } else if (typeof value === 'string' && SAFE_ID_REGEX.test(value)) {
        out.asOrg = value;
      } else {
        throw new ValidationError('INVALID_ORG_ID', 'Preferences.asOrg');
      }
    } else if (key === 'theme') {
      if (value === 'light' || value === 'dark') {
        out.theme = value;
      } else {
        throw new ValidationError('INVALID_THEME_MODE', 'Preferences.theme');
      }
    } else if (key === 'lang') {
      if (typeof value === 'string' && /^[A-Za-z0-9_-]{1,16}$/.test(value)) {
        out.lang = value;
      } else {
        throw new ValidationError('INVALID_LANGUAGE', 'Preferences.lang');
      }
    }
  }

  return out;
}`}
      />

      <h2 id={slugify("Origin Guard (CSRF Protection)")} style={h2Style}>Origin Guard (CSRF Protection)</h2>
      <p style={styles.textStyle}>
        Next.js Server Actions have built-in origin validation. However, standard route handlers (such as API endpoints) do not. The <code style={styles.codeStyle}>checkSameOrigin</code> utility enforces strict origin validation on sensitive API route handlers.
      </p>
      <p style={styles.textStyle}>
        The guard compares the request origin header against the configured BASE_URL or APP_URL. If the origin header is missing, malformed, or fails to match the expected host, the handler halts execution immediately and returns a 403 Forbidden response.
      </p>
      <div style={styles.warningBannerStyle}>
        <p style={{ ...styles.textStyle, margin: 0, paddingBottom: '10px' }}>
          <strong style={styles.warningBannerStrongStyle}>Exceptions and Exclusions:</strong>
        </p>
        <ul style={{ ...styles.textStyle, margin: 0, paddingLeft: '20px', listStyleType: 'disc' }}>
          <li style={{ paddingBottom: '8px' }}>
            <strong>OAuth callback endpoints:</strong> Sign-in and sign-out endpoints are exempt from origin guards because the standard OIDC <code style={styles.codeStyle}>state</code> parameter natively provides full CSRF protection, and local development environments often trigger spurious origin mismatches during OAuth redirect round-trips.
          </li>
          <li>
            <strong>Standard <code style={styles.codeStyle}>GET</code> requests to <code style={styles.codeStyle}>/api/wipe</code>:</strong> Plain cookie-clearing via GET is exempt from origin guards to support standard browser navigations and redirects. However, destructive force-signout requests via <code style={styles.codeStyle}>GET /api/wipe?force=true</code> or any <code style={styles.codeStyle}>POST</code> requests to <code style={styles.codeStyle}>/api/wipe</code> strictly enforce <code style={styles.codeStyle}>checkSameOrigin</code>.
          </li>
        </ul>
      </div>
    </div>
  );
}
