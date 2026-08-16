'use client';

import CodeBlock from '../../components/SyntaxBlock';
import { useDocStyles } from '../../components/useDocStyles';
import { useThemeMode } from '../../../logto-kit/components/providers/preferences';
import { slugify } from '../../components/SectionComponents';

export default function DevSection() {
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

  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.8rem',
    margin: '12px 0 20px',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`,
  };

  const thStyle: React.CSSProperties = {
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

  const tdStyle: React.CSSProperties = {
    padding: '10px 12px',
    borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9'}`,
    color: isDark ? 'rgba(255,255,255,0.55)' : '#334155',
    verticalAlign: 'top',
    lineHeight: 1.5,
  };

  const codeCellStyle: React.CSSProperties = {
    ...tdStyle,
    color: isDark ? '#9cdcdb' : '#0369a1',
    fontFamily: "'IBM Plex Mono', monospace",
    fontWeight: 600,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h2 id={slugify('Dev tab and configuration')} style={h2Style}>
          Dev tab and configuration
        </h2>
        <p style={styles.textStyle}>
          The <code style={styles.codeStyle}>DevTab</code> lets the signed-in user list,
          create, rename, and delete Logto personal access tokens (PATs). Its canonical tab
          ID is <code style={styles.codeSmStyle}>dev</code>. The accepted aliases are{' '}
          <code style={styles.codeSmStyle}>developer</code>,{' '}
          <code style={styles.codeSmStyle}>pat</code>,{' '}
          <code style={styles.codeSmStyle}>pats</code>,{' '}
          <code style={styles.codeSmStyle}>pat-tokens</code>, and{' '}
          <code style={styles.codeSmStyle}>tokens</code>.
        </p>
        <CodeBlock
          title="Explicitly enable the Dev tab"
          code={`# Private server-side hard lock (strict and default off)
PAT_ENABLED=true

# Explicit tab selection must include Dev (or one of its aliases)
LOAD_TABS=profile,preferences,security,sessions,organizations,identities,dev

# Optional client-visible tab-list fallback; this does not enable PAT by itself
NEXT_PUBLIC_LOAD_TABS=profile,preferences,security,sessions,organizations,identities,dev`}
        />
        <p style={styles.textStyle}>
          PAT management is an explicit opt-in: set the private{' '}
          <code style={styles.codeSmStyle}>PAT_ENABLED=true</code> flag, include{' '}
          <code style={styles.codeSmStyle}>dev</code> (or an alias) in an explicit tab list,
          and configure the existing M2M application for Logto Management API access. Only
          a trimmed, case-normalized value of <code style={styles.codeSmStyle}>true</code>{' '}
          enables the feature. Missing, empty, <code style={styles.codeSmStyle}>false</code>,{' '}
          <code style={styles.codeSmStyle}>1</code>, and every other value leave it off.
        </p>
        <div style={styles.noteStyle}>
          <strong style={styles.strongNoteStyle}>Private flag:</strong>{' '}
          There is no public-prefixed PAT enablement flag. While PAT is disabled, the
          canonical <code style={styles.codeSmStyle}>dev</code> value and all of its aliases
          are removed after alias resolution from both{' '}
          <code style={styles.codeSmStyle}>LOAD_TABS</code> and{' '}
          <code style={styles.codeSmStyle}>NEXT_PUBLIC_LOAD_TABS</code>. A mixed list keeps
          the order of its deduplicated non-Dev tabs. Missing, empty, all-invalid, or
          Dev-only input falls back to all non-Dev tabs in the existing default order.
        </div>
        <div style={styles.noteStyle}>
          <strong style={styles.strongNoteStyle}>No extra OIDC user scope:</strong>{' '}
          PAT management uses the existing server-side M2M configuration against the Logto
          Management API. Do not add a PAT scope to{' '}
          <code style={styles.codeSmStyle}>SCOPES</code> just to enable this tab.
        </div>
      </div>

      <div>
        <h2 id={slugify('Default-off server hard lock')} style={h2Style}>
          Default-off server hard lock
        </h2>
        <p style={styles.textStyle}>
          Navigation filtering is not the security boundary. When PAT is disabled, all four
          direct actions—list, create, rename, and delete—return{' '}
          <code style={styles.codeSmStyle}>PAT_DISABLED</code> before input validation,
          session access or introspection, M2M token acquisition, distributed lock or rate
          limiter work, identity verification, and any upstream Logto request.
        </p>
        <div style={styles.noteStyle}>
          <strong style={styles.strongNoteStyle}>No implicit revocation:</strong>{' '}
          Turning the flag off hides the Dev tab and denies future management actions. It
          does not revoke personal access tokens that already exist upstream in Logto.
        </div>
      </div>

      <div>
        <h2 id={slugify('Entry and verification lifecycle')} style={h2Style}>
          Entry and verification lifecycle
        </h2>
        <p style={styles.textStyle}>
          Like the Sessions tab, Dev is an auto-verifying tab. On entering the active Dev
          tab while unverified, a primary blue password modal opens immediately over a
          non-interactive locked skeleton. Only successful password verification{' '}
          <strong>and</strong> a successful PAT list fetch transition the tab to the
          interactive list. A valid password by itself never exposes an empty or half-loaded
          management surface.
        </p>
        <ol style={{ ...styles.textStyle, paddingLeft: '20px' }}>
          <li style={{ marginBottom: '8px' }}>
            The initial challenge is minted for the non-consuming{' '}
            <code style={styles.codeSmStyle}>view</code> purpose, which authorizes listing.
          </li>
          <li style={{ marginBottom: '8px' }}>
            Dismissing the modal suppresses automatic reopening for that visit. The
            skeleton then exposes a manual unlock control so the user can retry.
          </li>
          <li style={{ marginBottom: '8px' }}>
            The dashboard shell falls back to the prior ordinary tab when one is available.
            Sessions and Dev are excluded as fallback targets so dismissal cannot chain
            directly into another password prompt. If no ordinary tab is loaded, Dev stays
            selected with its manual unlock state.
          </li>
          <li>
            Verification expiry or an authorization failure clears the sensitive list and
            returns the view to its locked skeleton.
          </li>
        </ol>
        <div style={styles.noteStyle}>
          <strong style={styles.strongNoteStyle}>Sessions comparison:</strong>{' '}
          both tabs auto-open verification, render a locked skeleton, and require a
          verify-then-fetch success before becoming interactive. Dev additionally requires
          exactly one fresh purpose-specific password challenge for every mutation.
        </div>
      </div>

      <div>
        <h2 id={slugify('Purpose-scoped mutation security')} style={h2Style}>
          Purpose-scoped mutation security
        </h2>
        <p style={styles.textStyle}>
          Every create, rename, and delete requires a fresh password challenge. The client
          requests exactly one of <code style={styles.codeSmStyle}>pat.create</code>,{' '}
          <code style={styles.codeSmStyle}>pat.rename</code>, or{' '}
          <code style={styles.codeSmStyle}>pat.delete</code>; the server enforces that purpose
          and atomically consumes the verification record before the upstream mutation. A
          record issued for one operation cannot authorize another and cannot be replayed.
        </p>
        <p style={styles.textStyle}>
          All Dev modals follow the single-modal dashboard convention: they close via the
          header X, Escape, or backdrop click—never footer buttons, and overlays are never
          stacked. Create and rename are single value-step dialogs that close as they hand
          off to the password prompt; a recoverable failure reopens the form with the draft
          and a localized error intact, while cancelling the prompt ends the flow.
        </p>
        <div style={styles.noteStyle}>
          <strong style={styles.strongNoteStyle}>Visual intent:</strong>{' '}
          The <code style={styles.codeSmStyle}>view</code> prompt and the create and rename
          prompts use the primary blue verification treatment. Delete has no intermediate
          confirmation step: clicking Delete opens the password challenge directly with
          destructive red styling, exactly like the Sessions revoke flow.
        </div>
        <ul style={{ ...styles.textStyle, paddingLeft: '20px' }}>
          <li style={{ marginBottom: '8px' }}>
            <code style={styles.codeSmStyle}>verificationTimestamp</code> is CLIENT UX ONLY.
            It drives the local expiry display/timer and is never trusted on the return path.
          </li>
          <li style={{ marginBottom: '8px' }}>
            <code style={styles.codeSmStyle}>verification-cookie.ts</code> stores an httpOnly,
            HMAC-signed seal bound to the session-derived <code style={styles.codeSmStyle}>sub</code>,
            record ID, purpose, and server-authoritative expiry.
          </li>
          <li>
            <code style={styles.codeSmStyle}>requireVerifiedIdentity()</code> validates every
            binding and the expiry, then atomically claims mutation records. Redis provides
            cross-instance consumption when configured; the in-memory backend covers a
            single instance and failures are closed.
          </li>
        </ul>
      </div>

      <div>
        <h2 id={slugify('Management API boundary')} style={h2Style}>
          Management API boundary
        </h2>
        <p style={styles.textStyle}>
          Logto&apos;s Account API has no PAT endpoints, so these actions use only the
          Management API. The user ID is derived from live session-token introspection,
          never from client input. It is checked with{' '}
          <code style={styles.codeSmStyle}>assertSafeLogtoId</code> and encoded with{' '}
          <code style={styles.codeSmStyle}>encodeURIComponent</code> before URL interpolation.
          The M2M access token remains inside server actions, while the user&apos;s{' '}
          <code style={styles.codeSmStyle}>logto-verification-id</code> is forwarded on every
          Management API request.
        </p>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Operation</th>
              <th style={thStyle}>Management API request</th>
              <th style={thStyle}>Body / response rule</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={codeCellStyle}>List</td>
              <td style={tdStyle}>GET /api/users/&#123;userId&#125;/personal-access-tokens</td>
              <td style={tdStyle}>Token values are stripped server-side; malformed lists fail closed.</td>
            </tr>
            <tr>
              <td style={codeCellStyle}>Create</td>
              <td style={tdStyle}>POST /api/users/&#123;userId&#125;/personal-access-tokens</td>
              <td style={tdStyle}><code>&#123; name, expiresAt &#125;</code>; returns the value once.</td>
            </tr>
            <tr>
              <td style={codeCellStyle}>Rename</td>
              <td style={tdStyle}>PATCH /api/users/&#123;userId&#125;/personal-access-tokens</td>
              <td style={tdStyle}>Canonical body endpoint: <code>&#123; currentName, name &#125;</code>.</td>
            </tr>
            <tr>
              <td style={codeCellStyle}>Delete</td>
              <td style={tdStyle}>POST /api/users/&#123;userId&#125;/personal-access-tokens/delete</td>
              <td style={tdStyle}><code>&#123; name &#125;</code>; keeps arbitrary names out of the URL.</td>
            </tr>
          </tbody>
        </table>
        <p style={styles.textStyle}>
          The create dialog offers <strong>Never</strong>, <strong>30 days</strong>,{' '}
          <strong>60 days</strong>, <strong>90 days</strong>, and <strong>1 year</strong>
          expiry presets. Creation is limited per user to five attempts per ten minutes;
          failed upstream attempts remain charged. A distributed per-user mutation lock
          serializes create, rename, and delete operations (Redis-backed when configured,
          in-memory otherwise, and fail-closed on Redis outage).
        </p>
      </div>

      <div>
        <h2 id={slugify('One-time value and token exchange')} style={h2Style}>
          One-time value and token exchange
        </h2>
        <p style={styles.textStyle}>
          A new PAT&apos;s value is shown only in the post-create result modal. That modal is
          deliberately limited to the <strong>Token created</strong> title, the full one-time
          token value, and copy and close controls—no token metadata, usage prose, endpoint
          placeholders, or generated exchange snippet. It has no subtitle and no footer; the
          header X, Escape, and the backdrop are its only close controls. The value is
          committed to UI state
          before the best-effort background list refresh, so a refresh failure cannot erase
          it; it remains visible until the user explicitly closes the modal. The value is
          never available from list responses afterward.
        </p>
        <p style={styles.textStyle}>
          The synthetic exchange below is separate external usage guidance for a client
          using the newly copied credential. It is documentation only and is not content in
          the token result modal.
        </p>
        <CodeBlock
          title="Synthetic PAT token exchange"
          code={`POST https://auth.example.test/oidc/token
Content-Type: application/x-www-form-urlencoded

grant_type=urn:ietf:params:oauth:grant-type:token-exchange
&subject_token=pat_synthetic_example_value
&subject_token_type=urn:logto:token-type:personal_access_token
&client_id=your-application-id
&resource=https://api.example.test
&scope=read:example`}
        />
        <ul style={{ ...styles.textStyle, paddingLeft: '20px' }}>
          <li style={{ marginBottom: '8px' }}>
            <code style={styles.codeSmStyle}>client_id</code> is required. Public SPA/native
            clients send it in the form body. Only confidential web clients that can protect
            a client secret should authenticate with HTTP Basic using their app ID and secret.
          </li>
          <li style={{ marginBottom: '8px' }}>
            Exchange the PAT as the <code style={styles.codeSmStyle}>subject_token</code> for
            the target application/resource. Do not use an M2M client token as the subject
            token and do not confuse PAT exchange with the M2M client-credentials flow.
          </li>
          <li>
            Never place PAT values in logs, source control, screenshots, support tickets, or
            browser-persisted configuration. The example above is deliberately synthetic.
          </li>
        </ul>
      </div>

      <div>
        <h2 id={slugify('Component and action contracts')} style={h2Style}>
          Component and action contracts
        </h2>
        <CodeBlock
          title="DevTab props"
          code={`interface DevTabProps {
  userData: UserData;
  mode: 'dark' | 'light';
  colors: ThemeColors;
  t: Translations;
  mobmode?: number;
  isActive?: boolean;
  onVerificationDismissed?: () => void;
  onGetPatTokens: (verificationRecordId: string) => Promise<DataResult<PatToken[]>>;
  onCreatePatToken: (name: string, expiresAt: number | null, verificationRecordId: string)
    => Promise<DataResult<{ token: PatToken; value: string }>>;
  onRenamePatToken: (currentName: string, name: string, verificationRecordId: string)
    => Promise<ActionResult>;
  onDeletePatToken: (name: string, verificationRecordId: string)
    => Promise<ActionResult>;
  onVerifyPassword: (password: string, purpose?: VerificationPurpose)
    => Promise<DataResult<{ verificationRecordId: string; verificationTimestamp: number }>>;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}`}
        />
        <CodeBlock
          title="Server action signatures"
          code={`getPatTokens(verificationRecordId: string): Promise<DataResult<PatToken[]>>
createPatToken(name: string, expiresAt: number | null, verificationRecordId: string):
  Promise<DataResult<{ token: PatToken; value: string }>>
renamePatToken(currentName: string, name: string, verificationRecordId: string):
  Promise<ActionResult>
deletePatToken(name: string, verificationRecordId: string): Promise<ActionResult>
verifyPasswordForIdentity(password: string, purpose?: VerificationPurpose):
  Promise<DataResult<{ verificationRecordId: string; verificationTimestamp: number }>>`}
        />
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>File</th>
              <th style={thStyle}>Responsibility</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={codeCellStyle}>components/dashboard/tabs/dev.tsx</td>
              <td style={tdStyle}>Locked skeleton, modal lifecycle, PAT list, one-time value, and mutation staging.</td>
            </tr>
            <tr>
              <td style={codeCellStyle}>logic/actions/pat.ts</td>
              <td style={tdStyle}>Management API actions, validation, rate limit, lock, value stripping, and audit events.</td>
            </tr>
            <tr>
              <td style={codeCellStyle}>logic/actions/verification-cookie.ts</td>
              <td style={tdStyle}>HMAC seal, sub/record/purpose/expiry binding, and atomic single-use consumption.</td>
            </tr>
            <tr>
              <td style={codeCellStyle}>logic/actions/management-request.ts</td>
              <td style={tdStyle}>Contained bearer token, reserved headers, no-store fetches, and request timeout.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
