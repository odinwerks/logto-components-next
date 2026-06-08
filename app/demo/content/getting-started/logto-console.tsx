'use client';

import { useDocStyles } from '../../components/useDocStyles';
import { useThemeMode } from '../../../logto-kit/components/providers/preferences';
import { slugify } from '../../components/SectionComponents';

export default function LogtoConsole() {
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

  const h3Style: React.CSSProperties = {
    fontSize: '1rem',
    fontWeight: 600,
    color: isDark ? '#e5e7eb' : '#1f2937',
    marginTop: '20px',
    marginBottom: '12px',
    borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : '#f1f5f9'}`,
    paddingBottom: '4px',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <h2 id={slugify("Logto Console Application Setup")} style={{ ...h2Style, marginTop: 0 }}>Logto Console Application Setup</h2>
      
      <p style={styles.textStyle}>
        To connect your Next.js application to your Logto tenant, you must provision two distinct applications in the <strong>Logto Console</strong>. 
        Each serves a specific security context within the OAuth 2.0 / OIDC architecture.
      </p>

      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Order (including mobile view):</strong> create and configure the <strong>Traditional Web</strong> application first, then create the <strong>M2M</strong> application. On narrow/mobile layouts this page stacks vertically in the same order.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '16px' }}>
        <div>
          <h3 id={slugify("1. Traditional Web Application")} style={{ ...h3Style, marginTop: 0 }}>1. Traditional Web Application</h3>
          <p style={styles.textStyle}>
            This client application manages user interactive authentication (sign-in, sign-out, session establishment) via OIDC Authorization Code Flow.
          </p>
          <div style={styles.noteStyle}>
            <strong style={styles.strongNoteStyle}>Redirect URI</strong>
            <br />
            <code style={styles.codeSmStyle}>http://localhost:3000/callback</code>
            <br />
            <span style={{ fontSize: '10px' }}>Where Logto redirects the browser with the auth code.</span>
          </div>
          <div style={styles.noteStyle}>
            <strong style={styles.strongNoteStyle}>Post Sign-Out Redirect URI</strong>
            <br />
            <code style={styles.codeSmStyle}>http://localhost:3000/</code>
            <br />
            <span style={{ fontSize: '10px' }}>Where Logto redirects the browser after wiping session cookies.</span>
          </div>
          <div style={{ ...styles.noteStyle, marginBottom: 0 }}>
            <strong style={styles.strongNoteStyle}>Required Toggle</strong>
            <br />
            Enable <strong>&quot;Account API&quot;</strong> in the application settings. This is crucial for enabling the user dashboard to modify user profiles or password credentials directly.
          </div>
        </div>

        <div>
          <h3 id={slugify("2. Machine-to-Machine (M2M) Application")} style={{ ...h3Style, marginTop: 0 }}>2. Machine-to-Machine (M2M) Application</h3>
          <p style={styles.textStyle}>
            This server-to-server client authenticates silently using Client Credentials Grant to perform administrator queries via the Logto Management API.
          </p>
          <div style={styles.noteStyle}>
            <strong style={styles.strongNoteStyle}>Role & Scope Assignment</strong>
            <br />
            Assign Management API permissions that cover this kit&apos;s usage:
            <br />
            • user data read/write/delete (including custom-data updates)
            <br />
            • organization membership/role reads
            <br />
            • role/scope reads (personal + organization role scopes)
          </div>
          <div style={styles.noteStyle}>
            <strong style={styles.strongNoteStyle}>Target ENV Parameters</strong>
            <br />
            Copy these keys directly into your local <code style={styles.codeSmStyle}>.env</code> file:
            <br />
            • ID → <code style={styles.codeSmStyle}>LOGTO_M2M_APP_ID</code>
            <br />
            • Secret → <code style={styles.codeSmStyle}>LOGTO_M2M_APP_SECRET</code>
          </div>
          <div style={{ ...styles.noteStyle, marginBottom: 0 }}>
            <strong style={styles.strongNoteStyle}>Core Purpose</strong>
            <br />
            Used for elevated server actions that cannot rely only on the end-user access token. In this kit, M2M credentials are used for:
            <br />
            • permanent account deletion
            <br />
            • personal/org role and permission resolution (RBAC checks and tab data)
            <br />
            • org membership verification
            <br />
            • user custom-data updates for persisted Preferences (<code style={styles.codeSmStyle}>theme</code>, <code style={styles.codeSmStyle}>lang</code>, <code style={styles.codeSmStyle}>asOrg</code>)
          </div>
        </div>
      </div>
    </div>
  );
}
