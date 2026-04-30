'use client';

import CodeBlock from '../utils/CodeBlock';
import { SectionContainer, Section } from '../utils/Section';
import { useDocStyles } from '../utils/useDocStyles';
import { SectionHeader, SectionWrap } from '../utils/SectionComponents';

// ═══════════════════════════════════════════════════════════════════════════════
// Page 1: Overview + Profile
// ═══════════════════════════════════════════════════════════════════════════════

function OverviewSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Tab overview">
      <p style={styles.textStyle}>
        The Dashboard renders tabs based on the <code style={styles.codeStyle}>LOAD_TABS</code>{' '}
        env var. <code style={styles.codeStyle}>DashboardClient</code> maintains{' '}
        <code style={styles.codeStyle}>activeTab</code> state and conditionally renders
        each tab component.
      </p>
      <table style={styles.tableStyle}>
        <thead>
          <tr>
            <th style={styles.thStyle}>Tab</th>
            <th style={styles.thStyle}>Props</th>
            <th style={styles.thStyle}>Hooks</th>
            <th style={styles.thStyle}>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tdPathStyle}>Profile</td>
            <td style={styles.tdStyle}>6 + common</td>
            <td style={styles.tdStyle}>useAvatarUpload</td>
            <td style={styles.tdStyle}>3</td>
          </tr>
          <tr>
            <td style={styles.tdPathStyle}>Preferences</td>
            <td style={styles.tdStyle}>1 + common</td>
            <td style={styles.tdStyle}>useThemeMode, useLangMode</td>
            <td style={styles.tdStyle}>0 (via context)</td>
          </tr>
          <tr>
            <td style={styles.tdPathStyle}>Security</td>
            <td style={styles.tdStyle}>17 + common</td>
            <td style={styles.tdStyle}>—</td>
            <td style={styles.tdStyle}>15</td>
          </tr>
          <tr>
            <td style={styles.tdPathStyle}>Sessions</td>
            <td style={styles.tdStyle}>5 + common</td>
            <td style={styles.tdStyle}>—</td>
            <td style={styles.tdStyle}>3</td>
          </tr>
          <tr>
            <td style={styles.tdPathStyle}>Identities</td>
            <td style={styles.tdStyle}>common only</td>
            <td style={styles.tdStyle}>—</td>
            <td style={styles.tdStyle}>0</td>
          </tr>
          <tr>
            <td style={styles.tdPathStyle}>Organizations</td>
            <td style={styles.tdStyle}>1 + common</td>
            <td style={styles.tdStyle}>useOrgMode</td>
            <td style={styles.tdStyle}>1</td>
          </tr>
          <tr>
            <td style={styles.tdPathStyle}>Dev</td>
            <td style={styles.tdStyle}>1 + common</td>
            <td style={styles.tdStyle}>—</td>
            <td style={styles.tdStyle}>0</td>
          </tr>
        </tbody>
      </table>
      <CodeBlock title="LOAD_TABS" code={`# Show all tabs (default)
LOAD_TABS=

# Show specific tabs
LOAD_TABS=profile,preferences,security,organizations`} />
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Common props:</strong>{' '}
        Every tab receives <code style={styles.codeSmStyle}>userData: UserData</code>,{' '}
        <code style={styles.codeSmStyle}>theme: ThemeSpec</code>, and{' '}
        <code style={styles.codeSmStyle}>t: Translations</code>. These are omitted from individual prop tables below.
      </div>
    </SectionWrap>
  );
}

function ProfilePropsSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Profile — props">
      <table style={styles.tableStyle}>
        <thead>
          <tr>
            <th style={styles.thStyle}>Prop</th>
            <th style={styles.thStyle}>Type</th>
            <th style={styles.thStyle}>Purpose</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tdPathStyle}>onUpdateBasicInfo</td>
            <td style={styles.tdStyle}><code style={styles.codeStyle}>({`{name?}`}){`=>`}Promise{`<void>`}</code></td>
            <td style={styles.tdStyle}>Updates display name</td>
          </tr>
          <tr>
            <td style={styles.tdPathStyle}>onUpdateAvatarUrl</td>
            <td style={styles.tdStyle}><code style={styles.codeStyle}>(url){`=>`}Promise{`<void>`}</code></td>
            <td style={styles.tdStyle}>Sets avatar URL (empty = remove)</td>
          </tr>
          <tr>
            <td style={styles.tdPathStyle}>onUpdateProfile</td>
            <td style={styles.tdStyle}><code style={styles.codeStyle}>({`{givenName?,familyName?}`}){`=>`}Promise{`<void>`}</code></td>
            <td style={styles.tdStyle}>Updates profile fields</td>
          </tr>
          <tr>
            <td style={styles.tdPathStyle}>onSuccess</td>
            <td style={styles.tdStyle}><code style={styles.codeStyle}>(msg){`=>`}void</code></td>
            <td style={styles.tdStyle}>Toast success</td>
          </tr>
          <tr>
            <td style={styles.tdPathStyle}>onError</td>
            <td style={styles.tdStyle}><code style={styles.codeStyle}>(msg){`=>`}void</code></td>
            <td style={styles.tdStyle}>Toast error</td>
          </tr>
          <tr>
            <td style={styles.tdPathStyle}>refreshData</td>
            <td style={styles.tdStyle}><code style={styles.codeStyle}>{`() => void`}</code></td>
            <td style={styles.tdStyle}>Calls router.refresh()</td>
          </tr>
        </tbody>
      </table>
    </SectionWrap>
  );
}

function ProfileHooksSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Profile — hooks & actions">
      <CodeBlock title="useAvatarUpload hook" code={`import { useAvatarUpload } from '../../handlers/use-avatar-upload';

const { upload, isUploading, error, clearError } = useAvatarUpload({
  onSuccess: async (url) => {
    await updateAvatarUrl(url); // imported directly from logic/actions
    onSuccess(t.profile.avatarUpdated);
    refreshData();
  },
  onError: (msg) => onError(msg),
});

// Call upload(file) from drag-and-drop or file input handler`} />
      <table style={styles.tableStyle}>
        <thead>
          <tr>
            <th style={styles.thStyle}>Return</th>
            <th style={styles.thStyle}>Type</th>
            <th style={styles.thStyle}>Purpose</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tdPathStyle}>upload</td>
            <td style={styles.tdStyle}><code style={styles.codeStyle}>(file){`=>`}Promise{`<string|null>`}</code></td>
            <td style={styles.tdStyle}>Uploads file, returns URL or null on error</td>
          </tr>
          <tr>
            <td style={styles.tdPathStyle}>isUploading</td>
            <td style={styles.tdStyle}><code style={styles.codeStyle}>boolean</code></td>
            <td style={styles.tdStyle}>Upload in progress</td>
          </tr>
          <tr>
            <td style={styles.tdPathStyle}>error</td>
            <td style={styles.tdStyle}><code style={styles.codeStyle}>string | null</code></td>
            <td style={styles.tdStyle}>Error message if upload failed</td>
          </tr>
          <tr>
            <td style={styles.tdPathStyle}>clearError</td>
            <td style={styles.tdStyle}><code style={styles.codeStyle}>(){`=>`}void</code></td>
            <td style={styles.tdStyle}>Clears error state</td>
          </tr>
        </tbody>
      </table>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Server actions:</strong>{' '}
        <code style={styles.codeSmStyle}>handleSaveName</code> updates display name (if non-empty)
        then always updates profile fields. Avatar upload uses{' '}
        <code style={styles.codeSmStyle}>updateAvatarUrl</code> imported directly (not the prop).
      </div>
    </SectionWrap>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page 2: Preferences + Identities
// ═══════════════════════════════════════════════════════════════════════════════

function PreferencesSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Preferences — props & hooks">
      <table style={styles.tableStyle}>
        <thead>
          <tr>
            <th style={styles.thStyle}>Prop</th>
            <th style={styles.thStyle}>Type</th>
            <th style={styles.thStyle}>Purpose</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tdPathStyle}>supportedLangs</td>
            <td style={styles.tdStyle}><code style={styles.codeStyle}>string[]?</code></td>
            <td style={styles.tdStyle}>Available language codes from LANG_AVAILABLE</td>
          </tr>
        </tbody>
      </table>
      <p style={styles.textStyle}>
        No server actions called directly. Mutations go through the{' '}
        <code style={styles.codeStyle}>PreferencesProvider</code> context which internally
        calls <code style={styles.codeStyle}>updateUserCustomData</code>.
      </p>
      <CodeBlock title="useThemeMode / useLangMode" code={`const { theme, setTheme, toggleTheme } = useThemeMode();
setTheme('light'); // persists to sessionStorage + Logto API

const { lang, setLang } = useLangMode();
setLang('ka-GE'); // persists to sessionStorage + Logto API`} />
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Storage:</strong>{' '}
        Both hooks read from <code style={styles.codeSmStyle}>sessionStorage</code> (not React state)
        for cross-tab sync. Changes dispatch{' '}
        <code style={styles.codeSmStyle}>preferences-changed</code> event.
      </div>
    </SectionWrap>
  );
}

function IdentitiesSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Identities — read-only">
      <p style={styles.textStyle}>
        Purely presentational. No hooks, no state, no server actions. Reads{' '}
        <code style={styles.codeStyle}>userData.identities</code> and renders provider icons
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
  const styles = useDocStyles();
  return (
    <SectionWrap label="Security — overview">
      <p style={styles.textStyle}>
        The most complex tab. Manages TOTP authenticator, backup codes, password,
        email/phone, and account deletion. All mutations require identity verification
        (password or verification code). 20 props total, grouped by concern:
      </p>
      <table style={styles.tableStyle}>
        <thead>
          <tr>
            <th style={styles.thStyle}>Group</th>
            <th style={styles.thStyle}>Props</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tdPropStyle}>verification</td>
            <td style={styles.tdStyle}>onVerifyPassword, onVerifyCode, onSendEmailVerification, onSendPhoneVerification</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>email / phone</td>
            <td style={styles.tdStyle}>onUpdateEmail, onUpdatePhone, onRemoveEmail, onRemovePhone</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>MFA</td>
            <td style={styles.tdStyle}>onGetMfaVerifications, onGenerateTotpSecret, onAddMfaVerification, onDeleteMfaVerification, onGenerateBackupCodes</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>password / account</td>
            <td style={styles.tdStyle}>onUpdatePassword, onDeleteAccount</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>toasts</td>
            <td style={styles.tdStyle}>onSuccess, onError</td>
          </tr>
        </tbody>
      </table>
    </SectionWrap>
  );
}

function FlowModalSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Security — FlowModal">
      <p style={styles.textStyle}>
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
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Pattern:</strong>{' '}
        Most flows start with <code style={styles.codeSmStyle}>{`{ kind: 'password' }`}</code> —
        verify identity first, then proceed to the actual mutation.
      </div>
    </SectionWrap>
  );
}

function TotpSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Security — TOTP flows">
      <p style={styles.textStyle}>
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
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>ISSUER:</strong>{' '}
        Read from <code style={styles.codeSmStyle}>MFA_ISSUER</code> env, defaults to{' '}
        <code style={styles.codeSmStyle}>'Logto'</code>.
      </div>
    </SectionWrap>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page 4: Security (Part 2)
// ═══════════════════════════════════════════════════════════════════════════════

function BackupCodesSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Security — backup codes">
      <CodeBlock title="Generate flow" code={`// 1. Password verification
const identity = await onVerifyPassword(pw);
// 2. Generate codes (returns string[])
const { codes } = await onGenerateBackupCodes(identity.verificationRecordId);
// 3. Map to { code, used } objects for BackupCodesModal
setBackupCodes(codes.map(code => ({ code, used: false })));`} />
      <p style={styles.textStyle}>
        <code style={styles.codeStyle}>BackupCodesModal</code> renders codes with download
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
  const styles = useDocStyles();
  return (
    <SectionWrap label="Security — password & account">
      <CodeBlock title="Change password" code={`// 1. Password verification
const identity = await onVerifyPassword(pw);
// 2. Set new password
await onUpdatePassword(newPassword, identity.verificationRecordId);`} />
      <CodeBlock title="Delete account" code={`// 1. Password verification (or new-password if no password set)
const identity = await onVerifyPassword(pw);
// 2. Delete account (token derived server-side)
await onDeleteAccount(identity.verificationRecordId);
// 3. Full page navigation (avoid AuthWatcher race condition)
window.location.href = '/api/auth/sign-out';`} />
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Note:</strong>{' '}
        Account deletion uses <code style={styles.codeSmStyle}>window.location.href</code>{' '}
        (not <code style={styles.codeSmStyle}>router.push</code>) to force full page reload,
        avoiding race conditions with <code style={styles.codeSmStyle}>AuthWatcher</code>.
      </div>
    </SectionWrap>
  );
}

function ContactRowSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Security — ContactRow">
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
    </SectionWrap>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page 5: Organizations + Dev
// ═══════════════════════════════════════════════════════════════════════════════

function OrgPropsSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Organizations — props & hooks">
      <table style={styles.tableStyle}>
        <thead>
          <tr>
            <th style={styles.thStyle}>Prop</th>
            <th style={styles.thStyle}>Type</th>
            <th style={styles.thStyle}>Purpose</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tdPathStyle}>currentOrgId</td>
            <td style={styles.tdStyle}><code style={styles.codeStyle}>string?</code></td>
            <td style={styles.tdStyle}>Server-provided active org ID</td>
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
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>setActiveOrg:</strong>{' '}
        Imported directly from <code style={styles.codeSmStyle}>custom-logic/actions/set-active-org</code>.
        Only validates membership — does NOT persist. Persistence is done by{' '}
        <code style={styles.codeSmStyle}>setAsOrg</code> from the hook.
      </div>
    </SectionWrap>
  );
}

function DevSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Dev — debug tab">
      <table style={styles.tableStyle}>
        <thead>
          <tr>
            <th style={styles.thStyle}>Prop</th>
            <th style={styles.thStyle}>Type</th>
            <th style={styles.thStyle}>Purpose</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tdPathStyle}>accessToken</td>
            <td style={styles.tdStyle}><code style={styles.codeStyle}>string</code></td>
            <td style={styles.tdStyle}>Access token fetched lazily via <code style={styles.codeStyle}>getCurrentAccessToken()</code> (dev-only server action)</td>
          </tr>
        </tbody>
      </table>
      <p style={styles.textStyle}>
        Purely presentational. No hooks, no server actions. Two client-side
        navigations for cookie management:
      </p>
      <CodeBlock title="Cookie actions" code={`// Clear cookies (stale cookie recovery) — POST-only
const handleClearCookies = async () => {
  await fetch('/api/wipe', { method: 'POST', credentials: 'same-origin' });
  window.location.href = '/';
};

// Force invalidate session (signs out from Logto too) — POST-only
const handleInvalidateSession = async () => {
  await fetch('/api/wipe?force=true', { method: 'POST', credentials: 'same-origin' });
  window.location.href = '/';
};`} />
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Why href?</strong>{' '}
        <code style={styles.codeSmStyle}>window.location.href</code> forces full page reload,
        which is necessary to clear cookies/sessions. <code style={styles.codeSmStyle}>router.push</code>{' '}
        would not work here.
      </div>
    </SectionWrap>
  );
}

// ─── Sessions Tab ───────────────────────────────────────────────────────────

function SessionsSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Sessions Tab">
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>See standalone doc</strong> — Full Sessions documentation
        is in the separate <code style={styles.codeSmStyle}>Sessions</code> doc (under Components in sidebar).
      </div>

      <p style={styles.textStyle}>
        The Sessions tab displays active user sessions from Logto's Account API.
        Features password verification, session revocation, and IP geolocation.
      </p>

      <ul style={{ ...styles.textStyle, marginLeft: '1rem', marginBottom: '0.75rem' }}>
        <li>Password verification before viewing</li>
        <li>Session revocation</li>
        <li>IP geolocation via ipapi.co</li>
        <li>Current session identification (via JTI)</li>
      </ul>

      <div style={styles.warningBannerStyle}>
        <strong style={styles.warningBannerStrongStyle}>⚠ IN DEVELOPMENT</strong> — Logto's sessions API
        is evolving. See the standalone doc for current limitations.
      </div>
    </SectionWrap>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export default function TabsAndFlowsDoc() {
  const styles = useDocStyles();
  return (
    <SectionContainer>
      {/* Page 1: Overview + Profile */}
      <Section id={1}>
        <div style={{ ...styles.twoColLayoutStyle, minHeight: '100%', padding: '16px' }}>
          <div style={styles.colLeftStyle}>
            <OverviewSection />
          </div>
          <div style={styles.colLeftStyle}>
            <ProfilePropsSection />
            <ProfileHooksSection />
          </div>
        </div>
      </Section>

      {/* Page 2: Preferences + Identities */}
      <Section id={2}>
        <div style={{ ...styles.twoColLayoutStyle, minHeight: '100%', padding: '16px' }}>
          <div style={styles.colLeftStyle}>
            <PreferencesSection />
          </div>
          <div style={styles.colLeftStyle}>
            <IdentitiesSection />
          </div>
        </div>
      </Section>

      {/* Page 3: Security (Part 1) */}
      <Section id={3}>
        <div style={{ ...styles.twoColLayoutStyle, minHeight: '100%', padding: '16px' }}>
          <div style={styles.colLeftStyle}>
            <SecurityOverviewSection />
          </div>
          <div style={styles.colLeftStyle}>
            <FlowModalSection />
            <TotpSection />
          </div>
        </div>
      </Section>

      {/* Page 4: Security (Part 2) */}
      <Section id={4}>
        <div style={{ ...styles.twoColLayoutStyle, minHeight: '100%', padding: '16px' }}>
          <div style={styles.colLeftStyle}>
            <BackupCodesSection />
            <PasswordAccountSection />
          </div>
          <div style={styles.colLeftStyle}>
            <ContactRowSection />
          </div>
        </div>
      </Section>

      {/* Page 5: Sessions */}
      <Section id={5}>
        <div style={{ ...styles.twoColLayoutStyle, minHeight: '100%', padding: '16px' }}>
          <div style={{ ...styles.colLeftStyle, gridColumn: '1 / -1' }}>
            <SessionsSection />
          </div>
        </div>
      </Section>

      {/* Page 6: Organizations + Dev */}
      <Section id={6}>
        <div style={{ ...styles.twoColLayoutStyle, minHeight: '100%', padding: '16px' }}>
          <div style={styles.colLeftStyle}>
            <OrgPropsSection />
          </div>
          <div style={styles.colLeftStyle}>
            <DevSection />
          </div>
        </div>
      </Section>
    </SectionContainer>
  );
}
