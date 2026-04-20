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
// Page 1: Overview + Profile
// ═══════════════════════════════════════════════════════════════════════════════

function OverviewSection() {
  return (
    <SectionWrap label="Tab overview">
      <p style={textStyle}>
        The Dashboard renders tabs based on the <code style={codeStyle}>LOAD_TABS</code>{' '}
        env var. <code style={codeStyle}>DashboardClient</code> maintains{' '}
        <code style={codeStyle}>activeTab</code> state and conditionally renders
        each tab component.
      </p>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Tab</th>
            <th style={thStyle}>Props</th>
            <th style={thStyle}>Hooks</th>
            <th style={thStyle}>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdPathStyle}>Profile</td>
            <td style={tdStyle}>9</td>
            <td style={tdStyle}>useAvatarUpload</td>
            <td style={tdStyle}>3</td>
          </tr>
          <tr>
            <td style={tdPathStyle}>Preferences</td>
            <td style={tdStyle}>3</td>
            <td style={tdStyle}>useThemeMode, useLangMode</td>
            <td style={tdStyle}>0 (via context)</td>
          </tr>
          <tr>
            <td style={tdPathStyle}>Security</td>
            <td style={tdStyle}>20</td>
            <td style={tdStyle}>—</td>
            <td style={tdStyle}>15</td>
          </tr>
          <tr>
            <td style={tdPathStyle}>Sessions</td>
            <td style={tdStyle}>8</td>
            <td style={tdStyle}>—</td>
            <td style={tdStyle}>3</td>
          </tr>
          <tr>
            <td style={tdPathStyle}>Identities</td>
            <td style={tdStyle}>3</td>
            <td style={tdStyle}>—</td>
            <td style={tdStyle}>0</td>
          </tr>
          <tr>
            <td style={tdPathStyle}>Organizations</td>
            <td style={tdStyle}>4</td>
            <td style={tdStyle}>useOrgMode</td>
            <td style={tdStyle}>1</td>
          </tr>
          <tr>
            <td style={tdPathStyle}>Dev</td>
            <td style={tdStyle}>4</td>
            <td style={tdStyle}>—</td>
            <td style={tdStyle}>0</td>
          </tr>
        </tbody>
      </table>
      <CodeBlock title="LOAD_TABS" code={`# Show all tabs (default)
LOAD_TABS=

# Show specific tabs
LOAD_TABS=profile,preferences,mfa,organizations`} />
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Wiring:</strong>{' '}
        <code style={codeSmStyle}>DashboardClient</code> receives 19 server action callbacks
        from the Server Component pipeline. Each tab gets
        exactly the actions it needs.
      </div>
    </SectionWrap>
  );
}

function ProfilePropsSection() {
  return (
    <SectionWrap label="Profile — props">
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Prop</th>
            <th style={thStyle}>Type</th>
            <th style={thStyle}>Purpose</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdPathStyle}>userData</td>
            <td style={tdStyle}><code style={codeStyle}>UserData</code></td>
            <td style={tdStyle}>Full user data object</td>
          </tr>
          <tr>
            <td style={tdPathStyle}>theme</td>
            <td style={tdStyle}><code style={codeStyle}>ThemeSpec</code></td>
            <td style={tdStyle}>Theme for UI rendering</td>
          </tr>
          <tr>
            <td style={tdPathStyle}>t</td>
            <td style={tdStyle}><code style={codeStyle}>Translations</code></td>
            <td style={tdStyle}>i18n strings</td>
          </tr>
           <tr>
             <td style={tdPathStyle}>onUpdateBasicInfo</td>
             <td style={tdStyle}><code style={codeStyle}>({`{name?}`}){`=>`}Promise{`<void>`}</code></td>
             <td style={tdStyle}>Updates display name</td>
           </tr>
          <tr>
            <td style={tdPathStyle}>onUpdateAvatarUrl</td>
            <td style={tdStyle}><code style={codeStyle}>(url){`=>`}Promise{`<void>`}</code></td>
            <td style={tdStyle}>Sets avatar URL (empty = remove)</td>
          </tr>
          <tr>
            <td style={tdPathStyle}>onUpdateProfile</td>
            <td style={tdStyle}><code style={codeStyle}>({`{givenName?,familyName?}`}){`=>`}Promise{`<void>`}</code></td>
            <td style={tdStyle}>Updates profile fields</td>
          </tr>
          <tr>
            <td style={tdPathStyle}>onSuccess</td>
            <td style={tdStyle}><code style={codeStyle}>(msg){`=>`}void</code></td>
            <td style={tdStyle}>Toast success</td>
          </tr>
          <tr>
            <td style={tdPathStyle}>onError</td>
            <td style={tdStyle}><code style={codeStyle}>(msg){`=>`}void</code></td>
            <td style={tdStyle}>Toast error</td>
          </tr>
          <tr>
            <td style={tdPathStyle}>refreshData</td>
            <td style={tdStyle}><code style={codeStyle}>{`() => void`}</code></td>
            <td style={tdStyle}>Calls router.refresh()</td>
          </tr>
        </tbody>
      </table>
    </SectionWrap>
  );
}

function ProfileHooksSection() {
  return (
    <SectionWrap label="Profile — hooks & actions">
      <CodeBlock title="useAvatarUpload hook" code={`import { useAvatarUpload } from '../../handlers/use-avatar-upload';

const { upload, isUploading, error, clearError } = useAvatarUpload({
  userId: userData.id,
  onSuccess: async (url) => {
    await updateAvatarUrl(url); // imported directly from logic/actions
    onSuccess(t.profile.avatarUpdated);
    refreshData();
  },
  onError: (msg) => onError(msg),
});

// Call upload(file) from drag-and-drop or file input handler`} />
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Return</th>
            <th style={thStyle}>Type</th>
            <th style={thStyle}>Purpose</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdPathStyle}>upload</td>
            <td style={tdStyle}><code style={codeStyle}>(file){`=>`}Promise{`<string|null>`}</code></td>
            <td style={tdStyle}>Uploads file, returns URL or null on error</td>
          </tr>
          <tr>
            <td style={tdPathStyle}>isUploading</td>
            <td style={tdStyle}><code style={codeStyle}>boolean</code></td>
            <td style={tdStyle}>Upload in progress</td>
          </tr>
          <tr>
            <td style={tdPathStyle}>error</td>
            <td style={tdStyle}><code style={codeStyle}>string | null</code></td>
            <td style={tdStyle}>Error message if upload failed</td>
          </tr>
          <tr>
            <td style={tdPathStyle}>clearError</td>
            <td style={tdStyle}><code style={codeStyle}>(){`=>`}void</code></td>
            <td style={tdStyle}>Clears error state</td>
          </tr>
        </tbody>
      </table>
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Server actions:</strong>{' '}
        <code style={codeSmStyle}>handleSaveName</code> updates display name (if non-empty)
        then always updates profile fields. Avatar upload uses{' '}
        <code style={codeSmStyle}>updateAvatarUrl</code> imported directly (not the prop).
      </div>
    </SectionWrap>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page 2: Preferences + Identities
// ═══════════════════════════════════════════════════════════════════════════════

function PreferencesSection() {
  return (
    <SectionWrap label="Preferences — props & hooks">
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Prop</th>
            <th style={thStyle}>Type</th>
            <th style={thStyle}>Purpose</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdPathStyle}>theme</td>
            <td style={tdStyle}><code style={codeStyle}>ThemeSpec</code></td>
            <td style={tdStyle}>Theme for UI rendering</td>
          </tr>
          <tr>
            <td style={tdPathStyle}>t</td>
            <td style={tdStyle}><code style={codeStyle}>Translations</code></td>
            <td style={tdStyle}>i18n strings</td>
          </tr>
          <tr>
            <td style={tdPathStyle}>supportedLangs</td>
            <td style={tdStyle}><code style={codeStyle}>string[]?</code></td>
            <td style={tdStyle}>Available language codes from LANG_AVAILABLE</td>
          </tr>
        </tbody>
      </table>
      <p style={textStyle}>
        No server actions called directly. Mutations go through the{' '}
        <code style={codeStyle}>PreferencesProvider</code> context which internally
        calls <code style={codeStyle}>updateUserCustomData</code>.
      </p>
      <CodeBlock title="useThemeMode" code={`// Returns:
//   theme: 'dark' | 'light'
//   themeSpec: ThemeSpec
//   setTheme: (theme) => void
//   toggleTheme: () => void

const { theme: activeMode, setTheme } = useThemeMode();
setTheme('light'); // persists to sessionStorage + Logto API`} />
      <CodeBlock title="useLangMode" code={`// Returns:
//   lang: string
//   setLang: (lang) => void

const { lang, setLang } = useLangMode();
setLang('ka-GE'); // persists to sessionStorage + Logto API`} />
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Storage:</strong>{' '}
        Both hooks read from <code style={codeSmStyle}>sessionStorage</code> (not React state)
        for cross-tab sync. Changes dispatch{' '}
        <code style={codeSmStyle}>preferences-changed</code> event.
      </div>
    </SectionWrap>
  );
}

function IdentitiesSection() {
  return (
    <SectionWrap label="Identities — read-only">
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Prop</th>
            <th style={thStyle}>Type</th>
            <th style={thStyle}>Purpose</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdPathStyle}>userData</td>
            <td style={tdStyle}><code style={codeStyle}>UserData</code></td>
            <td style={tdStyle}>Contains identities map</td>
          </tr>
          <tr>
            <td style={tdPathStyle}>theme</td>
            <td style={tdStyle}><code style={codeStyle}>ThemeSpec</code></td>
            <td style={tdStyle}>Theme for UI rendering</td>
          </tr>
          <tr>
            <td style={tdPathStyle}>t</td>
            <td style={tdStyle}><code style={codeStyle}>Translations</code></td>
            <td style={tdStyle}>i18n strings</td>
          </tr>
        </tbody>
      </table>
      <p style={textStyle}>
        Purely presentational. No hooks, no state, no server actions. Reads{' '}
        <code style={codeStyle}>userData.identities</code> and renders provider icons
        (inline SVGs for google, github, discord, facebook, twitter, apple, microsoft,
        linkedin) with connection status.
      </p>
      <CodeBlock title="Identity data shape" code={`// userData.identities is a Record<string, IdentityEntry>
// where IdentityEntry has:
{
  userId: string;       // external provider user ID
  details?: {
    email?: string;
    username?: string;
    name?: string;
    login?: string;
  };
}`} />
    </SectionWrap>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page 3: Security (Part 1)
// ═══════════════════════════════════════════════════════════════════════════════

function SecurityOverviewSection() {
  return (
    <SectionWrap label="Security — overview">
      <p style={textStyle}>
        The most complex tab. Manages TOTP authenticator, backup codes, password,
        email/phone, and account deletion. All mutations require identity verification
        (password or verification code).
      </p>
      <CodeBlock title="Props (19 total)" code={`interface SecurityTabProps {
  userData: UserData;
  theme: ThemeSpec;
  t: Translations;
  // Identity verification
  onVerifyPassword: (password: string) => Promise<{ verificationRecordId: string }>;
  onSendEmailVerification: (email: string) => Promise<{ verificationId: string }>;
  onSendPhoneVerification: (phone: string) => Promise<{ verificationId: string }>;
  onVerifyCode: (type: 'email' | 'phone', value: string, verificationId: string, code: string) => Promise<{ verificationRecordId: string }>;
  // Email/Phone
  onUpdateEmail: (email: string | null, newIdentifierVerificationRecordId: string, identityVerificationRecordId: string) => Promise<void>;
  onUpdatePhone: (phone: string, newIdentifierVerificationRecordId: string, identityVerificationRecordId: string) => Promise<void>;
  onRemoveEmail: (identityVerId) => Promise<void>;
  onRemovePhone: (identityVerId) => Promise<void>;
  // MFA
  onGetMfaVerifications: () => Promise<MfaVerification[]>;
  onGenerateTotpSecret: () => Promise<{ secret: string; secretQrCode: string }>;
  onAddMfaVerification: (verification: MfaVerificationPayload, identityVerificationRecordId: string) => Promise<void>;
  onDeleteMfaVerification: (verificationId: string, identityVerificationRecordId: string) => Promise<void>;
  onGenerateBackupCodes: (identityVerificationRecordId: string) => Promise<{ codes: string[] }>;
  // Password
  onUpdatePassword: (newPassword: string, identityVerificationRecordId: string) => Promise<void>;
  // Account
  onDeleteAccount: (identityVerificationRecordId: string, accessToken: string) => Promise<void>;
  // Toasts
  onSuccess: (message) => void;
  onError: (message) => void;
}
// Note: Actual count is 20 props (includes onSuccess + onError)`} />
    </SectionWrap>
  );
}

function FlowModalSection() {
  return (
    <SectionWrap label="Security — FlowModal">
      <p style={textStyle}>
        A generic multi-step modal used across the Security tab. Drives UI through
        password → loading → code/TOTP/new-password steps via a discriminated union.
      </p>
      <CodeBlock title="ModalStep type" code={`type ModalStep =
  | { kind: 'password' }
  | { kind: 'loading'; message: string }
  | { kind: 'code'; destination: string; verificationId: string; identityVerificationId: string }
  | { kind: 'totp-scan'; secret: string; totpUri: string; identityVerificationId: string }
  | { kind: 'new-password'; verificationRecordId: string };`} />
      <CodeBlock title="FlowModal props" code={`{
  title: string;
  subtitle: string;
  step: ModalStep;
  onPasswordSubmit: (password) => void;
  onCodeSubmit?: (code) => void;
  onTotpSubmit?: (code, secret, identityVerificationId) => void;
  onNewPasswordSubmit?: (newPassword, verificationRecordId) => void;
  onClose: () => void;
  passwordError?: string;
  extra?: React.ReactNode;
  theme: ThemeSpec;
  t: Translations;
  danger?: boolean;
}`} />
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Pattern:</strong>{' '}
        Most flows start with <code style={codeSmStyle}>{`{ kind: 'password' }`}</code> —
        verify identity first, then proceed to the actual mutation.
      </div>
    </SectionWrap>
  );
}

function TotpSection() {
  return (
    <SectionWrap label="Security — TOTP flows">
      <p style={textStyle}>
        TOTP (Time-based One-Time Password) authenticator setup and deletion.
      </p>
      <CodeBlock title="Enroll flow" code={`// 1. Password verification
const identity = await onVerifyPassword(pw);
// 2. Delete old TOTP if reconfiguring
if (totpFactor) await onDeleteMfaVerification(totpFactor.id, identity.verificationRecordId);
// 3. Generate new secret
const { secret } = await onGenerateTotpSecret();
// 4. Build otpauth URI (URL-encoded)
const totpUri = \`otpauth://totp/\${encodeURIComponent(ISSUER)}:\${encodeURIComponent(account)}?secret=\${secret}&issuer=\${encodeURIComponent(ISSUER)}\`;
// 5. Show QR code (QRCodeSVG from qrcode.react)
// 6. User scans + enters code → activate
await onAddMfaVerification({ type: 'Totp', payload: { secret, code } }, identityVerId);`} />
      <CodeBlock title="Delete flow" code={`// 1. Password verification
const identity = await onVerifyPassword(pw);
// 2. Delete TOTP
await onDeleteMfaVerification(totpFactor.id, identity.verificationRecordId);
// 3. Refresh MFA list
await loadMfa();`} />
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>ISSUER:</strong>{' '}
        Read from <code style={codeSmStyle}>MFA_ISSUER</code> env, defaults to{' '}
        <code style={codeSmStyle}>'Logto'</code>.
      </div>
    </SectionWrap>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page 4: Security (Part 2)
// ═══════════════════════════════════════════════════════════════════════════════

function BackupCodesSection() {
  return (
    <SectionWrap label="Security — backup codes">
      <CodeBlock title="Generate flow" code={`// 1. Password verification
const identity = await onVerifyPassword(pw);
// 2. Generate codes (returns string[])
const { codes } = await onGenerateBackupCodes(identity.verificationRecordId);
// 3. Map to { code, used } objects for BackupCodesModal
setBackupCodes(codes.map(code => ({ code, used: false })));`} />
      <p style={textStyle}>
        <code style={codeStyle}>BackupCodesModal</code> renders codes with download
        options (plain text or styled HTML). Uses Blob API for client-side file generation.
      </p>
      <CodeBlock title="BackupCodesModal features" code={`// Download as .txt
const blob = new Blob([codes.join('\\n')], { type: 'text/plain' });
const url = URL.createObjectURL(blob);
// Create <a> download link

// Download as .html
const blob = new Blob([styledHtml], { type: 'text/html' });
// Styled table with company branding`} />
    </SectionWrap>
  );
}

function PasswordAccountSection() {
  return (
    <SectionWrap label="Security — password & account">
      <CodeBlock title="Change password" code={`// 1. Password verification
const identity = await onVerifyPassword(pw);
// 2. Set new password
await onUpdatePassword(newPassword, identity.verificationRecordId);`} />
      <CodeBlock title="Delete account" code={`// 1. Password verification (or new-password if no password set)
const identity = await onVerifyPassword(pw);
// 2. Get access token
const badgeData = await fetchUserBadgeData();
// 3. Delete account
await onDeleteAccount(identity.verificationRecordId, badgeData.accessToken);
// 4. Full page navigation (avoid AuthWatcher race condition)
window.location.href = '/api/auth/sign-out';`} />
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Note:</strong>{' '}
        Account deletion uses <code style={codeSmStyle}>window.location.href</code>{' '}
        (not <code style={codeSmStyle}>router.push</code>) to force full page reload,
        avoiding race conditions with <code style={codeSmStyle}>AuthWatcher</code>.
      </div>
    </SectionWrap>
  );
}

function ContactRowSection() {
  return (
    <SectionWrap label="Security — ContactRow">
      <p style={textStyle}>
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
    </SectionWrap>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page 5: Organizations + Dev
// ═══════════════════════════════════════════════════════════════════════════════

function OrgPropsSection() {
  return (
    <SectionWrap label="Organizations — props & hooks">
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Prop</th>
            <th style={thStyle}>Type</th>
            <th style={thStyle}>Purpose</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdPathStyle}>userData</td>
            <td style={tdStyle}><code style={codeStyle}>UserData</code></td>
            <td style={tdStyle}>Contains organizations[] and organizationPermissions[]</td>
          </tr>
          <tr>
            <td style={tdPathStyle}>currentOrgId</td>
            <td style={tdStyle}><code style={codeStyle}>string?</code></td>
            <td style={tdStyle}>Server-provided active org ID</td>
          </tr>
          <tr>
            <td style={tdPathStyle}>theme</td>
            <td style={tdStyle}><code style={codeStyle}>ThemeSpec</code></td>
            <td style={tdStyle}>Theme for UI rendering</td>
          </tr>
          <tr>
            <td style={tdPathStyle}>t</td>
            <td style={tdStyle}><code style={codeStyle}>Translations</code></td>
            <td style={tdStyle}>i18n strings</td>
          </tr>
        </tbody>
      </table>
      <CodeBlock title="useOrgMode" code={`// Returns:
//   asOrg: string | null
//   setAsOrg: (orgId: string | null) => void

const { asOrg, setAsOrg } = useOrgMode();
setAsOrg('org-123'); // persists to sessionStorage + Logto API
setAsOrg(null);      // "be yourself" (global mode)`} />
      <CodeBlock title="Org switching" code={`// 1. Validate org membership (server action)
const isValid = await setActiveOrg(orgId);
if (!isValid) return;
// 2. Set in context + sessionStorage + API
setAsOrg(orgId);
// 3. Refresh RSC data with new org context
router.refresh();`} />
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>setActiveOrg:</strong>{' '}
        Imported directly from <code style={codeSmStyle}>custom-logic/actions/set-active-org</code>.
        Only validates membership — does NOT persist. Persistence is done by{' '}
        <code style={codeSmStyle}>setAsOrg</code> from the hook.
      </div>
    </SectionWrap>
  );
}

function DevSection() {
  return (
    <SectionWrap label="Dev — debug tab">
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Prop</th>
            <th style={thStyle}>Type</th>
            <th style={thStyle}>Purpose</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdPathStyle}>userData</td>
            <td style={tdStyle}><code style={codeStyle}>UserData</code></td>
            <td style={tdStyle}>Full user data (rendered as JSON)</td>
          </tr>
          <tr>
            <td style={tdPathStyle}>theme</td>
            <td style={tdStyle}><code style={codeStyle}>ThemeSpec</code></td>
            <td style={tdStyle}>Theme for UI rendering</td>
          </tr>
          <tr>
            <td style={tdPathStyle}>t</td>
            <td style={tdStyle}><code style={codeStyle}>Translations</code></td>
            <td style={tdStyle}>i18n strings</td>
          </tr>
          <tr>
            <td style={tdPathStyle}>accessToken</td>
            <td style={tdStyle}><code style={codeStyle}>string</code></td>
            <td style={tdStyle}>Raw JWT access token</td>
          </tr>
        </tbody>
      </table>
      <p style={textStyle}>
        Purely presentational. No hooks, no server actions. Two client-side
        navigations for cookie management:
      </p>
      <CodeBlock title="Cookie actions" code={`// Clear cookies (stale cookie recovery)
const handleClearCookies = () => { window.location.href = '/api/wipe'; };

// Force invalidate session (signs out from Logto too)
const handleInvalidateSession = () => { window.location.href = '/api/wipe?force=true'; };`} />
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Why href?</strong>{' '}
        <code style={codeSmStyle}>window.location.href</code> forces full page reload,
        which is necessary to clear cookies/sessions. <code style={codeSmStyle}>router.push</code>{' '}
        would not work here.
      </div>
    </SectionWrap>
  );
}

// ─── Sessions Tab ───────────────────────────────────────────────────────────

function SessionsOverviewSection() {
  return (
    <SectionWrap label="Sessions Tab">
      <div style={{ background: 'rgba(255,200,0,0.08)', border: '1px solid rgba(255,200,0,0.3)', borderRadius: '0.375rem', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.8125rem', color: 'rgba(255,255,255,0.7)' }}>
        <strong style={{ color: '#ffc800' }}>⚠ IN DEVELOPMENT</strong> — The sessions tab with device metadata (IP, browser, OS via S3 heartbeat/webhook) is functional but still being validated. The sessions list itself (from Logto Account API) is production-ready, but the enhanced device metadata feature requires S3 storage and optional PostSignIn webhook to be fully operational.
      </div>

      <p style={textStyle}>
        The Sessions tab provides users with a comprehensive view of their active authentication
        sessions across all devices. Users can see where they're currently signed in, view
        authentication methods, and revoke individual sessions for security purposes.
      </p>

      <p style={textStyle}>
        <strong>Key Features:</strong>
      </p>
      <ul style={{ ...textStyle, marginLeft: '1rem', marginBottom: '0.75rem' }}>
        <li>Real-time session listing from Logto Account API</li>
        <li>Current session identification with visual indicators</li>
        <li>Password-protected session revocation</li>
        <li>Identity verification required before viewing sessions</li>
      </ul>

      <div style={noteStyle}>
        <strong>Note:</strong> Logto's Account API provides session metadata including session ID,
        authentication method, login time, and expiry. Device metadata (IP, browser, OS) requires
        capturing via your own infrastructure — Logto does not provide this per-session.
      </div>
    </SectionWrap>
  );
}

function SessionsPropsSection() {
  return (
    <SectionWrap label="Props">
      <CodeBlock title="Props" code={`interface SessionsTabProps {
  userData: UserData;
  theme: ThemeSpec;
  t: Translations;
  onGetSessionsWithDeviceMeta: (verificationRecordId: string) => Promise<{
    sessions: LogtoSession[];
    currentJti: string | null;
  }>;
  onRevokeSession: (
    sessionId: string,
    revokeGrantsTarget?: 'all' | 'firstParty',
    identityVerificationRecordId?: string
  ) => Promise<void>;
  onVerifyPassword: (password: string) => Promise<{
    verificationRecordId: string;
  }>;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}`} />

      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Prop</th>
            <th style={thStyle}>Type</th>
            <th style={thStyle}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdStyle}><code style={codeStyle}>onGetSessionsWithDeviceMeta</code></td>
            <td style={tdStyle}>Server Action</td>
            <td style={tdStyle}>Fetches sessions + current JTI via introspection</td>
          </tr>
          <tr>
            <td style={tdStyle}><code style={codeStyle}>onRevokeSession</code></td>
            <td style={tdStyle}>Server Action</td>
            <td style={tdStyle}>Revokes session (requires identity verification)</td>
          </tr>
        </tbody>
      </table>
    </SectionWrap>
  );
}

function SessionsApiSection() {
  return (
    <SectionWrap label="Server Actions">
      <CodeBlock title="getSessionsWithDeviceMeta" code={`export async function getSessionsWithDeviceMeta(verificationRecordId: string): Promise<{
  sessions: LogtoSession[];
  currentJti: string | null;
}> {
  const sessions = await getUserSessions(verificationRecordId);

  const token = await getTokenForServerAction();
  const introspection = await introspectToken(token);
  const currentJti = introspection.sid || introspection.jti || null;

  return { sessions, currentJti };
}`} />

      <p style={textStyle}>
        Fetches active sessions from Logto's Account API with identity verification,
        then determines the current session via token introspection.
      </p>
    </SectionWrap>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export default function TabsAndFlowsDoc() {
  return (
    <SectionContainer>
      {/* Page 1: Overview + Profile */}
      <Section id={1}>
        <div style={{ ...twoColLayoutStyle, height: '100%', padding: '16px' }}>
          <div style={colLeftStyle}>
            <OverviewSection />
          </div>
          <div style={colLeftStyle}>
            <ProfilePropsSection />
            <ProfileHooksSection />
          </div>
        </div>
      </Section>

      {/* Page 2: Preferences + Identities */}
      <Section id={2}>
        <div style={{ ...twoColLayoutStyle, height: '100%', padding: '16px' }}>
          <div style={colLeftStyle}>
            <PreferencesSection />
          </div>
          <div style={colLeftStyle}>
            <IdentitiesSection />
          </div>
        </div>
      </Section>

      {/* Page 3: Security (Part 1) */}
      <Section id={3}>
        <div style={{ ...twoColLayoutStyle, height: '100%', padding: '16px' }}>
          <div style={colLeftStyle}>
            <SecurityOverviewSection />
          </div>
          <div style={colLeftStyle}>
            <FlowModalSection />
            <TotpSection />
          </div>
        </div>
      </Section>

      {/* Page 4: Security (Part 2) */}
      <Section id={4}>
        <div style={{ ...twoColLayoutStyle, height: '100%', padding: '16px' }}>
          <div style={colLeftStyle}>
            <BackupCodesSection />
            <PasswordAccountSection />
          </div>
          <div style={colLeftStyle}>
            <ContactRowSection />
          </div>
        </div>
      </Section>

      {/* Page 5: Sessions */}
      <Section id={5}>
        <div style={{ ...twoColLayoutStyle, height: '100%', padding: '16px' }}>
          <div style={colLeftStyle}>
            <SessionsOverviewSection />
            <SessionsPropsSection />
          </div>
          <div style={colLeftStyle}>
            <SessionsApiSection />
          </div>
        </div>
      </Section>

      {/* Page 6: Organizations + Dev */}
      <Section id={6}>
        <div style={{ ...twoColLayoutStyle, height: '100%', padding: '16px' }}>
          <div style={colLeftStyle}>
            <OrgPropsSection />
          </div>
          <div style={colLeftStyle}>
            <DevSection />
          </div>
        </div>
      </Section>
    </SectionContainer>
  );
}
