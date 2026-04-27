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
          The Sessions tab provides users with a view of their active authentication sessions
          across all devices. Users can see their sessions, view device information where available,
          and revoke individual sessions for security purposes.
        </p>

        <p style={styles.textStyle}>
          <strong>Key Features:</strong>
        </p>
        <ul style={{ ...styles.textStyle, marginLeft: '1rem', marginBottom: '0.75rem' }}>
          <li>Session listing from Logto Account API</li>
          <li>Current session identification (via JTI matching - see Limitations)</li>
          <li>Password-protected session revocation</li>
          <li>IP geolocation minimap via ipapi.co</li>
          <li>Refresh button to re-fetch session data</li>
        </ul>

        <div style={styles.warningBannerStyle}>
          <strong style={styles.warningBannerStrongStyle}>⚠ IN DEVELOPMENT</strong> — The Sessions tab is
          functional but incomplete. Logto's Account API for sessions is still evolving (v1.38+). This
          implementation works around Logto limitations. See Limitations below.
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
          <li>Matches current session via token JTI</li>
        </ul>

        <CodeBlock title="Session type" code={`interface LogtoSession {
  payload: {
    uid: string;      // session ID
    jti: string;     // JWT ID - for matching current session
    loginTs: number; // login timestamp
    exp: number;     // expiry timestamp
    accountId: string;
  };
  meta?: {
    ip: string | null;
    browser: string | null;
    browserVersion: string | null;
    os: string | null;
    osVersion: string | null;
    deviceType: string | null;
  };
  expiresAt: number;
}`} />
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
          The Sessions tab implementation works around Logto API limitations. These will improve as Logto's
          Account API matures.
        </p>

        <div style={styles.noteStyle}>
          <strong style={styles.strongNoteStyle}>No Current Session Identifier</strong> — Logto's Account API does
          not expose which session is the current one. This is{' '}
          <a href="https://github.com/logto-io/logto/issues/8681" target="_blank" rel="noopener noreferrer" style={{ color: styles.linkColor }}>
            GitHub Issue #8681
          </a>. Current workaround: match session JTI against access token introspection. This is fragile and may not
          work in all scenarios.
        </div>

        <div style={styles.noteStyle}>
          <strong style={styles.strongNoteStyle}>Incomplete Device Metadata</strong> — Device metadata
          (browser, OS, IP) depends on Logto capturing it during login. Not all sessions have this data. Logto is working on
          improving this.
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
        <div style={{ ...styles.twoColLayoutStyle, height: '100%', padding: '16px' }}>
          <div style={styles.colLeftStyle}>
            <SessionsOverviewSection />
          </div>
          <div style={styles.colLeftStyle}>
            <SessionsPropsSection />
          </div>
        </div>
      </Section>

      {/* Page 2: API + Geolocation */}
      <Section id={2}>
        <div style={{ ...styles.twoColLayoutStyle, height: '100%', padding: '16px' }}>
          <div style={styles.colLeftStyle}>
            <SessionsApiSection />
          </div>
          <div style={styles.colLeftStyle}>
            <SessionsGeolocationSection />
          </div>
        </div>
      </Section>

      {/* Page 3: Limitations */}
      <Section id={3}>
        <div style={{ ...styles.twoColLayoutStyle, height: '100%', padding: '16px' }}>
          <div style={{ ...styles.colLeftStyle, gridColumn: '1 / -1' }}>
            <SessionsLimitationsSection />
          </div>
        </div>
      </Section>
    </SectionContainer>
  );
}