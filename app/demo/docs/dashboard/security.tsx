'use client';

import CodeBlock from '../../utils/CodeBlock';
import { SectionContainer, Section } from '../../utils/Section';

// ─── Shared styles ──────────────────────────────────────────────────────────

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

const tdPropStyle: React.CSSProperties = {
  ...tdStyle,
  color: '#9cdcdb',
  fontFamily: "'IBM Plex Mono', monospace",
  whiteSpace: 'nowrap',
};

const tdTypeStyle: React.CSSProperties = {
  ...tdStyle,
  color: '#4ec9b0',
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: '0.625rem',
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
// A: FlowModal Architecture
// ═══════════════════════════════════════════════════════════════════════════════

function FlowModalSection() {
  return (
    <SectionWrap label="A: FlowModal — The verification pipeline">
      <p style={textStyle}>
        Every security operation uses <code style={codeStyle}>FlowModal</code>, a generic
        multi-step overlay that handles identity verification before sensitive actions. The
        modal transitions through a typed state machine:
      </p>
      <CodeBlock title="ModalStep type" code={`type ModalStep =
  | { kind: 'password' }                          // Enter current password
  | { kind: 'loading'; message: string }          // Async operation
  | { kind: 'code';                               // Verify 6-digit code
      destination: string;
      verificationId: string;
      identityVerificationId: string }
  | { kind: 'totp-scan';                          // QR code + manual key
      secret: string;
      totpUri: string;
      identityVerificationId: string }
  | { kind: 'new-password';                       // Enter new password
      verificationRecordId: string };`} />
      <p style={textStyle}>
        The typical flow is: <strong>password → loading → code OR totp-scan</strong>. Each step
        is rendered conditionally inside the modal body.
      </p>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Step</th>
            <th style={thStyle}>Purpose</th>
            <th style={thStyle}>Next step</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdPropStyle}>password</td>
            <td style={tdStyle}>Verify user identity</td>
            <td style={tdStyle}>loading → code OR totp-scan OR new-password</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>loading</td>
            <td style={tdStyle}>Show spinner during async</td>
            <td style={tdStyle}>transitions to next step on resolve</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>code</td>
            <td style={tdStyle}>Enter 6-digit verification code</td>
            <td style={tdStyle}>loading → close on success</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>totp-scan</td>
            <td style={tdStyle}>Scan QR or enter secret key</td>
            <td style={tdStyle}>loading → close on success</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>new-password</td>
            <td style={tdStyle}>Enter new password</td>
            <td style={tdStyle}>loading → close on success</td>
          </tr>
        </tbody>
      </table>
      <CodeBlock title="ContactRow — Reusable component for email/phone" code={`// ContactRow handles both email and phone edits/removals.
// It manages its own modal state internally:

type Kind = 'edit' | 'remove';
const [modalKind, setModalKind] = useState<Kind | null>(null);
const [step, setStep] = useState<ModalStep>({ kind: 'password' });

// Edit flow: password → send code → verify code → update
// Remove flow: password → verify → remove

// Both flow through the same FlowModal component.`} />
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Reusability:</strong>{' '}
        <code style={codeStyle}>ContactRow</code> is reused for both email and phone fields.
        It receives typed callbacks and handles both add/edit/remove flows identically.
      </div>
    </SectionWrap>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// B: Contact & Credentials
// ═══════════════════════════════════════════════════════════════════════════════

function ContactCredentialsSection() {
  return (
    <SectionWrap label="B: Contact & Credentials">
      <p style={textStyle}>
        The Contact &amp; Credentials section manages the user&apos;s primary email, phone,
        and password. All operations require identity verification before execution.
      </p>

      {/* Email */}
      <p style={{ ...textStyle, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem' }}>
        Email address
      </p>
      <p style={textStyle}>
        Displayed as <code style={codeStyle}>userData.primaryEmail</code>. Managed by{' '}
        <code style={codeStyle}>ContactRow</code> with type=&quot;email&quot;.
      </p>
      <CodeBlock title="Email update flow" code={`// Edit email:
// 1. User enters new email
// 2. Password verification: onVerifyPassword(pw)
//    → returns { verificationRecordId }
// 3. Send code: onSendEmailVerification(email)
//    → returns { verificationId }
// 4. User enters 6-digit code
// 5. Verify code: onVerifyCode('email', email, verificationId, code)
//    → returns { verificationRecordId }
// 6. Update: onUpdateEmail(email, newVerificationId, identityVerificationId)

// Remove email:
// 1. Password verification: onVerifyPassword(pw)
//    → returns { verificationRecordId }
// 2. Remove: onRemoveEmail(verificationRecordId)`} />

      {/* Phone */}
      <p style={{ ...textStyle, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem' }}>
        Phone number
      </p>
      <p style={textStyle}>
        Displayed as <code style={codeStyle}>userData.primaryPhone</code>. Same flow as email
        using <code style={codeStyle}>onSendPhoneVerification</code> and{' '}
        <code style={codeStyle}>onRemovePhone</code>.
      </p>

      {/* Password */}
      <p style={{ ...textStyle, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem' }}>
        Password
      </p>
      <p style={textStyle}>
        Password display is masked. The change flow uses a two-step modal:
      </p>
      <CodeBlock title="Password change flow" code={`// 1. Show current password field
setPwStep({ kind: 'password' });

// 2. Verify current password
const { verificationRecordId } = await onVerifyPassword(pw);
setPwStep({ kind: 'new-password', verificationRecordId });

// 3. User enters new password
await onUpdatePassword(newPw, verificationRecordId);
onSuccess('Password changed successfully');`} />
    </SectionWrap>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// C: Two-Factor Authentication
// ═══════════════════════════════════════════════════════════════════════════════

function TFASection() {
  return (
    <SectionWrap label="C: Two-Factor Authentication">
      <p style={textStyle}>
        The Security tab manages TOTP (authenticator app) and backup codes. MFA verifications
        are loaded on mount via <code style={codeStyle}>onGetMfaVerifications()</code>.
      </p>
      <CodeBlock title="MFA state" code={`const [mfaList, setMfaList] = useState<MfaVerification[]>([]);

// Loaded on mount
useEffect(() => { loadMfa(); }, [loadMfa]);

// Check what's configured
const totpFactor   = mfaList.find(v => v.type === 'Totp');
const backupFactor = mfaList.find(v => v.type === 'BackupCode');`} />

      {/* TOTP */}
      <p style={{ ...textStyle, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem' }}>
        TOTP — Authenticator App
      </p>
      <p style={textStyle}>
        TOTP uses a multi-step flow that handles both enrollment and reconfiguration. The
        state manages three separate modal flows:
      </p>
      <CodeBlock title="TOTP flows" code={`// === ENROLL / RECONFIGURE ===
// State: { totpStep, totpPwErr }

// Step 1: Password verification
const handleTotpPassword = async (pw: string) => {
  const identity = await onVerifyPassword(pw);

  // If reconfiguring, delete old TOTP first
  if (totpFactor) {
    await onDeleteMfaVerification(totpFactor.id, identity.verificationRecordId);
  }

  // Generate new TOTP secret
  const { secret } = await onGenerateTotpSecret();

  // Build otpauth URI for QR code
  const account = userData.profile?.givenName || userData.username || 'user';
  const totpUri = \`otpauth://totp/\${ISSUER}:\${account}?secret=\${secret}&issuer=\${ISSUER}\`;

  // Show QR code step
  setTotpStep({
    kind: 'totp-scan',
    secret,
    totpUri,
    identityVerificationId: identity.verificationRecordId,
  });
};

// Step 2: User scans QR, enters code
const handleTotpActivate = async (code, secret, identityVerificationId) => {
  await onAddMfaVerification(
    { type: 'Totp', payload: { secret, code } },
    identityVerificationId
  );
  await loadMfa(); // refresh MFA list
};

// === DELETE TOTP ===
const handleDelTotpPw = async (pw: string) => {
  const identity = await onVerifyPassword(pw);
  await onDeleteMfaVerification(totpFactor.id, identity.verificationRecordId);
  await loadMfa();
};`} />
      <p style={textStyle}>
        The TOTP URI follows the{' '}
        <code style={codeStyle}>otpauth://totp/ISSUER:ACCOUNT?secret=SECRET&issuer=ISSUER</code>{' '}
        format. The QR code is rendered using <code style={codeStyle}>qrcode.react</code>.
      </p>
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Reconfigure behavior:</strong>{' '}
        Reconfiguring deletes the existing TOTP factor first, then creates a new one. The
        user must re-scan the QR code.
      </div>

      {/* Backup codes */}
      <p style={{ ...textStyle, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginTop: '1rem' }}>
        Backup Codes
      </p>
      <p style={textStyle}>
        Backup codes are single-use recovery codes. Generation requires password verification:
      </p>
      <CodeBlock title="Backup code generation" code={`const handleBackupPw = async (pw: string) => {
  // 1. Verify password
  const identity = await onVerifyPassword(pw);

  // 2. Generate codes
  const result = await onGenerateBackupCodes(identity.verificationRecordId);

  // 3. Display codes (shown only once)
  setBackupCodes(result.codes.map(code => ({ code, used: false })));
};`} />
      <p style={textStyle}>
        After generation, <code style={codeStyle}>BackupCodesModal</code> displays the codes
        with two download options:
      </p>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Format</th>
            <th style={thStyle}>Content</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdPropStyle}>.txt</td>
            <td style={tdStyle}>Plain text, one code per line</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>.html</td>
            <td style={tdStyle}>Styled HTML document with grid layout</td>
          </tr>
        </tbody>
      </table>
      <p style={textStyle}>
        Codes are marked as used (strikethrough) and the UI shows{' '}
        <code style={codeStyle}>remainCodes</code> remaining from{' '}
        <code style={codeStyle}>backupFactor</code>.
      </p>
    </SectionWrap>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// D: Danger Zone
// ═══════════════════════════════════════════════════════════════════════════════

function DangerZoneSection() {
  return (
    <SectionWrap label="D: Danger Zone — Account Deletion">
      <p style={textStyle}>
        Account deletion is the most critical operation. It requires password verification,
        fetches a fresh access token, then navigates to the sign-out route.
      </p>
      <CodeBlock title="Delete account flow" code={`const handleDeleteAccount = async (pw: string) => {
  // 1. Verify password
  const { verificationRecordId } = await onVerifyPassword(pw);

  // 2. Fetch fresh access token for deletion
  const badgeData = await fetchUserBadgeData();
  if (!badgeData.success || !badgeData.accessToken) {
    throw new Error('Could not retrieve session token for account deletion.');
  }

  // 3. Server action deletes the account
  await onDeleteAccount(verificationRecordId, badgeData.accessToken);

  // 4. Navigate to sign-out (NOT router.push)
  window.location.href = '/api/auth/sign-out';
};`} />
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Critical:</strong>{' '}
        Uses <code style={codeStyle}>window.location.href</code> instead of{' '}
        <code style={codeStyle}>router.push()</code>. This performs a full page navigation
        to avoid AuthWatcher&apos;s <code style={codeStyle}>router.refresh()</code> interval
        racing with session teardown, which would cause &quot;failed to fetch&quot; errors.
      </div>
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Server action note:</strong>{' '}
        The server action no longer calls <code style={codeStyle}>signOut()</code> or{' '}
        <code style={codeStyle}>redirect()</code> internally. Doing so raced with
        AuthWatcher&apos;s refresh interval.
      </div>
    </SectionWrap>
  );
}

// ─── Notes ────────────────────────────────────────────────────────────────────

function NotesSection() {
  return (
    <SectionWrap label="Notes">
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>ISSUER env:</strong>{' '}
        TOTP uses <code style={codeStyle}>NEXT_PUBLIC_MFA_ISSUER</code> (defaults to &quot;Logto&quot;)
        for the otpauth URI issuer parameter.
      </div>
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Toast integration:</strong>{' '}
        All operations report success/error via the parent&apos;s{' '}
        <code style={codeStyle}>onSuccess</code>/<code style={codeStyle}>onError</code>{' '}
        callbacks, which trigger toast notifications.
      </div>
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Overlay click:</strong>{' '}
        Clicking outside the modal dismisses it. The{' '}
        <code style={codeStyle}>Overlay</code> component uses{' '}
        <code style={codeStyle}>e.target === e.currentTarget</code> to prevent accidental
        dismissal.
      </div>
      <div style={{ ...noteStyle, marginBottom: 0 }}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>15+ callbacks:</strong>{' '}
        The SecurityTab is the most prop-heavy component in the dashboard. All server actions
        are passed as callbacks from the parent, keeping the tab fully client-side with no
        server action imports.
      </div>
    </SectionWrap>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export default function SecurityDoc() {
  return (
    <SectionContainer>
      {/* Page 1: FlowModal + Contact */}
      <Section id={1}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          padding: '16px',
          height: '100%',
          overflow: 'auto',
        }}>
          <FlowModalSection />
          <ContactCredentialsSection />
        </div>
      </Section>

      {/* Page 2: Two-Factor Authentication */}
      <Section id={2}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          padding: '16px',
          height: '100%',
          overflow: 'auto',
        }}>
          <TFASection />
        </div>
      </Section>

      {/* Page 3: Danger Zone + Notes */}
      <Section id={3}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          padding: '16px',
          height: '100%',
          overflow: 'auto',
        }}>
          <DangerZoneSection />
          <NotesSection />
        </div>
      </Section>
    </SectionContainer>
  );
}
