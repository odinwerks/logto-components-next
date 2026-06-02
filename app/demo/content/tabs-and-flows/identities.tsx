'use client';

import CodeBlock from '../../components/SyntaxBlock';
import { useDocStyles } from '../../components/useDocStyles';
import { useThemeMode } from '../../../logto-kit/components/providers/preferences';

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

export default function IdentitiesSection() {
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
      <div>
        <h2 id={slugify("Identities Tab - props & elements")} style={h2Style}>Identities Tab - props & elements</h2>
        <p style={styles.textStyle}>
          The <code style={styles.codeStyle}>IdentitiesTab</code> component renders OIDC social provider connection states and account mapping details. It parses the identity objects stored in user credentials to display connected statuses and associated user handles.
        </p>

        <table style={customTableStyle}>
          <thead>
            <tr>
              <th style={{ ...customThStyle, width: '25%' }}>Prop</th>
              <th style={{ ...customThStyle, width: '25%' }}>Type</th>
              <th style={{ ...customThStyle, width: '50%' }}>Purpose</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={customTdPropStyle}>userData</td>
              <td style={customTdStyle}>UserData</td>
              <td style={customTdStyle}>
                The primary authenticated user object, containing the <code style={styles.codeSmStyle}>identities</code> record map.
              </td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>mode</td>
              <td style={customTdStyle}>&apos;dark&apos; | &apos;light&apos;</td>
              <td style={customTdStyle}>
                Theme rendering mode used to style the container cards and code display block.
              </td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>colors</td>
              <td style={customTdStyle}>ThemeColors</td>
              <td style={customTdStyle}>
                The active style theme color mapping object containing hex color strings.
              </td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>t</td>
              <td style={customTdStyle}>Translations</td>
              <td style={customTdStyle}>
                Static key-value translations mapped to the active language locale.
              </td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>mobmode</td>
              <td style={customTdStyle}>number?</td>
              <td style={customTdStyle}>
                Optional responsive design indicator where 1 signals mobile screen dimensions to shrink font and spacing scales.
              </td>
            </tr>
          </tbody>
        </table>

        <h4 style={{ ...styles.textStyle, fontWeight: 600, marginTop: '16px', marginBottom: '8px' }}>
          UI Elements & Presentation layer
        </h4>
        <p style={styles.textStyle}>
          The component UI is structured into three main visual blocks:
        </p>
        <ul style={{ ...styles.textStyle, paddingLeft: '20px', listStyleType: 'disc' }}>
          <li style={{ marginBottom: '6px' }}>
            <strong>Description Paragraph:</strong> Renders the target locale string <code style={styles.codeSmStyle}>t.identities.description</code> informing users about external authentication providers.
          </li>
          <li style={{ marginBottom: '6px' }}>
            <strong>Linked Accounts List Card:</strong> Displays a list of connected OIDC social providers. When no providers are connected, it defaults to displaying an empty state card rendering <code style={styles.codeSmStyle}>t.identities.noIdentities</code>.
          </li>
          <li style={{ marginBottom: '6px' }}>
            <strong>Raw JSON Viewer:</strong> Renders the full structured <code style={styles.codeSmStyle}>userData.identities</code> record map inside a formatted <code style={styles.codeSmStyle}>CodeBlock</code> container labeled by <code style={styles.codeSmStyle}>t.identities.rawHeading</code>.
          </li>
        </ul>

        <h4 style={{ ...styles.textStyle, fontWeight: 600, marginTop: '16px', marginBottom: '8px' }}>
          Visual Connection Badges & Icon mapping
        </h4>
        <p style={styles.textStyle}>
          Each connected account entry displays a visualization of its social source:
        </p>
        <ul style={{ ...styles.textStyle, paddingLeft: '20px', listStyleType: 'disc' }}>
          <li style={{ marginBottom: '6px' }}>
            <strong>Provider Icon Component:</strong> Maps the connector identifier to an inline SVG layout. Built-in vector icons are mapped for Google, GitHub, Discord, Facebook, Twitter (X), Apple, Microsoft, and LinkedIn. If an unmapped provider is returned, the layout displays the first letter of its key in uppercase as a fallback.
          </li>
          <li style={{ marginBottom: '6px' }}>
            <strong>Connection Status Badge:</strong> Displays a success green badge with a checkmark icon beside the provider name, using the translation key <code style={styles.codeSmStyle}>t.identities.connected</code>.
          </li>
          <li style={{ marginBottom: '6px' }}>
            <strong>User Identifier Chip:</strong> If an external user ID (<code style={styles.codeSmStyle}>userId</code>) is supplied by the social connection, it renders a monospace badge showing the raw string.
          </li>
        </ul>
      </div>

      <div>
        <h2 id={slugify("OIDC Social Connection Mapping")} style={h2Style}>OIDC Social Connection Mapping</h2>
        <p style={styles.textStyle}>
          Logto integrates with social identity providers (IDPs) utilizing the OpenID Connect (OIDC) or OAuth 2.0 standards. Connected account attributes are parsed and formatted into consistent profile structures.
        </p>

        <h4 style={{ ...styles.textStyle, fontWeight: 600, marginTop: '16px', marginBottom: '8px' }}>
          Profile Synchronization and Detail parsing
        </h4>
        <p style={styles.textStyle}>
          During a successful social login handshake, Logto retrieves user claims and populates the details envelope. The UI parses this information using the <code style={styles.codeSmStyle}>identityDetail</code> helper, checking fields in a prioritized order:
        </p>
        <ol style={{ ...styles.textStyle, paddingLeft: '20px', listStyleType: 'decimal' }}>
          <li style={{ marginBottom: '6px' }}>
            <strong>details.email:</strong> Resolves the primary email claim (e.g., Google or Microsoft email).
          </li>
          <li style={{ marginBottom: '6px' }}>
            <strong>details.username:</strong> Resolves the unique nickname or handle of the social account.
          </li>
          <li style={{ marginBottom: '6px' }}>
            <strong>details.name:</strong> Resolves the display name or full name of the user profile.
          </li>
          <li style={{ marginBottom: '6px' }}>
            <strong>details.login:</strong> Resolves standard login handles (e.g., GitHub login names).
          </li>
          <li style={{ marginBottom: '6px' }}>
            <strong>Fallback string:</strong> If no detail field is populated, the helper returns the external social user ID wrapped in the <code style={styles.codeSmStyle}>t.identities.idWithUserId</code> template. If even that is unavailable, it returns a localized fallback string.
          </li>
        </ol>

        <h4 style={{ ...styles.textStyle, fontWeight: 600, marginTop: '16px', marginBottom: '8px' }}>
          Social User ID Mapping
        </h4>
        <p style={styles.textStyle}>
          The <code style={styles.codeStyle}>userId</code> field inside each connection entry represents the persistent, unique ID provided by the external identity provider (IdP). This ID is mapped to the user profile under Logto database fields. This unique identifier remains unchanged, guaranteeing that even if the user updates their email or username on the social provider platform, the link to their Logto account is retained.
        </p>

        <h4 style={{ ...styles.textStyle, fontWeight: 600, marginTop: '16px', marginBottom: '8px' }}>
          OIDC Claims Syncing & Timestamps
        </h4>
        <p style={styles.textStyle}>
          Logto connector configurations allow administrative settings to sync social user profiles automatically on every login. During the OAuth callback loop:
        </p>
        <ul style={{ ...styles.textStyle, paddingLeft: '20px', listStyleType: 'disc' }}>
          <li style={{ marginBottom: '6px' }}>
            Logto receives the ID token, parses its OIDC claims, and maps standard profile fields (such as picture, email, or locale) to the primary Logto profile.
          </li>
          <li style={{ marginBottom: '6px' }}>
            A login timestamp is recorded in the standard <code style={styles.codeSmStyle}>lastSignInAt</code> and <code style={styles.codeSmStyle}>updatedAt</code> properties, tracking the date and time when the external identity provider verified the session.
          </li>
        </ul>

        <CodeBlock
          title="Data Structure Schema Mapping"
          code={`interface IdentityEntry {
  userId: string;       // Unique external provider persistent user ID
  details?: {           // OIDC synced claim properties
    email?: string;     // Synced primary email from social provider
    username?: string;  // Account handle or nickname
    name?: string;      // Profile display name
    login?: string;     // Connector login handle (e.g. GitHub login)
    avatar?: string;    // Synced profile picture link
    [key: string]: unknown;
  };
}`}
        />
      </div>

      <div>
        <h2 id={slugify("Technical Rationale: Read-Only client operations")} style={h2Style}>Technical Rationale: Read-Only client operations</h2>
        <p style={styles.textStyle}>
          Unlike profile fields or contact records which can be edited or modified directly from the dashboard via Server Actions, the social identities list is strictly read-only within the client interface.
        </p>

        <div style={styles.warningBannerStyle}>
          <strong style={styles.warningBannerStrongStyle}>Session Cryptographic Security & Identity Integrity:</strong>
          <br />
          To prevent account takeover, session fixation, and token-substitution attacks, linking or unlinking social identity providers must be performed exclusively within the context of a hosted prompt on Logto. Doing so ensures cryptographic session integrity through several security protocols:
        </div>

        <ul style={{ ...styles.textStyle, paddingLeft: '20px', listStyleType: 'disc' }}>
          <li style={{ marginBottom: '8px' }}>
            <strong>Cryptographic State Validation:</strong> Initiating or removing an IDP link requires exchanging OAuth authorization codes. This process relies on a cryptographically signed and verified <code style={styles.codeSmStyle}>state</code> parameter, along with PKCE (Proof Key for Code Exchange) code verifiers, to prevent Cross-Site Request Forgery (CSRF).
          </li>
          <li style={{ marginBottom: '8px' }}>
            <strong>Primary Identity Provider Prompt:</strong> Any change to social identities must be requested directly via the primary Logto Identity Provider prompt. This redirects the user to the Logto domain, validates their current active session with multi-factor authentication (MFA) if configured, and prompts them for authorization. This ensures that the user cannot bypass security rules.
          </li>
          <li style={{ marginBottom: '8px' }}>
            <strong>Scope and Claim Safeguards:</strong> A client-side application cannot unilaterally alter the account mappings in the database. Social connections map directly to standard and custom OIDC scopes granted by the issuer. Modifying these records requires administrative or high-privilege access keys, which are restricted to the Logto server backend and cannot be exposed to the client.
          </li>
        </ul>
      </div>
    </div>
  );
}
