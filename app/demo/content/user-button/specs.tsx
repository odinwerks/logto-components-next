'use client';

import { useDocStyles } from '../../components/useDocStyles';
import CodeBlock from '../../components/SyntaxBlock';
import { slugify } from '../../components/SectionComponents';
import { useThemeMode } from '../../../logto-kit/components/providers/preferences';

export default function UserButtonSpecs() {
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

  const customTdTypeStyle: React.CSSProperties = {
    ...customTdStyle,
    color: isDark ? '#4ec9b0' : '#059669',
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '0.75rem',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h2 id={slugify("Quick start")} style={{ ...h2Style, marginTop: 0 }}>Quick start</h2>
      <p style={styles.textStyle}>
        Import and mount inside a <code style={styles.codeStyle}>LogtoProvider</code>.
        Reads user data from context, opens Dashboard on click.
      </p>
      <CodeBlock title="Import" code={`import { UserButton, UserBadge, UserCard } from '../../logto-kit/components/UserButton';`} />
      <CodeBlock title="Minimal usage" code={`<UserButton />`} />
      <p style={{ ...styles.textStyle, marginBottom: 0 }}>
        Clickable circle avatar. Falls back to user icon after 1.5 seconds if no data.
        Priority: prop, then provider context, then fallback icon.
      </p>

      <h2 id={slugify("Variants at a glance")} style={h2Style}>Variants at a glance</h2>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>UserButton:</strong>{' '}
        Clickable avatar-only trigger. Best for compact headers/toolbars where opening the dashboard is the primary action.
      </div>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>UserBadge:</strong>{' '}
        Non-interactive avatar display. Best for read-only surfaces (status rows, passive profile chips).
      </div>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>UserCard:</strong>{' '}
        Clickable avatar + label/name card. Best when you want both identity context and dashboard access in one control.
      </div>

      <h2 id={slugify("Unified Props (UserButton / UserBadge / UserCard)")} style={h2Style}>Unified Props (UserButton / UserBadge / UserCard)</h2>
      <table style={customTableStyle}>
        <thead>
          <tr>
            <th style={{ ...customThStyle, width: '14%' }}>Prop</th>
            <th style={{ ...customThStyle, width: '22%' }}>Applies to</th>
            <th style={{ ...customThStyle, width: '22%' }}>Type</th>
            <th style={{ ...customThStyle, width: '14%' }}>Default</th>
            <th style={{ ...customThStyle, width: '28%' }}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={customTdPropStyle}>Canvas</td>
            <td style={customTdStyle}>UserButton, UserBadge, UserCard</td>
            <td style={customTdTypeStyle}>'Avatar' | 'Initials'</td>
            <td style={customTdStyle}>'Avatar' (effective)</td>
            <td style={customTdStyle}>Controls rendering mode. Unless explicitly set to <code style={styles.codeSmStyle}>'Initials'</code>, the component uses Avatar mode and shows initials only when avatar is missing/failed.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>Size</td>
            <td style={customTdStyle}>UserButton, UserBadge</td>
            <td style={customTdTypeStyle}>string</td>
            <td style={customTdStyle}>'6.25rem'</td>
            <td style={customTdStyle}>CSS size string (for example <code style={styles.codeSmStyle}>'80px'</code>, <code style={styles.codeSmStyle}>'4rem'</code>).</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>Size</td>
            <td style={customTdStyle}>UserCard</td>
            <td style={customTdTypeStyle}>string</td>
            <td style={customTdStyle}>'2.5rem'</td>
            <td style={customTdStyle}>Avatar size inside the card layout. Smaller default than UserButton/UserBadge.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>shape</td>
            <td style={customTdStyle}>UserButton, UserBadge, UserCard</td>
            <td style={customTdTypeStyle}>'circle' | 'sq' | 'rsq' | string</td>
            <td style={customTdStyle}>prop → USER_SHAPE → 'circle'</td>
            <td style={customTdStyle}>Border radius strategy. Custom CSS radius strings are supported (for example <code style={styles.codeSmStyle}>'8px'</code>, <code style={styles.codeSmStyle}>'1rem'</code>).</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>userData</td>
            <td style={customTdStyle}>UserButton, UserBadge, UserCard</td>
            <td style={customTdTypeStyle}>UserData</td>
            <td style={customTdStyle}>undefined</td>
            <td style={customTdStyle}>Optional override mainly for demos, tests, or controlled previews. Normal production path is <code style={styles.codeSmStyle}>userData</code> from <code style={styles.codeSmStyle}>LogtoProvider</code> context.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>colors</td>
            <td style={customTdStyle}>UserButton, UserBadge, UserCard</td>
            <td style={customTdTypeStyle}>ThemeColors</td>
            <td style={customTdStyle}>undefined</td>
            <td style={customTdStyle}>Overrides all visual color tokens used by the component instance. If omitted, colors come from <code style={styles.codeSmStyle}>useThemeMode()</code> (<code style={styles.codeSmStyle}>PreferencesProvider</code>: dark/light token sets from <code style={styles.codeSmStyle}>themes/index.ts</code>; fallback theme when no provider).</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>do</td>
            <td style={customTdStyle}>UserButton, UserCard</td>
            <td style={customTdTypeStyle}>() =&gt; void</td>
            <td style={customTdStyle}>Default: provider openDashboard</td>
            <td style={customTdStyle}>Custom click handler. If omitted, the built-in handler opens the dashboard via provider state (<code style={styles.codeSmStyle}>openDashboard()</code> from <code style={styles.codeSmStyle}>useLogto()</code>).</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>do</td>
            <td style={customTdStyle}>UserBadge</td>
            <td style={customTdTypeStyle}>N/A</td>
            <td style={customTdStyle}>N/A</td>
            <td style={customTdStyle}>Not supported (UserBadge is intentionally non-interactive).</td>
          </tr>
        </tbody>
      </table>
      <CodeBlock title="UserButtonProps interface" code={`export interface UserButtonProps {
  Canvas?: 'Avatar' | 'Initials';
  Size?: string;
  shape?: 'circle' | 'sq' | 'rsq' | string;
  userData?: UserData;
  colors?: ThemeColors;
  do?: () => void;
}`} />

      <CodeBlock title="UserBadgeProps interface" code={`export interface UserBadgeProps {
  Canvas?: 'Avatar' | 'Initials';
  Size?: string;
  shape?: 'circle' | 'sq' | 'rsq' | string;
  userData?: UserData;
  colors?: ThemeColors;
}`} />

      <CodeBlock title="UserCardProps interface" code={`export interface UserCardProps {
  Canvas?: 'Avatar' | 'Initials';
  Size?: string;
  shape?: 'circle' | 'sq' | 'rsq' | string;
  userData?: UserData;
  colors?: ThemeColors;
  do?: () => void;
}`} />

      <h2 id={slugify("Core Behaviors and Design Notes")} style={h2Style}>Core Behaviors and Design Notes</h2>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Data resolution priority:</strong>{' '}
        1. Custom prop <code style={styles.codeSmStyle}>userData</code> if provided.
        2. Context <code style={styles.codeSmStyle}>userData</code> from <code style={styles.codeSmStyle}>useLogto()</code>.
        3. Fallback standard user icon after a 1.5 seconds timeout if no data is found.
      </div>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Shape configuration:</strong>{' '}
        1. Custom prop <code style={styles.codeSmStyle}>shape</code> value ('circle', 'sq', 'rsq', or custom CSS value like '8px', '1rem').
        2. Fallback to <code style={styles.codeSmStyle}>USER_SHAPE</code> environment variable.
        3. Default fallback value of 'circle'.
      </div>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Display name resolution hierarchy:</strong>{' '}
        1. <code style={styles.codeSmStyle}>name</code>
        2. <code style={styles.codeSmStyle}>profile.givenName profile.familyName</code>
        3. <code style={styles.codeSmStyle}>username</code>
        4. <code style={styles.codeSmStyle}>primaryEmail</code>
        5. <code style={styles.codeSmStyle}>primaryPhone</code>
        6. Fallback value 'User'.
      </div>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Initials generation logic:</strong>{' '}
        1. If <code style={styles.codeSmStyle}>profile.givenName</code> and <code style={styles.codeSmStyle}>profile.familyName</code> exist: uppercase first letters of each.
        2. If <code style={styles.codeSmStyle}>name</code> exists: split by space. Use first letter of first two words, or first letter of first word if single-word name.
        3. If <code style={styles.codeSmStyle}>username</code> exists: first letter of username.
        4. Fallback value '?'.
      </div>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Localization (i18n):</strong>{' '}
        Automatic language resolution from <code style={styles.codeSmStyle}>useLogto()</code>. The label 'Logged in as' translated without a manual translation prop.
      </div>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Image fallback:</strong>{' '}
        Automatic fallback to generated name initials if avatar image loading fails.
      </div>
    </div>
  );
}
