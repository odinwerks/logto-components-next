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

export default function SecuritySection() {
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
        <h2 id={slugify("Security - overview")} style={h2Style}>Security - overview</h2>
        <p style={styles.textStyle}>
          The security section represents the most complex tab of the user profile dashboard. It manages TOTP authenticators, backup recovery codes, password configurations, email/phone contacts, WebAuthn passkeys, and account purges. 
          To protect sensitive user data, all mutative operations are guarded by a verification flow that requires a password challenge or contact OTP code verification.
        </p>

        <p style={styles.textStyle}>
          The interface is segmented into five distinct functional panels (cards):
        </p>
        <ul style={{ ...styles.textStyle, paddingLeft: '20px', margin: '0 0 16px 0' }}>
          <li>
            <strong>Password Panel:</strong> Displays masked password status (represented as 12 bullet characters) and provides a trigger button to initialize the password modification workflow.
          </li>
          <li>
            <strong>Authenticator App Panel:</strong> Displays the current multi-factor authentication (MFA) state. If active, shows a status badge ("Authenticator active") alongside the creation date and the last used timestamp. Re-configuration and deletion are supported.
          </li>
          <li>
            <strong>Recovery Codes Panel:</strong> Displays backup recovery code status, showing a badge with the remaining codes count. Logto policy dictates that recovery code enrollment is disabled unless at least one other active MFA factor (TOTP or WebAuthn) is registered.
          </li>
          <li>
            <strong>Passkeys Panel:</strong> Integrates WebAuthn credentials, listing active keys with registration dates and last used timestamps. Triggers edit (rename) and delete (revoke) workflows. Displays a client-side warning if WebAuthn is unsupported by the browser.
          </li>
          <li>
            <strong>Danger Zone Panel:</strong> Houses the destructive account deletion action, isolated visually to prevent accidental triggering.
          </li>
        </ul>

        <table style={customTableStyle}>
          <thead>
            <tr>
              <th style={customThStyle}>Functional Group</th>
              <th style={customThStyle}>Prop Callbacks and Methods</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={customTdPropStyle}>Identity Verification</td>
              <td style={customTdStyle}>
                <code>onVerifyPassword</code>: Verifies current credentials and returns a verification record ID and validation timestamp.
              </td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>MFA & Authenticators</td>
              <td style={customTdStyle}>
                <code>onGetMfaVerifications</code>, <code>onGenerateTotpSecret</code>, <code>onAddMfaVerification</code>, <code>onDeleteMfaVerification</code>, <code>onReplaceTotpVerification</code>, <code>onGenerateBackupCodes</code>
              </td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>WebAuthn Passkeys</td>
              <td style={customTdStyle}>
                <code>onRequestWebAuthnRegistration</code>, <code>onVerifyAndLinkWebAuthn</code>, <code>onRenamePasskey</code>
              </td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>Account & Password</td>
              <td style={customTdStyle}>
                <code>onUpdatePassword</code>, <code>onDeleteAccount</code>
              </td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>Toasts & Feedback</td>
              <td style={customTdStyle}>
                <code>onSuccess</code>, <code>onError</code>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div>
        <h2 id={slugify("Security - FlowModal transition flows")} style={h2Style}>Security - FlowModal transition flows</h2>
        <p style={styles.textStyle}>
          The <code>FlowModal</code> is a generic multi-step overlay designed to guide users through complex security configurations using a state machine driven by a discriminated <code>ModalStep</code> union.
        </p>

        <CodeBlock title="ModalStep Discriminated Union" code={`export type ModalStep =
  | { kind: 'password' }
  | { kind: 'loading'; message: string }
  | { kind: 'code'; destination: string; verificationId: string; identityVerificationId: string }
  | { kind: 'totp-scan'; secret: string; totpUri: string; identityVerificationId: string }
  | { kind: 'new-password'; verificationRecordId: string }
  | { kind: 'rename-passkey'; verificationRecordId: string; passkeyId: string };`} />

        <p style={styles.textStyle}>
          The flow transition states operate as follows:
        </p>
        <ul style={{ ...styles.textStyle, paddingLeft: '20px', margin: '0 0 16px 0' }}>
          <li>
            <strong>password:</strong> The initial checkpoint for all mutative workflows. Users must enter their password to generate a secure <code>verificationRecordId</code>.
          </li>
          <li>
            <strong>loading:</strong> Displays a CSS spinner alongside a dynamic progress message while async background tasks communicate with the server API.
          </li>
          <li>
            <strong>code:</strong> Prompts the user to enter a 6-digit confirmation code. Displays the masked target email or phone destination.
          </li>
          <li>
            <strong>totp-scan:</strong> Displays a high-density QR code canvas and standard base32 text credentials for manually setting up authenticator apps.
          </li>
          <li>
            <strong>new-password:</strong> Shows an input field to configure a new password. The client only performs a basic presence check, while password complexity validation rules are strictly managed server-side inside <code style={styles.codeSmStyle}>password.ts</code>.
          </li>
          <li>
            <strong>rename-passkey:</strong> Displays a single text input (enforcing a maximum of 64 characters) to rename registered WebAuthn credentials.
          </li>
        </ul>

        <div style={styles.noteStyle}>
          <strong style={styles.strongNoteStyle}>BackupCodesModal:</strong> Handles backup recovery code output after successful generation. It displays codes in a structured grid, allowing users to copy them to the clipboard or download them in two distinct file formats generated on the fly via client-side Blob APIs:
          <ol style={{ margin: '8px 0 0 16px', paddingLeft: '10px' }}>
            <li><code>.txt</code> format: Plain-text list of codes separated by newline characters.</li>
            <li><code>.html</code> format: A complete, dark-themed responsive HTML document with an embedded stylesheet, grid layout, warning messages, and generation timestamp, suitable for printing or digital archiving.</li>
          </ol>
        </div>
      </div>

      <div>
        <h2 id={slugify("Security - validation rules & input guards")} style={h2Style}>Security - validation rules & input guards</h2>
        <p style={styles.textStyle}>
          The dashboard implements validation checks at the client and server trust boundaries to block injections, overflows, and malformed data.
        </p>

        <table style={customTableStyle}>
          <thead>
            <tr>
              <th style={customThStyle}>Target Field</th>
              <th style={customThStyle}>Regex Pattern / Validation Constraint</th>
              <th style={customThStyle}>Constraint Purpose</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={customTdPropStyle}>Password</td>
              <td style={customTdStyle}>Presence check; max length 256 characters</td>
              <td style={customTdStyle}>Ensures value is provided on the client. Actual password complexity validation and policy checks are managed securely server-side inside <code style={styles.codeSmStyle}>password.ts</code> to protect the verification flow.</td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>Email</td>
              <td style={customTdStyle}><code>/^[^\s@]+@[^\s@]+\.[^\s@]+$/</code>; max 128 characters</td>
              <td style={customTdStyle}>Enforces OIDC-compliant email formats and sets boundary lengths.</td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>Username</td>
              <td style={customTdStyle}><code>/^[a-zA-Z0-9_-]+$/</code>; length 3 to 32 characters</td>
              <td style={customTdStyle}>Filters out invalid symbols; prevents SQL, shell, or HTML injections.</td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>Phone</td>
              <td style={customTdStyle}><code>{"/^\\+[1-9]\\d{1,14}$/"}</code> (spaces and hyphens stripped)</td>
              <td style={customTdStyle}>Validates phone numbers against standard ITU-T E.164 recommendations.</td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>OTP Code</td>
              <td style={customTdStyle}><code>/^\d{6}$/</code></td>
              <td style={customTdStyle}>Enforces standard 6-digit numeric verification structure.</td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>Logto Identifier</td>
              <td style={customTdStyle}><code>{"/^[A-Za-z0-9_-]{1,128}$/"}</code></td>
              <td style={customTdStyle}>Validates safe Logto IDs (session IDs, verification IDs, and grant IDs) via <code>assertSafeLogtoId</code>.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div>
        <h2 id={slugify("Security - TOTP flows & MFA enrollment")} style={h2Style}>Security - TOTP flows & MFA enrollment</h2>
        <p style={styles.textStyle}>
          The time-based one-time password (MFA TOTP) enrollment lifecycle comprises five distinct phases:
        </p>
        <ol style={{ ...styles.textStyle, paddingLeft: '20px', margin: '0 0 16px 0' }}>
          <li>
            <strong>Identity Verification:</strong> The user enters their password. The system calls <code>onVerifyPassword</code>, which returns a verification token.
          </li>
          <li>
            <strong>Secret Generation:</strong> The client triggers <code>onGenerateTotpSecret</code>, instructing the server to query the Logto Management API. The server returns a secure base32-encoded cryptographic secret.
          </li>
          <li>
            <strong>QR Code Construction:</strong> The client reads the <code>MFA_ISSUER</code> environment variable (defaulting to "Logto") to construct a standard Key URI format. This URI is rendered as a vector-based graphic via <code>QRCodeSVG</code> inside a 152px white canvas frame:
            <br />
            <code>otpauth://totp/ISSUER:ACCOUNT?secret=SECRET&issuer=ISSUER</code>
          </li>
          <li>
            <strong>Interval Verification:</strong> The user scans the QR code or copies the blurred cryptographic secret key (which is hidden for privacy until toggled), generating 6-digit verification codes at 30-second intervals on their authenticator device.
          </li>
          <li>
            <strong>Atomic Activation:</strong> The user enters the code. If a TOTP factor already exists, the client calls <code>onReplaceTotpVerification</code>, leveraging Logto's atomic PUT endpoint. This atomic swap replaces the secret without a period where MFA is disabled, avoiding security vulnerabilities. If no factor exists, the client registers it using <code>onAddMfaVerification</code>.
          </li>
        </ol>

        <CodeBlock title="MFA TOTP Replacement Code" code={`// Atomic swap to prevent MFA-disabled vulnerability windows
const r = await onReplaceTotpVerification(
  secret, 
  code, 
  identityVerificationRecordId
);
if (r.ok) {
  onSuccess(t.mfa.totpEnrolled);
  await refreshMfaList();
}`} />
      </div>

      <div>
        <h2 id={slugify("Security - WebAuthn & passkeys")} style={h2Style}>Security - WebAuthn & passkeys</h2>
        <p style={styles.textStyle}>
          The dashboard supports WebAuthn Passkeys, enabling users to register biometric or hardware credentials (such as Touch ID, Windows Hello, or YubiKeys) for secure, passwordless authentication.
        </p>

        <p style={styles.textStyle}>
          The WebAuthn lifecycle is structured into distinct registration, verification, and revocation phases:
        </p>

        <ul style={{ ...styles.textStyle, paddingLeft: '20px', margin: '0 0 16px 0' }}>
          <li>
            <strong>Capability Detection:</strong> The dashboard utilizes the client-side check <code>browserSupportsWebAuthn()</code> from <code>@simplewebauthn/browser</code> on mount. If WebAuthn is unsupported, the trigger buttons are deactivated, and a warning is shown.
          </li>
          <li>
            <strong>Dynamic Imports:</strong> To avoid Next.js node-server SSR compilation errors and browser hydration mismatches, the <code>@simplewebauthn/browser</code> package is imported dynamically inside the action trigger handlers.
          </li>
          <li>
            <strong>WebAuthn Ceremony:</strong>
            <ol style={{ margin: '8px 0 0 16px', paddingLeft: '10px' }}>
              <li>User completes the initial password check.</li>
              <li>The client calls <code>onRequestWebAuthnRegistration</code>, receiving a set of server-derived <code>PublicKeyCredentialCreationOptions</code> and a verification ID.</li>
              <li>The browser launches the native system prompt via <code>{"startRegistration({ optionsJSON: registrationOptions })"}</code>.</li>
              <li>If the user cancels the prompt, the system catches the browser-level <code>NotAllowedError</code> or "not allowed" exception and dismisses the modal silently, preventing false-positive error toasts.</li>
            </ol>
          </li>
          <li>
            <strong>Server-Side Linking:</strong> The cryptographic response payload generated by the browser is sent to the backend via <code>onVerifyAndLinkWebAuthn</code> to verify signatures and record the public key credential under the user profile.
          </li>
          <li>
            <strong>Revocation and Management:</strong> Users can rename credentials (enforcing a 64-character ceiling) via <code>onRenamePasskey</code>, or revoke (delete) them using <code>onDeleteMfaVerification</code>.
          </li>
        </ul>

        <CodeBlock title="Passkey Registration Flow" code={`// Dynamic loading and ceremony execution
const { startRegistration } = await import('@simplewebauthn/browser');

const optionsResult = await onRequestWebAuthnRegistration();
const { registrationOptions, verificationRecordId } = optionsResult.data;

try {
  const credential = await startRegistration({ 
    optionsJSON: registrationOptions 
  });
  
  await onVerifyAndLinkWebAuthn(
    credential, 
    verificationRecordId, 
    identityVerificationRecordId
  );
  onSuccess(t.mfa.passkeyAdded);
} catch (err) {
  if (err instanceof Error && (err.name === 'NotAllowedError' || err.message.includes('not allowed'))) {
    // User cancelled the prompt. Dismiss silently.
    return;
  }
  onError(captureMessage(err));
}`} />
      </div>

      <div>
        <h2 id={slugify("Security - Identity Verification & Account Deletion")} style={h2Style}>Security - Identity Verification & Account Deletion</h2>
        <p style={styles.textStyle}>
          Account purges are irreversible, destructive actions. To prevent malicious or accidental account deletions, the system implements a strict, multi-layered verification and clean-up sequence.
        </p>

        <ol style={{ ...styles.textStyle, paddingLeft: '20px', margin: '0 0 16px 0' }}>
          <li>
            <strong>Password Verification:</strong> The user completes the password challenge. The backend returns a <code>verificationRecordId</code> alongside a <code>verificationTimestamp</code>.
          </li>
          <li>
            <strong>Expiration Guards:</strong> The server action <code>onDeleteAccount</code> verifies that the verification token is still valid. It checks the current time against the <code>verificationTimestamp</code> (mapping to Logto's internal <code>expiresAt</code> threshold) to confirm that the operation is executed within a secure, short-lived window.
          </li>
          <li>
            <strong>customData Whitelisting and Merging:</strong>
            To defend against mass-assignment vulnerabilities where malicious payloads overwrite configuration parameters, the utility <code>pickPreferences()</code> validates and whitelists incoming <code>customData</code>:
            <ul style={{ margin: '8px 0 0 16px', paddingLeft: '10px' }}>
              <li><code>asOrg</code>: Whitelists active organization selections, validating values against a safe OIDC identifier regex.</li>
              <li><code>theme</code>: Validates that values are strictly equal to "light" or "dark".</li>
              <li><code>lang</code>: Restricts language strings to standard format tags matching <code>{"/^[A-Za-z0-9_-]{1,16}$/"}</code>.</li>
            </ul>
            During updates, the system uses <code>updateUserCustomData</code> with a locking mechanism (<code>customDataUpdateLocks</code> capped at 1000 records to prevent memory leaks) to perform a shallow merge under the <code>Preferences</code> key. This preserves other applications' top-level customData keys on the same Logto tenant.
          </li>
          <li>
            <strong>Session Redirection:</strong> After successfully deleting the account, the dashboard avoids Next.js router loops or stale state bugs by executing a full-page redirection via <code>window.location.href = '/'</code> (instead of <code>router.push</code>) after a configurable cooldown period (read from the <code>DELETE_REDIRECT_DELAY</code> environment variable, falling back to 3000ms). This cleanly purges browser memory and terminates active sessions.
          </li>
        </ol>

        <CodeBlock title="Destructive Account Deletion and Purge" code={`// Verification and purge flow
const identityResult = await onVerifyPassword(pw);
if (!identityResult.ok) {
  onError(identityResult.error);
  return;
}

const deleteResult = await onDeleteAccount(
  identityResult.data.verificationRecordId,
  identityResult.data.verificationTimestamp
);
if (!deleteResult.ok) {
  onError(deleteResult.error);
  return;
}

onSuccess(t.security.accountDeleted);

// Force full client reload to prevent AuthWatcher race loops
setTimeout(() => {
  window.location.href = '/';
}, DELETE_REDIRECT_DELAY);`} />
      </div>

      <div>
        <h2 id={slugify("Security - ContactRow")} style={h2Style}>Security - ContactRow</h2>
        <p style={styles.textStyle}>
          Reusable component for email/phone management. Each row handles its own
          modal flow independently.
        </p>
        <CodeBlock title="Edit email flow" code={`// 1. Password verification
const identity = await onVerifyPassword(pw);
// 2. Send verification code to new email
const { verificationId } = await onSendEmailVerification(newEmail);
// 3. User enters code
const codeVer = await onVerifyCode('email', newEmail, verificationId, code);
// 4. Update email with both verification IDs
await onUpdateEmail(newEmail, codeVer.verificationRecordId, identity.verificationRecordId);`} />
        <CodeBlock title="Remove email flow" code={`// 1. Password verification
const identity = await onVerifyPassword(pw);
// 2. Remove email
await onRemoveEmail(identity.verificationRecordId);`} />
      </div>

      <div>
        <h2 id={slugify("Grant management")} style={h2Style}>Grant management</h2>
        <p style={styles.textStyle}>
          OAuth 2.0 grant (token) management. Grants authorize apps to act on behalf
          of the user. Revoking a grant forces the app to re-authenticate.
        </p>
        <CodeBlock title="Server actions" code={`// Get all active grants for the user
const grants = await getUserGrants(identityVerificationRecordId); // returns DataResult<GrantInfo[]>

// Revoke all grants for a specific application
await revokeUserGrant(grantId, identityVerificationRecordId); // returns ActionResult

// revokeGrantsTarget controls scope:
//   'all'         → revoke grants for ALL applications
//   'firstParty'  → revoke grants for first-party apps only`} />
        <div style={styles.noteStyle}>
          <strong style={styles.strongNoteStyle}>Use case:</strong> If a user suspects a third-party app has been compromised, they can revoke
          its grant without affecting other authorized apps.
        </div>
      </div>
    </div>
  );
}
