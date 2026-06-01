'use client';

import { useDocStyles } from '../../components/useDocStyles';
import CodeBlock from '../../components/SyntaxBlock';
import { SectionWrap } from '../../components/SectionComponents';

export default function EnvSetup() {
  const styles = useDocStyles();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <SectionWrap label="ENV Setup">
        <p style={styles.textStyle}>
          Create a local environment variables file by copying the template file from the repository root:
        </p>
        <CodeBlock title="Create .env" code={`cp .env.example .env`} />
        <p style={styles.textStyle}>
          Fill in the core variables required for fundamental OIDC client operations.
        </p>
      </SectionWrap>

      <SectionWrap label="Core Variables Reference">
        <table style={styles.tableStyle}>
          <thead>
            <tr>
              <th style={{ ...styles.thStyle, width: '30%' }}>Variable</th>
              <th style={{ ...styles.thStyle, width: '70%' }}>Where to get it & Developer Instructions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.tdPathStyle}>APP_ID</td>
              <td style={styles.tdStyle}>
                Logto Console → Applications → your app → <strong>App ID</strong>. Identifies your Next.js application client.
              </td>
            </tr>
            <tr>
              <td style={styles.tdPathStyle}>APP_SECRET</td>
              <td style={styles.tdStyle}>
                Same page → <strong>App Secret</strong>. Confidential key used server-side for the authorization code exchange flow.
              </td>
            </tr>
            <tr>
              <td style={styles.tdPathStyle}>ENDPOINT</td>
              <td style={styles.tdStyle}>
                Your Logto tenant URL (must exclude trailing slash, e.g., <code style={styles.codeSmStyle}>https://your-tenant.logto.app</code>).
              </td>
            </tr>
            <tr>
              <td style={styles.tdPathStyle}>BASE_URL</td>
              <td style={styles.tdStyle}>
                Your application's root URL (e.g., <code style={styles.codeSmStyle}>http://localhost:3000</code>). Used to validate redirect URIs.
              </td>
            </tr>
            <tr>
              <td style={styles.tdPathStyle}>COOKIE_SECRET</td>
              <td style={styles.tdStyle}>
                A random, cryptographically secure 32-character string. Used to sign and encrypt session cookies.
                <br />Generate on Linux/macOS: <code style={styles.codeSmStyle}>openssl rand -hex 32</code>
              </td>
            </tr>
            <tr>
              <td style={styles.tdPathStyle}>SCOPES</td>
              <td style={styles.tdStyle}>
                The OpenID Connect scopes to request during authentication (see scopes configuration below).
              </td>
            </tr>
          </tbody>
        </table>
      </SectionWrap>

      <SectionWrap label="Scopes Configuration">
        <p style={styles.textStyle}>
          Scopes determine the claims contained in the returned ID token and specify the user attributes your application has access to.
        </p>
        <CodeBlock title="OIDC Scopes Options" code={`# Minimum Scopes (Includes Session Management support)
SCOPES=openid,profile,custom_data,email,phone,identities,sessions

# Extended Scopes (Enables Multi-tenant / Organizations features)
SCOPES=openid,profile,custom_data,email,phone,identities,sessions,organizations

# Note: The custom environment parser accepts both comma and newline delimiters.`} />
      </SectionWrap>

      <SectionWrap label="Feature-Specific Adjustments">
        <p style={styles.textStyle}>
          Use these variables to unlock or configure advanced features of the Logto Kit.
        </p>
        <CodeBlock title="Feature & Debug variables" code={`# - M2M Integration (Required for account deletion and RBAC querying) -
LOGTO_M2M_APP_ID=         # Machine-to-Machine app ID from Logto Console
LOGTO_M2M_APP_SECRET=     # Machine-to-Machine client secret
LOGTO_INTROSPECTION_URL=  # Optional: Token introspection endpoint

# - Avatar Storage Provider -
PFP_BACKEND=s3           # Storage backend: s3 (default) | logto

# - Preference Fallbacks -
NAME_TYPE=given_family    # Display format: given_family | full | username
DEFAULT_THEME_MODE=dark   # Default visual state: dark | light

# - Multi-Factor Authentication (MFA) -
MFA_ISSUER=MyApp          # Issuer name displayed in user's authenticator app

# - Security & Delay Controls -
DELETE_REDIRECT_DELAY=3000 # Delay (ms) before redirecting client after deleting account

# - Developer Diagnostics -
DEBUG=                    # Set to 'true' to enable verbose terminal server logging
PLAIN_ERRORS=false        # Set to 'true' to receive unmasked error messages on the client
LOGTO_DANGER_EXPOSE_TOKEN=false  # ⚠️ Set to 'true' to expose access token in the Dev tab (NEVER enable in production)
LOG_BACKEND=both          # Logging output destinations: console | pino | both`} />
      </SectionWrap>
    </div>
  );
}
