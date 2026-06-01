'use client';

import { useDocStyles } from "../../components/useDocStyles";
import CodeBlock from "../../components/SyntaxBlock";
import { SectionWrap } from "../../components/SectionComponents";

export default function SecurityInputGuardsDoc() {
  const styles = useDocStyles();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <SectionWrap label="Trust Boundary Input Guards">
        <p style={styles.textStyle}>
          Server actions are exposed as public HTTP endpoints. To maintain security, the server validates all inputs at the entry boundary. The input validation system enforces explicit checks on IDs, enums, text fields, and configurations before any processing or downstream queries execute.
        </p>
      </SectionWrap>

      <SectionWrap label="ID and Enum Format Guards">
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
            <code style={styles.codeStyle}>assertRevokeGrantsTarget(value)</code>: Rejects any input that does not match "all" or "firstParty".
          </li>
          <li>
            <code style={styles.codeStyle}>assertMfaType(value)</code>: Restricts inputs to valid Multi-Factor Authentication types: "Totp", "WebAuthn", or "BackupCode".
          </li>
        </ul>
      </SectionWrap>

      <SectionWrap label="Field and Content Guards">
        <p style={styles.textStyle}>
          Text field inputs are validated to prevent buffer overflows, SQL injection patterns, and control-character exploitation. The field guards sanitize and enforce strict constraints on all user-controlled text fields:
        </p>
        <table style={styles.tableStyle}>
          <thead>
            <tr>
              <th style={{ ...styles.thStyle, width: '30%' }}>Field Guard</th>
              <th style={{ ...styles.thStyle, width: '25%' }}>Length Limit</th>
              <th style={{ ...styles.thStyle, width: '45%' }}>Validation Constraints</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.tdPropStyle}>assertPasskeyName</td>
              <td style={styles.tdStyle}>64 characters</td>
              <td style={styles.tdStyle}>Requires string type, strips ASCII control characters, forbids empty inputs.</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>assertNameField</td>
              <td style={styles.tdStyle}>128 characters</td>
              <td style={styles.tdStyle}>Strips ASCII control characters, allows null or undefined, validates string type.</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>assertUsername</td>
              <td style={styles.tdStyle}>3 to 32 characters</td>
              <td style={styles.tdStyle}>Restricts characters to alphanumeric, underscores, and hyphens (/^[a-zA-Z0-9_-]+$/).</td>
            </tr>
          </tbody>
        </table>
        <p style={styles.textStyle}>
          Control character stripping removes ASCII control characters from strings to prevent terminal injection and formatting manipulation:
        </p>
        <CodeBlock
          title="Control Character Stripping"
          code={`function stripControlChars(s: string): string {
  // Strips ASCII control characters except whitespace-ish
  return s.replace(/[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]/g, '');
}`}
        />
      </SectionWrap>

      <SectionWrap label="Safe URL Construction">
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
      </SectionWrap>

      <SectionWrap label="Mass-Assignment Blocker">
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
      </SectionWrap>

      <SectionWrap label="Origin Guard (CSRF Protection)">
        <p style={styles.textStyle}>
          Next.js Server Actions have built-in origin validation. However, standard route handlers (such as API endpoints) do not. The <code style={styles.codeStyle}>checkSameOrigin</code> utility enforces strict origin validation on sensitive API route handlers.
        </p>
        <p style={styles.textStyle}>
          The guard compares the request origin header against the configured BASE_URL or APP_URL. If the origin header is missing, malformed, or fails to match the expected host, the handler halts execution immediately and returns a 403 Forbidden response.
        </p>
        <div style={styles.warningBannerStyle}>
          <strong style={styles.warningBannerStrongStyle}>Exceptions and Exclusions:</strong> Origin Guard is excluded from OAuth redirect callback flows (including sign-in and sign-out endpoints). This is because the OIDC state parameter natively protects these redirect flows against CSRF, and browser origin mismatches are common during local development when navigating between different hostnames or port bindings.
        </div>
      </SectionWrap>
    </div>
  );
}
