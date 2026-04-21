'use client';

import CodeBlock from '../../utils/CodeBlock';
import { SectionContainer, Section } from '../../utils/Section';

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
  background: 'rgba(255,255,255,0.02)',
  color: 'rgba(255,255,255,0.6)',
  fontWeight: 600,
};

const tdStyle: React.CSSProperties = {
  padding: '7px 10px',
  borderBottom: '1px solid rgba(255,255,255,0.03)',
  color: 'rgba(255,255,255,0.5)',
};

function SessionsOverviewSection() {
  return (
    <div style={sectionWrapStyle}>
      <div style={sectionHeadStyle}>
        <div style={sectionDotStyle} />
        <span style={sectionLabelStyle}>Sessions Tab</span>
      </div>
      <div style={sectionBodyStyle}>
        <p style={textStyle}>
          The Sessions tab provides users with a comprehensive view of their active authentication sessions across all devices.
          Users can see where they&apos;re currently signed in, view device and browser information with IP geolocation,
          and revoke individual sessions for security purposes.
        </p>

        <p style={textStyle}>
          <strong>Key Features:</strong>
        </p>
        <ul style={{ ...textStyle, marginLeft: '1rem', marginBottom: '0.75rem' }}>
          <li>Real-time session listing from Logto Account API</li>
          <li>Current session identification with visual indicators</li>
          <li>Password-protected session revocation</li>
          <li>Identity verification required before viewing sessions</li>
          <li>IP geolocation minimap per session card (client-side ipapi.co)</li>
          <li>Expanded Google Maps modal with satellite view on click</li>
          <li>Refresh data button to clear cache and re-fetch</li>
        </ul>

        <div style={noteStyle}>
          <strong>Note:</strong> Logto&apos;s Account API provides session metadata (session ID, authentication
          method, login time, expiry) but does NOT provide IP, browser, or OS information per session.
          Device metadata must be captured via your own infrastructure. IP geolocation is resolved client-side
          via <code style={codeSmStyle}>ipapi.co</code> (free, no API key, 1,000 req/day per client IP) with a 5-minute
          client-side cache.
        </div>
      </div>
    </div>
  );
}

function SessionsPropsSection() {
  return (
    <div style={sectionWrapStyle}>
      <div style={sectionHeadStyle}>
        <div style={sectionDotStyle} />
        <span style={sectionLabelStyle}>Props</span>
      </div>
      <div style={sectionBodyStyle}>
<CodeBlock title="Props" code={`interface SessionsTabProps {
  userData: UserData;
  theme: ThemeSpec;
  t: Translations;
  onGetSessionsWithDeviceMeta: (verificationRecordId: string) => Promise<LogtoSession[]>;
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
              <td style={tdStyle}>Fetches sessions + current session JTI</td>
            </tr>
            <tr>
              <td style={tdStyle}><code style={codeStyle}>onRevokeSession</code></td>
              <td style={tdStyle}>Server Action</td>
              <td style={tdStyle}>Revokes a session (requires identity verification)</td>
            </tr>
            <tr>
              <td style={tdStyle}><code style={codeStyle}>onVerifyPassword</code></td>
              <td style={tdStyle}>Server Action</td>
              <td style={tdStyle}>Verifies password for sensitive operations</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SessionsApiSection() {
  return (
    <div style={sectionWrapStyle}>
      <div style={sectionHeadStyle}>
        <div style={sectionDotStyle} />
        <span style={sectionLabelStyle}>Server Actions</span>
      </div>
      <div style={sectionBodyStyle}>
        <CodeBlock title="getSessionsWithDeviceMeta" code={`export async function getSessionsWithDeviceMeta(verificationRecordId: string): Promise<LogtoSession[]> {
  const sessions = await getUserSessions(verificationRecordId);

  // ... enrich with device metadata from signInContext
  return sessions;
}`} />

        <p style={textStyle}>
          The server action:
        </p>

        <ul style={{ ...textStyle, marginLeft: '1rem', marginBottom: '0.75rem' }}>
          <li>Verifies user identity via <code style={codeSmStyle}>logto-verification-id</code> header</li>
          <li>Fetches active sessions from <code style={codeSmStyle}>GET /api/my-account/sessions</code></li>
          <li>Determines current session via token introspection (<code style={codeSmStyle}>sid || jti</code>)</li>
        </ul>
      </div>
    </div>
  );
}

function SessionsGeolocationSection() {
  return (
    <div style={sectionWrapStyle}>
      <div style={sectionHeadStyle}>
        <div style={sectionDotStyle} />
        <span style={sectionLabelStyle}>IP Geolocation</span>
      </div>
      <div style={sectionBodyStyle}>
        <p style={textStyle}>
          Each session card includes an IP geolocation minimap that shows the approximate location
          of the session&apos;s IP address. The minimap is a static tile thumbnail using CartoDB tiles
          (dark theme for dark mode, light theme for light mode) with a red pin marker at the location.
        </p>

        <p style={textStyle}>
          <strong>How it works:</strong>
        </p>
        <ul style={{ ...textStyle, marginLeft: '1rem', marginBottom: '0.75rem' }}>
          <li>Client-side geolocation via <code style={codeSmStyle}>GET https://ipapi.co/{'{ip}'}/json/</code> — free, no API key, HTTPS, 1,000 req/day per client IP</li>
          <li>5-minute client-side cache (<code style={codeSmStyle}>geo-cache.ts</code>) with deduplication of in-flight requests</li>
          <li>Minimap renders a single @2x tile at zoom 13 from CartoDB (dark_all / light_all) centered on the IP&apos;s lat/lon</li>
          <li>Clicking the minimap opens a <strong>Google Maps embed modal</strong> with a &quot;View in Google Maps&quot; external link (satellite view)</li>
          <li>&quot;Refresh&quot; button clears geo cache and re-fetches session data</li>
        </ul>

        <p style={textStyle}>
          <strong>Card layout:</strong>
        </p>
        <ul style={{ ...textStyle, marginLeft: '1rem', marginBottom: '0.75rem' }}>
          <li><code style={codeSmStyle}>[OS Icon]</code> — <code style={codeSmStyle}>[Title + Timestamps]</code> — <code style={codeSmStyle}>[Minimap 260px wide]</code> — <code style={codeSmStyle}>[Revoke + IP label]</code></li>
          <li>IP and city/country label shown below the Revoke button (stacked vertically)</li>
          <li>Minimap stretches full card height edge-to-edge; card has fixed 80px height</li>
        </ul>

        <CodeBlock title="Files" code={`// Geolocation cache — client-side ipapi.co fetch with 5min TTL
app/logto-kit/components/dashboard/shared/geo-cache.ts

// Static tile minimap component (single @2x CartoDB tile + CSS pin)
app/logto-kit/components/dashboard/shared/SessionMiniMap.tsx

// Expanded modal — Google Maps embed iframe + "View in Google Maps" link
app/logto-kit/components/dashboard/shared/SessionMapModal.tsx`} />
      </div>
    </div>
  );
}

function SessionsUiSection() {
  return (
    <div style={sectionWrapStyle}>
      <div style={sectionHeadStyle}>
        <div style={sectionDotStyle} />
        <span style={sectionLabelStyle}>UI Components</span>
      </div>
      <div style={sectionBodyStyle}>
        <p style={textStyle}>
          The Sessions tab uses a card-based layout with device-specific icons, IP geolocation minimaps,
          and visual indicators for the current session. Each session card shows browser/OS info,
          timestamps, a location minimap, and a revoke button.
        </p>

        <CodeBlock title="Session Card Structure" code={`<div className="session-card" style={{ height: '80px' }}>
  {/* OS Icon — 40px */}
  <OsIcon os={os} deviceType={deviceType} size={40} />

  {/* Session Info — title, logged on, expires */}
  <div className="session-info">
    <h3>{browser} {browserVersion} · {os} {osVersion}</h3>
    <span>Logged on: {loginTs}</span>
    <span>Expires: {exp}</span>
  </div>

  {/* IP Geolocation Minimap — 260px wide, full card height */}
  <SessionMiniMap ip={ip} onClick={openMapModal} />

  {/* Revoke Button + IP/Location label */}
  <div>
    <Button variant="danger" onClick={revoke}>Revoke</Button>
    <span>{ip}<br/>{city}, {country}</span>
  </div>
</div>`} />

        <p style={textStyle}>
          <strong>Visual Features:</strong>
        </p>
        <ul style={{ ...textStyle, marginLeft: '1rem', marginBottom: '0.75rem' }}>
          <li>Device-specific icons (Linux, Windows, macOS, iOS, Android)</li>
          <li>IP geolocation minimap with CartoDB dark/light tiles (theme-aware)</li>
          <li>Click minimap to open Google Maps embed modal (street view + &quot;View in Google Maps&quot; link for satellite)</li>
          <li>IP address with city/country label below the Revoke button</li>
          <li>Refresh button to clear geo cache and re-fetch session data</li>
          <li>Password verification modal for revocation</li>
          <li>Responsive design matching dashboard theme</li>
        </ul>
      </div>
    </div>
  );
}

export default function SessionsDoc() {
  return (
    <SectionContainer>
      {/* Page 1: Overview + Props */}
      <Section id={1}>
        <div style={{ ...twoColLayoutStyle, height: '100%', padding: '16px' }}>
          <div style={colLeftStyle}>
            <SessionsOverviewSection />
          </div>
          <div style={colLeftStyle}>
            <SessionsPropsSection />
          </div>
        </div>
      </Section>

      {/* Page 2: API */}
      <Section id={2}>
        <div style={{ ...twoColLayoutStyle, height: '100%', padding: '16px' }}>
          <div style={{ ...colLeftStyle, gridColumn: '1 / -1' }}>
            <SessionsApiSection />
          </div>
        </div>
      </Section>

      {/* Page 3: Geolocation */}
      <Section id={3}>
        <div style={{ ...twoColLayoutStyle, height: '100%', padding: '16px' }}>
          <div style={colLeftStyle}>
            <SessionsGeolocationSection />
          </div>
          <div style={colLeftStyle}>
            <SessionsUiSection />
          </div>
        </div>
      </Section>
    </SectionContainer>
  );
}