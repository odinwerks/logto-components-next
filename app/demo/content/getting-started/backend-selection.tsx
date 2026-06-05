'use client';

import { useDocStyles } from '../../components/useDocStyles';
import CodeBlock from '../../components/SyntaxBlock';
import { useThemeMode } from '../../../logto-kit/components/providers/preferences';
import { slugify } from '../../components/SectionComponents';

export default function BackendSelection() {
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
    fontSize: '1.05rem',
    fontWeight: 600,
    color: isDark ? '#e5e7eb' : '#1f2937',
    marginTop: '24px',
    marginBottom: '12px',
    borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : '#f1f5f9'}`,
    paddingBottom: '4px',
  };

  const customTableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.8rem',
    marginBottom: '20px',
    marginTop: '12px',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`,
  };

  const customThStyle: React.CSSProperties = {
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

  const customTdStyle: React.CSSProperties = {
    padding: '10px 12px',
    borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9'}`,
    color: isDark ? 'rgba(255,255,255,0.55)' : '#334155',
    verticalAlign: 'top',
    lineHeight: '1.5',
  };

  const customTdPropStyle: React.CSSProperties = {
    ...customTdStyle,
    color: isDark ? '#9cdcdb' : '#0369a1',
    fontFamily: "'IBM Plex Mono', monospace",
    fontWeight: 600,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <h2 id={slugify("Backend Selection")} style={{ ...h2Style, marginTop: 0 }}>Backend Selection</h2>

      <p style={styles.textStyle}>
        The kit supports two backend modes through <code style={styles.codeSmStyle}>BACKEND_TYPE</code>: <strong>blacktop</strong> for the custom fork and <strong>upstream</strong> for stock Logto OSS or Logto Cloud.
      </p>

      <CodeBlock title="Backend Selection" code={`# Values: blacktop | upstream\n# Server default is upstream when not set\nBACKEND_TYPE=upstream`} />

      <h3 id={slugify("Feature Comparison Matrix")} style={h3Style}>Feature Comparison Matrix</h3>

      <p style={styles.textStyle}>Backend mode changes runtime behavior:</p>

      <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table style={customTableStyle}>
          <thead>
            <tr>
              <th style={{ ...customThStyle, width: '30%' }}>Capability</th>
              <th style={{ ...customThStyle, width: '35%' }}>blacktop mode</th>
              <th style={{ ...customThStyle, width: '35%' }}>upstream mode</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={customTdPropStyle}>Real-time Heartbeat</td>
              <td style={customTdStyle}>
                <strong>Enabled</strong>. Sends a background heartbeat every 30 seconds.
              </td>
              <td style={customTdStyle}>
                ❌ <strong>Disabled</strong>. Heartbeat calls return early.
              </td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>Last Active Timestamps</td>
              <td style={customTdStyle}>
                <strong>Visible</strong>. Sessions tab shows last active values.
              </td>
              <td style={customTdStyle}>
                ❌ <strong>Hidden</strong>. Sessions tab hides last active values.
              </td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>Logto Native PFP uploads</td>
              <td style={customTdStyle}>
                <strong>Supported</strong>. <code style={styles.codeSmStyle}>PFP_BACKEND=logto</code> can use native Logto avatar storage.
              </td>
              <td style={customTdStyle}>
                ❌ <strong>Forced S3</strong>. Effective upload backend is always S3-compatible storage, even when <code style={styles.codeSmStyle}>PFP_BACKEND=logto</code>.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ ...styles.noteStyle, marginTop: '16px' }}>
        <strong style={styles.strongNoteStyle}>Important:</strong> The resolver defaults to <code style={styles.codeSmStyle}>upstream</code> when <code style={styles.codeSmStyle}>BACKEND_TYPE</code> is missing or invalid. In Docker, pass both <code style={styles.codeSmStyle}>BACKEND_TYPE</code> at runtime and <code style={styles.codeSmStyle}>NEXT_PUBLIC_BACKEND_TYPE</code> at build time so server and client stay in sync.
      </div>

      <h2 id={slugify("Phone Country Code Filtering")} style={h2Style}>Phone Country Code Filtering</h2>

      <p style={styles.textStyle}>Phone restrictions are controlled by two mutually exclusive variables:</p>

      <CodeBlock title="Filtering Parameters" code={`# Allow mode: only listed dial codes are permitted\nCOUNTRY_CODE_ALLOW_LIST=1,995,380\n\n# Block mode: listed dial codes are rejected\nCOUNTRY_CODE_BLOCK_LIST=7,86\n\n# If both are set, allow list wins\n# If neither is set, fallback allow list is 1,995`} />

      <h3 id={slugify("Dropdown Gating")} style={h3Style}>Dropdown Gating</h3>
      <p style={styles.textStyle}>
        <code style={styles.codeSmStyle}>PhoneCountrySelect</code> filters options using the selected mode. In allow mode it keeps only matching dial codes. In block mode it removes matching dial codes. If filtering produces zero matches, the dropdown falls back to the full country list.
      </p>

      <h3 id={slugify("Server-Side Action Validation")} style={h3Style}>Server-Side Action Validation</h3>
      <p style={styles.textStyle}>
        Server actions sanitize phone input to digits and enforce the same country filter. In allow mode, unknown or unmapped prefixes are rejected. In block mode, only explicitly blocked prefixes are rejected.
      </p>

      <h3 id={slugify("Error Codes")} style={h3Style}>Error Codes</h3>
      <p style={styles.textStyle}>Common error codes from phone validation:</p>

      <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table style={customTableStyle}>
          <thead>
            <tr>
              <th style={{ ...customThStyle, width: '30%' }}>Error Code</th>
              <th style={{ ...customThStyle, width: '20%' }}>Trigger</th>
              <th style={{ ...customThStyle, width: '50%' }}>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={customTdPropStyle}>PHONE_COUNTRY_NOT_ALLOWED</td>
              <td style={customTdStyle}>Country fails filter</td>
              <td style={customTdStyle}>
                The dial code is blocked, missing from allow list, or unmapped in allow mode.
              </td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>INVALID_INPUT</td>
              <td style={customTdStyle}>Invalid phone input</td>
              <td style={customTdStyle}>
                Input fails basic shape checks such as empty value or excessive length.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  );
}
