'use client';

import { useDocStyles } from '../../components/useDocStyles';
import { SectionWrap } from '../../components/SectionComponents';

export default function LogtoConsole() {
  const styles = useDocStyles();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <SectionWrap label="Logto Console Application Setup">
        <p style={styles.textStyle}>
          To connect your Next.js application to your Logto tenant, you must provision two distinct applications in the <strong>Logto Console</strong>. 
          Each serves a specific security context within the OAuth 2.0 / OIDC architecture.
        </p>
      </SectionWrap>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <SectionWrap label="1. Traditional Web Application">
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
            Enable <strong>"Account API"</strong> in the application settings. This is crucial for enabling the user dashboard to modify user profiles or password credentials directly.
          </div>
        </SectionWrap>

        <SectionWrap label="2. Machine-to-Machine (M2M) Application">
          <p style={styles.textStyle}>
            This server-to-server client authenticates silently using Client Credentials Grant to perform administrator queries via the Logto Management API.
          </p>
          <div style={styles.noteStyle}>
            <strong style={styles.strongNoteStyle}>Role & Scope Assignment</strong>
            <br />
            Assign the Logto Management API role with the following permissions:
            <br />
            • <code style={styles.codeSmStyle}>User data → Write</code>
            <br />
            • <code style={styles.codeSmStyle}>Organization → Read</code> (only Read permission is required; Write is not needed)
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
            Used for elevated server actions like completely purging a user's record on deletion, checking user memberships, or mutating organization attributes.
          </div>
        </SectionWrap>
      </div>
    </div>
  );
}
