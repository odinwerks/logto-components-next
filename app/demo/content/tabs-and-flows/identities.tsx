'use client';

import CodeBlock from '../../components/SyntaxBlock';
import { useDocStyles } from '../../components/useDocStyles';
import { SectionWrap } from '../../components/SectionComponents';

export default function IdentitiesSection() {
  const styles = useDocStyles();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <SectionWrap label="Identities Tab - props & elements">
        <p style={styles.textStyle}>
          The <code style={styles.codeStyle}>IdentitiesTab</code> component renders OIDC social provider connection states and account mapping details. It parses the identity objects stored in user credentials to display connected statuses and associated user handles.
        </p>

        <table style={styles.tableStyle}>
          <thead>
            <tr>
              <th style={{ ...styles.thStyle, width: '25%' }}>Prop</th>
              <th style={{ ...styles.thStyle, width: '25%' }}>Type</th>
              <th style={{ ...styles.thStyle, width: '50%' }}>Purpose</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.tdPropStyle}>userData</td>
              <td style={styles.tdTypeStyle}>UserData</td>
              <td style={styles.tdStyle}>
                The primary authenticated user object, containing the <code style={styles.codeSmStyle}>identities</code> record map.
              </td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>mode</td>
              <td style={styles.tdTypeStyle}>&apos;dark&apos; | &apos;light&apos;</td>
              <td style={styles.tdStyle}>
                Theme rendering mode used to style the container cards and code display block.
              </td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>colors</td>
              <td style={styles.tdTypeStyle}>ThemeColors</td>
              <td style={styles.tdStyle}>
                The active style theme color mapping object containing hex color strings.
              </td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>t</td>
              <td style={styles.tdTypeStyle}>Translations</td>
              <td style={styles.tdStyle}>
                Static key-value translations mapped to the active language locale.
              </td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>mobmode</td>
              <td style={styles.tdTypeStyle}>number?</td>
              <td style={styles.tdStyle}>
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
      </SectionWrap>

      <SectionWrap label="OIDC Social Connection Mapping">
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
      </SectionWrap>

      <SectionWrap label="Technical Rationale: Read-Only client operations">
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
      </SectionWrap>
    </div>
  );
}
