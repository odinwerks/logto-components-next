'use client';

import CodeBlock from '../../utils/CodeBlock';
import { SectionContainer, Section } from '../../utils/Section';
import { useDocStyles } from '../../utils/useDocStyles';

function SessionsOverviewSection() {
  const styles = useDocStyles();
  return (
    <div style={styles.sectionWrapStyle}>
      <div style={styles.sectionHeadStyle}>
        <div style={styles.sectionDotStyle} />
        <span style={styles.sectionLabelStyle}>Sessions Tab</span>
      </div>
      <div style={styles.sectionBodyStyle}>
        <p style={styles.textStyle}>
          The Sessions tab provides users with a full view of their active authentication sessions
          across all devices. Users can see session activity, identify the current device,
          and revoke individual or all other sessions for security purposes.
        </p>

        <p style={styles.textStyle}>
          <strong>Key Features:</strong>
        </p>
        <ul style={{ ...styles.textStyle, marginLeft: '1rem', marginBottom: '0.75rem' }}>
          <li>Session listing from Logto Account API</li>
          <li>Current session identification via <code style={styles.codeSmStyle}>isCurrent</code> flag — shown as a green "This device" badge</li>
          <li><code style={styles.codeSmStyle}>lastActiveAt</code> — shows when each session was last active</li>
          <li>Automatic 30s heartbeat keeps <code style={styles.codeSmStyle}>lastActiveAt</code> current for the active tab</li>
          <li>Password-protected session view and revocation</li>
          <li>IP geolocation minimap via ipapi.co</li>
          <li>"Revoke all other sessions" — safe-guarded: aborts if no <code style={styles.codeSmStyle}>isCurrent</code> session is found</li>
        </ul>

        <div style={styles.warningBannerStyle}>
          <strong style={styles.warningBannerStrongStyle}>⚠ Logto Fork Required</strong> — The{' '}
          <code style={styles.codeSmStyle}>isCurrent</code> flag, <code style={styles.codeSmStyle}>lastActiveAt</code>,
          and heartbeat endpoint require a patched Logto backend. Until{' '}
          <a href="https://github.com/logto-io/logto/pull/8748" target="_blank" rel="noopener noreferrer" style={{ color: styles.linkColor }}>
            upstream PR #8748
          </a>{' '}
          is merged, you must run Logto from the fork branch:{' '}
          <a href="https://github.com/odinwerks/logto/tree/feat/session-last-active-at" target="_blank" rel="noopener noreferrer" style={{ color: styles.linkColor }}>
            odinwerks/logto — feat/session-last-active-at
          </a>.
        </div>
      </div>
    </div>
  );
}

function SessionsPropsSection() {
  const styles = useDocStyles();
  return (
    <div style={styles.sectionWrapStyle}>
      <div style={styles.sectionHeadStyle}>
        <div style={styles.sectionDotStyle} />
        <span style={styles.sectionLabelStyle}>Props</span>
      </div>
      <div style={styles.sectionBodyStyle}>
<CodeBlock title="Props" code={`interface SessionsTabProps {
  userData: UserData;
  theme: ThemeSpec;
  t: Translations;
  onGetSessions: (verificationRecordId: string) => Promise<LogtoSession[]>;
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

        <table style={styles.tableStyle}>
          <thead>
            <tr>
              <th style={styles.thStyle}>Prop</th>
              <th style={styles.thStyle}>Type</th>
              <th style={styles.thStyle}>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.tdStyle}><code style={styles.codeStyle}>onGetSessions</code></td>
              <td style={styles.tdStyle}>Server Action</td>
              <td style={styles.tdStyle}>Fetches sessions from Logto API</td>
            </tr>
            <tr>
              <td style={styles.tdStyle}><code style={styles.codeStyle}>onRevokeSession</code></td>
              <td style={styles.tdStyle}>Server Action</td>
              <td style={styles.tdStyle}>Revokes a session</td>
            </tr>
            <tr>
              <td style={styles.tdStyle}><code style={styles.codeStyle}>onVerifyPassword</code></td>
              <td style={styles.tdStyle}>Server Action</td>
              <td style={styles.tdStyle}>Verifies password for sensitive operations</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SessionsApiSection() {
  const styles = useDocStyles();
  return (
    <div style={styles.sectionWrapStyle}>
      <div style={styles.sectionHeadStyle}>
        <div style={styles.sectionDotStyle} />
        <span style={styles.sectionLabelStyle}>Server Actions</span>
      </div>
      <div style={styles.sectionBodyStyle}>
        <CodeBlock title="getSessions" code={`export async function getSessions(verificationRecordId: string): Promise<LogtoSession[]> {
  const res = await makeRequest('/api/my-account/sessions', {
    extraHeaders: { 'logto-verification-id': verificationRecordId },
  });
  const data = await res.json();
  return data.sessions ?? [];
}`} />

        <p style={styles.textStyle}>
          The server action:
        </p>
        <ul style={{ ...styles.textStyle, marginLeft: '1rem', marginBottom: '0.75rem' }}>
          <li>Verifies user identity via <code style={styles.codeSmStyle}>logto-verification-id</code> header</li>
          <li>Fetches sessions from <code style={styles.codeSmStyle}>GET /api/my-account/sessions</code></li>
          <li>The <code style={styles.codeSmStyle}>isCurrent</code> flag is set by Logto on the session backing the request token</li>
        </ul>

        <CodeBlock title="Session type" code={`interface LogtoSession {
  payload: {
    uid: string;       // session UID — matches sessionUid from auth context
    jti: string;       // JWT ID
    loginTs: number;   // login timestamp (seconds)
    exp: number;       // expiry timestamp (seconds)
    accountId: string;
  };
  lastSubmission: { signInContext?: { ip?: string; userAgent?: string } } | null;
  clientId: string | null;
  accountId: string | null;
  expiresAt: number;
  isCurrent?: boolean;          // true for the session backing this request
  lastActiveAt?: string | null; // null | "now" | ISO 8601
  meta: SessionMeta | null;     // enriched client-side after fetch
}`} />
      </div>
    </div>
  );
}

function HeartbeatSection() {
  const styles = useDocStyles();
  return (
    <div style={styles.sectionWrapStyle}>
      <div style={styles.sectionHeadStyle}>
        <div style={styles.sectionDotStyle} />
        <span style={styles.sectionLabelStyle}>Heartbeat & lastActiveAt</span>
      </div>
      <div style={styles.sectionBodyStyle}>
        <p style={styles.textStyle}>
          A zero-UI <code style={styles.codeSmStyle}>SessionHeartbeat</code> client component is mounted
          in root <code style={styles.codeSmStyle}>layout.tsx</code>. It fires{' '}
          <code style={styles.codeSmStyle}>recordHeartbeat()</code> every 30 seconds and on tab
          visibility change, keeping <code style={styles.codeSmStyle}>lastActiveAt</code> current
          without any user interaction.
        </p>

        <table style={styles.tableStyle}>
          <thead>
            <tr>
              <th style={styles.thStyle}>Value</th>
              <th style={styles.thStyle}>Meaning</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.tdStyle}><code style={styles.codeSmStyle}>null</code></td>
              <td style={styles.tdStyle}>No heartbeat ever received (session pre-dates fork deploy or non-browser)</td>
            </tr>
            <tr>
              <td style={styles.tdStyle}><code style={styles.codeSmStyle}>"now"</code></td>
              <td style={styles.tdStyle}>Active within 60 seconds — shown in green as "Active now"</td>
            </tr>
            <tr>
              <td style={styles.tdStyle}>ISO 8601</td>
              <td style={styles.tdStyle}>Last heartbeat timestamp (e.g. <code style={styles.codeSmStyle}>"2025-05-02T10:30:00Z"</code>)</td>
            </tr>
          </tbody>
        </table>

        <CodeBlock title="logto-kit/logic/actions/heartbeat.ts" code={`// logto-kit/logic/actions/heartbeat.ts
'use server';
export async function recordHeartbeat(): Promise<void> {
  try {
    await makeRequest('/api/my-account/sessions/heartbeat', { method: 'POST' });
  } catch { /* best-effort */ }
}`} />

        <div style={styles.noteStyle}>
          <strong style={styles.strongNoteStyle}>Token as session identifier</strong> — The heartbeat
          uses the opaque Bearer token in the request. Logto looks up the token in its DB to find
          the <code style={styles.codeSmStyle}>sessionUid</code> — no explicit session ID is needed.
        </div>
      </div>
    </div>
  );
}

function SessionsGeolocationSection() {
  const styles = useDocStyles();
  return (
    <div style={styles.sectionWrapStyle}>
      <div style={styles.sectionHeadStyle}>
        <div style={styles.sectionDotStyle} />
        <span style={styles.sectionLabelStyle}>IP Geolocation</span>
      </div>
      <div style={styles.sectionBodyStyle}>
        <p style={styles.textStyle}>
          Each session card includes an IP geolocation minimap (where IP is available).
          This is Client-side and separate from Logto - uses ipapi.co to resolve IP to location.
        </p>

        <ul style={{ ...styles.textStyle, marginLeft: '1rem', marginBottom: '0.75rem' }}>
          <li>Client-side geolocation via <code style={styles.codeSmStyle}>GET https://ipapi.co/{'{ip}'}/json/</code> — free, no API key, 1,000 req/day</li>
          <li>5-minute client-side cache</li>
          <li>Minimap uses CartoDB tiles (dark_all / light_all)</li>
          <li>Click minimap to open Google Maps embed modal</li>
        </ul>

        <CodeBlock title="Related files" code={`// Geolocation cache (5min TTL)
app/logto-kit/components/dashboard/shared/geo-cache.ts

// Static tile minimap
app/logto-kit/components/dashboard/shared/SessionMiniMap.tsx

// Google Maps modal
app/logto-kit/components/dashboard/shared/SessionMapModal.tsx`} />
      </div>
    </div>
  );
}

function SessionsLimitationsSection() {
  const styles = useDocStyles();
  return (
    <div style={styles.sectionWrapStyle}>
      <div style={styles.sectionHeadStyle}>
        <div style={styles.sectionDotStyle} />
        <span style={styles.sectionLabelStyle}>Limitations</span>
      </div>
      <div style={styles.sectionBodyStyle}>
        <p style={styles.textStyle}>
          The Sessions tab implementation has a small number of remaining limitations tied to
          Logto's evolving sessions API.
        </p>

        <div style={styles.noteStyle}>
          <strong style={styles.strongNoteStyle}>Incomplete Device Metadata</strong> — Device metadata
          (browser, OS, IP) depends on Logto capturing it during login. Not all sessions have this data. Logto is working on
          improving this.
        </div>

        <div style={styles.noteStyle}>
          <strong style={styles.strongNoteStyle}>lastActiveAt only after first heartbeat</strong> —{' '}
          <code style={styles.codeSmStyle}>lastActiveAt</code> is only populated after the first heartbeat
          is received. Sessions that existed before deploying the fork, or non-browser sessions, show no
          last active time until a heartbeat is received.
        </div>

        <p style={{ ...styles.textStyle, marginTop: '0.75rem' }}>
          These limitations are due to Logto's evolving sessions API, not this implementation. As Logto improves
          their API, this tab will be updated.
        </p>
      </div>
    </div>
  );
}

export default function SessionsDoc() {
  const styles = useDocStyles();
  return (
    <SectionContainer>
      {/* Page 1: Overview + Props */}
      <Section id={1}>
        <div style={{ ...styles.twoColLayoutStyle, minHeight: '100%', padding: '16px' }}>
          <div style={styles.colLeftStyle}>
            <SessionsOverviewSection />
          </div>
          <div style={styles.colLeftStyle}>
            <SessionsPropsSection />
          </div>
        </div>
      </Section>

      {/* Page 2: API + Heartbeat + Geolocation */}
      <Section id={2}>
        <div style={{ ...styles.twoColLayoutStyle, minHeight: '100%', padding: '16px' }}>
          <div style={styles.colLeftStyle}>
            <SessionsApiSection />
          </div>
          <div style={styles.colLeftStyle}>
            <HeartbeatSection />
            <SessionsGeolocationSection />
          </div>
        </div>
      </Section>

      {/* Page 3: Limitations */}
      <Section id={3}>
        <div style={{ ...styles.twoColLayoutStyle, minHeight: '100%', padding: '16px' }}>
          <div style={{ ...styles.colLeftStyle, gridColumn: '1 / -1' }}>
            <SessionsLimitationsSection />
          </div>
        </div>
      </Section>
    </SectionContainer>
  );
}
