'use client';

import CodeBlock from '../../components/SyntaxBlock';
import { useDocStyles } from '../../components/useDocStyles';
import { SectionWrap } from '../../components/SectionComponents';

export default function SessionsSection() {
  const styles = useDocStyles();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <SectionWrap label="Sessions Tab Component & Props">
        <p style={styles.textStyle}>
          The <code style={styles.codeStyle}>SessionsTab</code> component retrieves, displays, and manages active user sessions using Logto&apos;s Account API. It gates access to sensitive connection data through password identity challenges and allows users to track and revoke active sessions.
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
                The main user profile dataset, containing identifiers and customData.
              </td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>mode</td>
              <td style={styles.tdTypeStyle}>&apos;dark&apos; | &apos;light&apos;</td>
              <td style={styles.tdStyle}>
                The active theme mode determining layout and component colors.
              </td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>colors</td>
              <td style={styles.tdTypeStyle}>ThemeColors</td>
              <td style={styles.tdStyle}>
                The primary styling token mapping containing hexadecimal color definitions.
              </td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>t</td>
              <td style={styles.tdTypeStyle}>Translations</td>
              <td style={styles.tdStyle}>
                Static key-value strings localized to the active language catalog.
              </td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>mobmode</td>
              <td style={styles.tdTypeStyle}>number?</td>
              <td style={styles.tdStyle}>
                Optional flag where 1 signals mobile screen dimensions to shrink padding and layout structures.
              </td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>onGetSessionsWithDeviceMeta</td>
              <td style={styles.tdTypeStyle}>(verificationId: string) =&gt; Promise&lt;DataResult&lt;LogtoSession[]&gt;&gt;</td>
              <td style={styles.tdStyle}>
                Asynchronously retrieves user sessions with parsed operating system and browser metadata.
              </td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>onRevokeSession</td>
              <td style={styles.tdTypeStyle}>(id: string, verificationId: string, target?: &apos;all&apos; | &apos;firstParty&apos;) =&gt; Promise&lt;ActionResult&gt;</td>
              <td style={styles.tdStyle}>
                Revokes a specific active session. The target is set to &apos;firstParty&apos; to revoke first-party application grants.
              </td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>onRevokeAllOtherSessions</td>
              <td style={styles.tdTypeStyle}>(verificationId: string) =&gt; Promise&lt;ActionResult&gt;</td>
              <td style={styles.tdStyle}>
                Terminates all active user sessions except the caller&apos;s current active connection context.
              </td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>onVerifyPassword</td>
              <td style={styles.tdTypeStyle}>(password: string) =&gt; Promise&lt;DataResult&lt;&#123; verificationRecordId: string &#125;&gt;&gt;</td>
              <td style={styles.tdStyle}>
                Verifies user credentials to return a secure verification record ID and timestamp.
              </td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>onSuccess</td>
              <td style={styles.tdTypeStyle}>(msg: string) =&gt; void</td>
              <td style={styles.tdStyle}>
                Dispatches feedback notifications upon successful operations.
              </td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>onError</td>
              <td style={styles.tdTypeStyle}>(msg: string) =&gt; void</td>
              <td style={styles.tdStyle}>
                Dispatches feedback notifications when operations fail.
              </td>
            </tr>
          </tbody>
        </table>

        <CodeBlock
          title="Sessions Tab Component Interface"
          code={`interface SessionsTabProps {
  userData: UserData;
  mode: 'dark' | 'light';
  colors: ThemeColors;
  t: Translations;
  mobmode?: number;
  onGetSessionsWithDeviceMeta: (verificationRecordId: string) => Promise<DataResult<LogtoSession[]>>;
  onRevokeSession: (sessionId: string, identityVerificationRecordId: string, revokeGrantsTarget?: 'all' | 'firstParty') => Promise<ActionResult>;
  onRevokeAllOtherSessions: (verificationRecordId: string) => Promise<ActionResult>;
  onVerifyPassword: (password: string) => Promise<DataResult<{ verificationRecordId: string }>>;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}`}
        />
      </SectionWrap>

      <SectionWrap label="Identity Verification & State Lifecycle">
        <p style={styles.textStyle}>
          Active sessions contain sensitive metadata (including IP addresses and device browser strings). Access to the sessions list is locked behind password identity confirmation.
        </p>

        <h4 style={{ ...styles.textStyle, fontWeight: 600, marginTop: '16px', marginBottom: '8px' }}>
          Verification Records and TTL Policy
        </h4>
        <p style={styles.textStyle}>
          On successful password challenge, the system generates a secure <code style={styles.codeSmStyle}>verificationRecordId</code>. This token remains valid for exactly 10 minutes (<code style={styles.codeSmStyle}>VERIFICATION_TTL_MS = 600,000ms</code>).
        </p>
        <p style={styles.textStyle}>
          An active client-side <code style={styles.codeSmStyle}>useEffect</code> hook monitors the remaining validity period. When the countdown completes, it automatically purges the token and resets the view state back to <code style={styles.codeSmStyle}>unverified</code>, forcing a re-verification.
        </p>

        <h4 style={{ ...styles.textStyle, fontWeight: 600, marginTop: '16px', marginBottom: '8px' }}>
          State Isolation Guards
        </h4>
        <p style={styles.textStyle}>
          The component implements guards to prevent half-authenticated layouts or broken interactions:
        </p>
        <ul style={{ ...styles.textStyle, paddingLeft: '20px', listStyleType: 'disc' }}>
          <li style={{ marginBottom: '8px' }}>
            <strong>Fetch-First Timing Guard:</strong> During initial authentication inside <code style={styles.codeSmStyle}>verifyAndLoad</code>, the view state is set to <code style={styles.codeSmStyle}>loaded</code> only after the backend successfully retrieves the sessions list. If the fetch fails, the view stays in the <code style={styles.codeSmStyle}>unverified</code> layout and discards the verification record, blocking inconsistent states.
          </li>
          <li style={{ marginBottom: '8px' }}>
            <strong>Transient Error Handling:</strong> When refreshing session data inside <code style={styles.codeSmStyle}>loadSessions</code>, the layout only resets to <code style={styles.codeSmStyle}>unverified</code> if the failure is auth-related (e.g., <code style={styles.codeSmStyle}>VERIFICATION_FAILED</code> or <code style={styles.codeSmStyle}>UNAUTHORIZED</code>). If a transient issue occurs (such as a <code style={styles.codeSmStyle}>NETWORK_ERROR</code>), the view state remains in <code style={styles.codeSmStyle}>loaded</code> and retains the rendered list, avoiding disrupting the user interface.
          </li>
          <li style={{ marginBottom: '8px' }}>
            <strong>Target ID Retention:</strong> The component uses a mutable reference (<code style={styles.codeSmStyle}>revokeTargetRef</code>) to persist the intended revocation target (either a specific session ID or the &apos;all&apos; keyword) across password challenge retries. If the password check fails on the first attempt, subsequent retries target the correct session ID rather than resolving to null.
          </li>
        </ul>

        <CodeBlock
          title="Client-Side Verification Lifecycle"
          code={`// Hook enforcing automatic client-side token expiration
useEffect(() => {
  if (!verificationRecordId || !verificationExpiry) return;
  const timeUntilExpiry = verificationExpiry - Date.now();
  if (timeUntilExpiry > 0) {
    const timer = setTimeout(() => {
      setVerificationRecordId(null);
      setVerificationExpiry(0);
      setViewState('unverified');
    }, timeUntilExpiry);
    return () => clearTimeout(timer);
  }
}, [verificationRecordId, verificationExpiry]);`}
        />
      </SectionWrap>

      <SectionWrap label="JTI Claims & Active Connection Contexts">
        <p style={styles.textStyle}>
          The system ensures session operations target correct contexts by parsing claims and identifying active sessions.
        </p>

        <h4 style={{ ...styles.textStyle, fontWeight: 600, marginTop: '16px', marginBottom: '8px' }}>
          OIDC Session UID vs JWT ID (Critical Mapping)
        </h4>
        <p style={styles.textStyle}>
          A user session record contains multiple identifiers, specifically the token ID (<code style={styles.codeSmStyle}>payload.jti</code>) and the OIDC Session UID (<code style={styles.codeSmStyle}>payload.uid</code>). 
        </p>
        <p style={styles.textStyle}>
          When calling Logto&apos;s Account API endpoints to view or delete a session, the **OIDC Session UID (<code style={styles.codeSmStyle}>payload.uid</code>) must be passed as the sessionId parameter inside the URL path**, not the JWT token ID (<code style={styles.codeSmStyle}>payload.jti</code>). This is because the Logto Account API resolves session resources by their OIDC session identifier. Passing the JTI will cause API errors.
        </p>

        <h4 style={{ ...styles.textStyle, fontWeight: 600, marginTop: '16px', marginBottom: '8px' }}>
          Server Token Introspection Safety
        </h4>
        <p style={styles.textStyle}>
          The server action <code style={styles.codeSmStyle}>getSessionsWithDeviceMeta</code> queries user token properties via <code style={styles.codeSmStyle} >introspectToken</code> to identify the subject (<code style={styles.codeSmStyle}>sub</code> claim). 
        </p>
        <p style={styles.textStyle}>
          If token introspection fails (for example, if the <code style={styles.codeSmStyle}>LOGTO_INTROSPECTION_URL</code> is not configured), the server action falls back gracefully by assigning an empty string to <code style={styles.codeSmStyle}>userId</code>, permitting the Sessions tab to render instead of crashing the component.
        </p>

        <h4 style={{ ...styles.textStyle, fontWeight: 600, marginTop: '16px', marginBottom: '8px' }}>
          Active Session Identification
        </h4>
        <p style={styles.textStyle}>
          To execute multi-device revocations safely, the system must identify the caller&apos;s active session. The server action resolves this in <code style={styles.codeSmStyle}>revokeAllOtherSessions</code>:
        </p>
        <ol style={{ ...styles.textStyle, paddingLeft: '20px', listStyleType: 'decimal' }}>
          <li style={{ marginBottom: '6px' }}>
            It inspects the OIDC token claims to extract the session ID (<code style={styles.codeSmStyle}>sid</code> claim).
          </li>
          <li style={{ marginBottom: '6px' }}>
            It matches this <code style={styles.codeSmStyle}>sid</code> against the session <code style={styles.codeSmStyle}>payload.uid</code> field to locate the current active session.
          </li>
          <li style={{ marginBottom: '6px' }}>
            If the <code style={styles.codeSmStyle}>sid</code> claim is absent, it falls back to matching the <code style={styles.codeSmStyle}>isCurrent === true</code> flag returned by the Logto sessions response.
          </li>
          <li style={{ marginBottom: '6px' }}>
            If neither method resolves the current session, it aborts and throws an error, protecting the user from accidental lockout.
          </li>
        </ol>

        <CodeBlock
          title="Current Session Detection & Filter"
          code={`// Identify current session via token introspection sid claim
const token = await getTokenForServerAction();
const introspection = await introspectToken(token);
const currentSid = introspection.sid; // Matches payload.uid

const currentSession = currentSid
  ? sessions.find(s => s.payload.uid === currentSid)
  : sessions.find(s => s.isCurrent === true);

if (!currentSession) {
  throw new Error('Cannot identify current session - session UID mismatch.');
}

// Filter out current active session to isolate targets to revoke
const othersToRevoke = sessions.filter(s => s.payload.uid !== currentSession.payload.uid);`}
        />
      </SectionWrap>

      <SectionWrap label="Revocation Mechanics">
        <p style={styles.textStyle}>
          The dashboard supports both individual session termination and bulk multi-device revocation.
        </p>

        <h4 style={{ ...styles.textStyle, fontWeight: 600, marginTop: '16px', marginBottom: '8px' }}>
          Single Session Termination
        </h4>
        <p style={styles.textStyle}>
          Revoking a single session triggers <code style={styles.codeSmStyle}>onRevokeSession(sessionId, verificationId, &apos;firstParty&apos;)</code>. The revoke target parameter is configured to <code style={styles.codeSmStyle}>&apos;firstParty&apos;</code> to revoke first-party application grants (such as access tokens and refresh tokens) associated with the device session, while leaving broader scopes unaffected where appropriate.
        </p>

        <h4 style={{ ...styles.textStyle, fontWeight: 600, marginTop: '16px', marginBottom: '8px' }}>
          Sequential Revocation and Rate-Limiting
        </h4>
        <p style={styles.textStyle}>
          Executing multi-device revocation concurrently can trigger Logto API rate-limiting (HTTP 429). To prevent this, the server action revokes other sessions sequentially, introducing a throttle delay of <code style={styles.codeSmStyle}>100ms</code> between consecutive requests.
        </p>

        <h4 style={{ ...styles.textStyle, fontWeight: 600, marginTop: '16px', marginBottom: '8px' }}>
          Timeout Guards and Error Aggregation
        </h4>
        <p style={styles.textStyle}>
          To prevent a hanging connection from stalling the entire queue, each sequential revocation call is wrapped in a <code style={styles.codeSmStyle}>Promise.race</code> timeout guard set to 10 seconds (<code style={styles.codeSmStyle}>10_000ms</code>).
        </p>
        <p style={styles.textStyle}>
          If individual deletion requests fail, errors are aggregated. Rather than failing silently, the backend counts the rejected promises and throws an explanatory error containing the exact count of failed revocations.
        </p>

        <CodeBlock
          title="Sequential Revocation & Timeout Guard"
          code={`// Sequential multi-device revocation loop with timeout races
const results: PromiseSettledResult<void>[] = [];
for (const s of othersToRevoke) {
  const result = await Promise.race([
    revokeUserSession(s.payload.uid, verificationRecordId, 'firstParty')
      .then(r => { if (!r.ok) throw new Error(r.error); })
      .then<PromiseSettledResult<void>>(() => ({ status: 'fulfilled', value: undefined }))
      .catch<PromiseSettledResult<void>>(reason => ({ status: 'rejected', reason })),
    new Promise<PromiseSettledResult<void>>(resolve =>
      setTimeout(() => resolve({ status: 'rejected', reason: new Error('Timeout') }), 10_000)
    ),
  ]);
  results.push(result);
  
  // Throttle delay between requests to avoid rate limits
  if (othersToRevoke.indexOf(s) < othersToRevoke.length - 1) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}`}
        />
      </SectionWrap>

      <SectionWrap label="IP Geolocation & User Agent Parsing">
        <p style={styles.textStyle}>
          Active sessions extract connection parameters from user login metadata, parsing the user agent string and querying IP geolocation coordinates.
        </p>

        <h4 style={{ ...styles.textStyle, fontWeight: 600, marginTop: '16px', marginBottom: '8px' }}>
          User Agent and OS Mapping
        </h4>
        <p style={styles.textStyle}>
          The user agent string inside the session context is parsed on the server via <code style={styles.codeSmStyle}>ua-parser-js</code>. Operating system strings are mapped to specific graphical icons. The mapping logic includes matching constraints to handle different OS name labels:
        </p>
        <ul style={{ ...styles.textStyle, paddingLeft: '20px', listStyleType: 'disc' }}>
          <li style={{ marginBottom: '6px' }}><code style={styles.codeSmStyle}>&apos;Linux&apos;</code> maps to <code style={styles.codeSmStyle}>/os-icons/Tux.jpg</code></li>
          <li style={{ marginBottom: '6px' }}><code style={styles.codeSmStyle}>&apos;Windows&apos;</code> maps to <code style={styles.codeSmStyle}>/os-icons/MacroSlop.svg</code></li>
          <li style={{ marginBottom: '6px' }}><code style={styles.codeSmStyle}>&apos;macOS&apos;</code> and <code style={styles.codeSmStyle}>&apos;Mac OS&apos;</code> map to <code style={styles.codeSmStyle}>/os-icons/MacOS.svg</code></li>
          <li style={{ marginBottom: '6px' }}><code style={styles.codeSmStyle}>&apos;iOS&apos;</code> maps to <code style={styles.codeSmStyle}>/os-icons/ios.svg</code></li>
          <li style={{ marginBottom: '6px' }}><code style={styles.codeSmStyle}>&apos;Android&apos;</code> maps to <code style={styles.codeSmStyle}>/os-icons/Android.svg</code></li>
        </ul>

        <h4 style={{ ...styles.textStyle, fontWeight: 600, marginTop: '16px', marginBottom: '8px' }}>
          Client-Side Caching and Concurrency Deduplication
        </h4>
        <p style={styles.textStyle}>
          IP addresses are geolocated using client-side requests to <code style={styles.codeSmStyle}>https://ipapi.co/&#123;ip&#125;/json/</code>. To prevent rate limits, the module implements client-side caching and fetch deduplication:
        </p>
        <ul style={{ ...styles.textStyle, paddingLeft: '20px', listStyleType: 'disc' }}>
          <li style={{ marginBottom: '6px' }}>
            <strong>In-Memory Map Cache:</strong> Resolved geolocations are cached in an in-memory Map with a 5-minute TTL (<code style={styles.codeSmStyle}>TTL = 300,000ms</code>). Subsequent lookups within this window read from the cache first.
          </li>
          <li style={{ marginBottom: '6px' }}>
            <strong>In-Flight Deduplication:</strong> Active fetch promises are registered in an <code style={styles.codeSmStyle}>inFlight</code> Map. Concurrent duplicate requests for the same IP subscribe to the same pending promise instead of triggering multiple network calls.
          </li>
        </ul>

        <h4 style={{ ...styles.textStyle, fontWeight: 600, marginTop: '16px', marginBottom: '8px' }}>
          Offline Graceful Fallback
        </h4>
        <p style={styles.textStyle}>
          If a geolocation query fails due to a network disconnect, private IP address ranges (such as localhost), or third-party rate limiting, the fetch routine catches the exception and returns <code style={styles.codeSmStyle}>null</code> silently. The UI handles this gracefully without throwing errors or blocking page rendering, hiding the geolocation interactive MapPin button.
        </p>

        <h4 style={{ ...styles.textStyle, fontWeight: 600, marginTop: '16px', marginBottom: '8px' }}>
          Production Recommendations (Offline MaxMind Databases)
        </h4>
        <p style={styles.textStyle}>
          Client-side APIs like <code style={styles.codeSmStyle}>ipapi.co</code> are subject to daily rate limits (e.g., 1,000 queries per day), network latency, and browser Content Security Policy (CSP) blocking.
        </p>
        <p style={styles.textStyle}>
          For high-volume production systems, lookups should be shifted server-side using offline databases such as **MaxMind GeoIP2 Lite or Commercial**. This design provides:
        </p>
        <ul style={{ ...styles.textStyle, paddingLeft: '20px', listStyleType: 'disc' }}>
          <li style={{ marginBottom: '6px' }}>
            <strong>Zero-Latency Lookup:</strong> Databases are read from server memory, avoiding external network requests.
          </li>
          <li style={{ marginBottom: '6px' }}>
            <strong>Enhanced Privacy:</strong> User IP addresses are never transmitted to external geolocation third parties.
          </li>
          <li style={{ marginBottom: '6px' }}>
            <strong>Offline Resilience:</strong> Provides complete mapping reliability, with fallback to country-level database defaults when offline or operating in isolated environments.
          </li>
        </ul>

        <CodeBlock
          title="Geolocation Fetch & Cache Logic"
          code={`const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<GeoLocation | null>>();
const TTL = 5 * 60 * 1000;

export async function fetchGeo(ip: string): Promise<GeoLocation | null> {
  if (typeof window === 'undefined' || !ip) return null;

  const cached = getCachedGeo(ip);
  if (cached) return cached;

  if (inFlight.has(ip)) return inFlight.get(ip)!;

  const promise = (async () => {
    try {
      const res = await fetch(\`https://ipapi.co/\${ip}/json/\`);
      if (!res.ok) return null;
      const data = await res.json();
      if (data.error) return null;
      
      const geo: GeoLocation = {
        lat: data.latitude,
        lon: data.longitude,
        city: data.city || '',
        country: data.country_name || '',
        region: data.region || '',
      };
      
      if (typeof geo.lat !== 'number' || typeof geo.lon !== 'number') return null;
      setCachedGeo(ip, geo);
      return geo;
    } catch {
      return null; // Graceful error and offline fallback
    } finally {
      inFlight.delete(ip);
    }
  })();

  inFlight.set(ip, promise);
  return promise;
}`}
        />
      </SectionWrap>
    </div>
  );
}
