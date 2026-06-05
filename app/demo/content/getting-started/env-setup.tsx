'use client';

import { useDocStyles } from '../../components/useDocStyles';
import CodeBlock from '../../components/SyntaxBlock';
import { useThemeMode } from '../../../logto-kit/components/providers/preferences';
import { slugify } from '../../components/SectionComponents';

export default function EnvSetup() {
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

  const customTdPathStyle: React.CSSProperties = {
    ...customTdStyle,
    color: isDark ? '#9cdcdb' : '#0369a1',
    fontFamily: "'IBM Plex Mono', monospace",
    fontWeight: 600,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <h2 id={slugify("ENV Setup")} style={{ ...h2Style, marginTop: 0 }}>ENV Setup</h2>
      
      <p style={styles.textStyle}>
        Create a local environment variables file by copying the template file from the repository root:
      </p>
      
      <CodeBlock title="Create .env" code={`cp .env.example .env`} />
      
      <p style={styles.textStyle}>
        Fill in the core variables required for fundamental OIDC client operations.
      </p>
      
      <div style={{ ...styles.noteStyle, marginTop: '16px' }}>
        <strong style={styles.strongNoteStyle}>Pre-Dev Hook behavior:</strong> The <code style={styles.codeSmStyle}>scripts/inject-next-public.js</code> script automatically runs during the pre-dev hook. It parses the <code style={styles.codeSmStyle}>.env</code> file, extracts variables, and writes their public equivalents (prefixed with <code style={styles.codeSmStyle}>NEXT_PUBLIC_</code>) to <code style={styles.codeSmStyle}>.env.local</code>. This eliminates the need to manually duplicate environment variables for client-side usage.
      </div>

      <h2 id={slugify("Core Variables Reference")} style={h2Style}>Core Variables Reference</h2>
      
      <table style={customTableStyle}>
        <thead>
          <tr>
            <th style={{ ...customThStyle, width: '30%' }}>Variable</th>
            <th style={{ ...customThStyle, width: '70%' }}>Where to get it & Developer Instructions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={customTdPathStyle}>APP_ID</td>
            <td style={customTdStyle}>
              Logto Console → Applications → your app → <strong>App ID</strong>. Identifies your Next.js application client.
            </td>
          </tr>
          <tr>
            <td style={customTdPathStyle}>APP_SECRET</td>
            <td style={customTdStyle}>
              Same page → <strong>App Secret</strong>. Confidential key used server-side for the authorization code exchange flow.
            </td>
          </tr>
          <tr>
            <td style={customTdPathStyle}>ENDPOINT</td>
            <td style={customTdStyle}>
              Your Logto tenant URL (must exclude trailing slash, e.g., <code style={styles.codeSmStyle}>https://your-tenant.logto.app</code>).
            </td>
          </tr>
          <tr>
            <td style={customTdPathStyle}>BASE_URL</td>
            <td style={customTdStyle}>
              Your application's root URL (e.g., <code style={styles.codeSmStyle}>http://localhost:3000</code>). Used to validate redirect URIs.
            </td>
          </tr>
          <tr>
            <td style={customTdPathStyle}>COOKIE_SECRET</td>
            <td style={customTdStyle}>
              A random, cryptographically secure 32-character string. Used to sign and encrypt session cookies.
              <br />Generate on Linux/macOS: <code style={styles.codeSmStyle}>openssl rand -hex 32</code>
            </td>
          </tr>
          <tr>
            <td style={customTdPathStyle}>SCOPES</td>
            <td style={customTdStyle}>
              The OpenID Connect scopes to request during authentication (see scopes configuration below).
            </td>
          </tr>
          <tr>
            <td style={customTdPathStyle}>APP_URL</td>
            <td style={customTdStyle}>
              Alternative fallback for BASE_URL (primarily used for origin-guard validation and development environment compatibility check).
            </td>
          </tr>
          <tr>
            <td style={customTdPathStyle}>LOGTO_M2M_RESOURCE</td>
            <td style={customTdStyle}>
              Audience resource indicator for the Machine-to-Machine client credentials grant. Defaults to 'https://default.logto.app/api' for Logto OSS.
            </td>
          </tr>
          <tr>
            <td style={customTdPathStyle}>BACKEND_TYPE</td>
            <td style={customTdStyle}>
              Backend capability mode. Values: <code style={styles.codeSmStyle}>blacktop</code> (custom fork features enabled) or <code style={styles.codeSmStyle}>upstream</code> (stock Logto compatibility mode). Server default is <code style={styles.codeSmStyle}>upstream</code> if unset or invalid.
            </td>
          </tr>
        </tbody>
      </table>

      <h2 id={slugify("Scopes Configuration")} style={h2Style}>Scopes Configuration</h2>
      
      <p style={styles.textStyle}>
        Scopes determine the claims contained in the returned ID token and specify the user attributes your application has access to.
      </p>
      
      <CodeBlock title="OIDC Scopes Options" code={`# Minimum Scopes (Includes Session Management support)
SCOPES=openid,profile,custom_data,email,phone,identities,sessions

# Extended Scopes (Enables Multi-tenant / Organizations features)
SCOPES=openid,profile,custom_data,email,phone,identities,sessions,organizations,organization_roles

# Note: The custom environment parser accepts both comma and newline delimiters.`} />

      <h2 id={slugify("Feature-Specific Adjustments")} style={h2Style}>Feature-Specific Adjustments</h2>
      
      <p style={styles.textStyle}>
        Use these variables to enable or configure advanced features of the Logto Kit.
      </p>
      
      <CodeBlock title="Feature & Debug variables" code={`# - M2M Integration (Required for account deletion and RBAC querying) -
LOGTO_M2M_APP_ID=         # Machine-to-Machine app ID from Logto Console
LOGTO_M2M_APP_SECRET=     # Machine-to-Machine client secret
LOGTO_INTROSPECTION_URL=  # Optional: Token introspection endpoint

# - Backend Selection -
BACKEND_TYPE=upstream      # Backend mode: blacktop | upstream (server default: upstream)

# - Avatar Storage Provider -
PFP_BACKEND=s3           # When BACKEND_TYPE=blacktop: s3 | logto. When upstream: effective backend is always s3.

# - Preference Fallbacks -
NAME_TYPE=given_family    # Display format: given_family | full | username
DEFAULT_THEME_MODE=dark   # Default visual state: dark | light

# - Multi-Factor Authentication (MFA) -
MFA_ISSUER=MyApp          # Issuer name displayed in user's authenticator app

# - Phone Country Code Filtering (mutually exclusive) -
COUNTRY_CODE_ALLOW_LIST=   # Comma-separated allowed dial codes (e.g., 1,995,380)
COUNTRY_CODE_BLOCK_LIST=   # Comma-separated blocked dial codes (e.g., 7,86)

# - Security & Delay Controls -
DELETE_REDIRECT_DELAY=3000 # Delay (ms) before redirecting client after deleting account

# - Developer Diagnostics -
DEBUG=                    # Set to 'true' to enable verbose terminal server logging
PLAIN_ERRORS=false        # Set to 'true' to receive unmasked error messages on the client
LOGTO_DANGER_EXPOSE_TOKEN=false  # ⚠️ Set to 'true' to expose access token in the Dev tab (NEVER enable in production)
LOG_BACKEND=both          # Logging output destinations: console | pino | both

# - Pino Telemetry & Logging -
LOG_LEVEL=info            # Minimum severity log filter: debug | info | warn | error
LOGGING_WEBHOOK_URL=      # Slack or Discord webhook target for error log telemetry`} />

      <div style={{ ...styles.noteStyle, marginTop: '16px' }}>
        <strong style={styles.strongNoteStyle}>Docker note:</strong> For consistent backend behavior in containers, pass <code style={styles.codeSmStyle}>BACKEND_TYPE</code>, <code style={styles.codeSmStyle}>PFP_BACKEND</code>, and country filter vars at runtime, and pass <code style={styles.codeSmStyle}>NEXT_PUBLIC_BACKEND_TYPE</code> at build time.
      </div>

      <p style={{ ...styles.textStyle, marginTop: '24px' }}>
        <strong>Feature-Specific Variables Reference:</strong>
      </p>
      
      <table style={customTableStyle}>
        <thead>
          <tr>
            <th style={{ ...customThStyle, width: '30%' }}>Variable</th>
            <th style={{ ...customThStyle, width: '70%' }}>Description & Supported Values</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={customTdPathStyle}>THEME</td>
            <td style={customTdStyle}>
              The directory name of the active custom theme layout folder (defaults to <code style={styles.codeSmStyle}>Default</code>).
            </td>
          </tr>
          <tr>
            <td style={customTdPathStyle}>USER_SHAPE</td>
            <td style={customTdStyle}>
              The visual shape profiles applied to user avatars. Supported values: <code style={styles.codeSmStyle}>circle</code>, <code style={styles.codeSmStyle}>sq</code> (square), <code style={styles.codeSmStyle}>rsq</code> (rounded square), or any valid CSS border-radius value (e.g. <code style={styles.codeSmStyle}>4px</code> or <code style={styles.codeSmStyle}>0.5rem</code>).
            </td>
          </tr>
          <tr>
            <td style={customTdPathStyle}>LANG_MAIN</td>
            <td style={customTdStyle}>
              The primary baseline locale used as the default fallback for translation resolution (e.g., <code style={styles.codeSmStyle}>en-US</code>).
            </td>
          </tr>
          <tr>
            <td style={customTdPathStyle}>LANG_AVAILABLE</td>
            <td style={customTdStyle}>
              A comma-separated array list of all registered locale codes permitted for active user-switching selection (e.g. <code style={styles.codeSmStyle}>en-US,ka-GE,uk-UA</code>).
            </td>
          </tr>
          <tr>
            <td style={customTdPathStyle}>LOAD_TABS</td>
            <td style={customTdStyle}>
              A comma-separated, ordered sequence list of dashboard tabs to actively load and render. Supported tokens: <code style={styles.codeSmStyle}>profile</code>, <code style={styles.codeSmStyle}>preferences</code>, <code style={styles.codeSmStyle}>security</code>, <code style={styles.codeSmStyle}>sessions</code>, <code style={styles.codeSmStyle}>organizations</code>, <code style={styles.codeSmStyle}>identities</code>, <code style={styles.codeSmStyle}>dev</code>.
            </td>
          </tr>
          <tr>
            <td style={customTdPathStyle}>COUNTRY_CODE_ALLOW_LIST</td>
            <td style={customTdStyle}>
              Comma-separated list of allowed dial codes (e.g., <code style={styles.codeSmStyle}>1,995,380</code>). If set, only these codes are accepted. If both allow and block lists are set, allow list takes priority.
            </td>
          </tr>
          <tr>
            <td style={customTdPathStyle}>COUNTRY_CODE_BLOCK_LIST</td>
            <td style={customTdStyle}>
              Comma-separated list of blocked dial codes (e.g., <code style={styles.codeSmStyle}>7,86</code>). Used only when allow list is not set. If neither list is set, fallback allow list is <code style={styles.codeSmStyle}>1,995</code>.
            </td>
          </tr>
        </tbody>
      </table>

      <div style={{ ...styles.noteStyle, marginTop: '16px' }}>
        S3 or Supabase variables (e.g. <code style={styles.codeSmStyle}>S3_ENDPOINT</code>, <code style={styles.codeSmStyle}>SUPABASE_SERVICE_ROLE_KEY</code>) are used to configure Profile Picture Uploads. See the Avatar Upload section for full details.
      </div>
    </div>
  );
}
