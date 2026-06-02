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

      <h2 id={slugify("UserButton Props")} style={h2Style}>UserButton Props</h2>
      <table style={customTableStyle}>
        <thead>
          <tr>
            <th style={{ ...customThStyle, width: '20%' }}>Prop</th>
            <th style={{ ...customThStyle, width: '30%' }}>Type</th>
            <th style={{ ...customThStyle, width: '20%' }}>Default</th>
            <th style={{ ...customThStyle, width: '30%' }}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={customTdPropStyle}>Canvas</td>
            <td style={customTdTypeStyle}>'Avatar' | 'Initials'</td>
            <td style={customTdStyle}>undefined</td>
            <td style={customTdStyle}>Forces avatar image or initials fallback. Defaults to showing avatar image if available.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>Size</td>
            <td style={customTdTypeStyle}>string</td>
            <td style={customTdStyle}>'6.25rem'</td>
            <td style={customTdStyle}>CSS size string (e.g. '80px', '4rem').</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>shape</td>
            <td style={customTdTypeStyle}>'circle' | 'sq' | 'rsq'</td>
            <td style={customTdStyle}>undefined</td>
            <td style={customTdStyle}>Sets border radius. Falls back to USER_SHAPE environment variable, then to 'circle'.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>userData</td>
            <td style={customTdTypeStyle}>UserData</td>
            <td style={customTdStyle}>undefined</td>
            <td style={customTdStyle}>Optional override. Reads LogtoProvider context if omitted.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>colors</td>
            <td style={customTdTypeStyle}>ThemeColors</td>
            <td style={customTdStyle}>undefined</td>
            <td style={customTdStyle}>Optional override. Reads useThemeMode() context if omitted.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>do</td>
            <td style={customTdTypeStyle}>() =&gt; void</td>
            <td style={customTdStyle}>undefined</td>
            <td style={customTdStyle}>Custom click action. If omitted, opens the user dashboard.</td>
          </tr>
        </tbody>
      </table>
      <CodeBlock title="UserButtonProps interface" code={`export interface UserButtonProps {
  Canvas?: 'Avatar' | 'Initials';
  Size?: string;
  shape?: 'circle' | 'sq' | 'rsq';
  userData?: UserData;
  colors?: ThemeColors;
  do?: () => void;
}`} />

      <h2 id={slugify("UserBadge Props")} style={h2Style}>UserBadge Props</h2>
      <table style={customTableStyle}>
        <thead>
          <tr>
            <th style={{ ...customThStyle, width: '20%' }}>Prop</th>
            <th style={{ ...customThStyle, width: '30%' }}>Type</th>
            <th style={{ ...customThStyle, width: '20%' }}>Default</th>
            <th style={{ ...customThStyle, width: '30%' }}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={customTdPropStyle}>Canvas</td>
            <td style={customTdTypeStyle}>'Avatar' | 'Initials'</td>
            <td style={customTdStyle}>undefined</td>
            <td style={customTdStyle}>Forces avatar image or initials fallback. Defaults to showing avatar image if available.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>Size</td>
            <td style={customTdTypeStyle}>string</td>
            <td style={customTdStyle}>'6.25rem'</td>
            <td style={customTdStyle}>CSS size string (e.g. '80px', '4rem').</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>shape</td>
            <td style={customTdTypeStyle}>'circle' | 'sq' | 'rsq'</td>
            <td style={customTdStyle}>undefined</td>
            <td style={customTdStyle}>Sets border radius. Falls back to USER_SHAPE environment variable, then to 'circle'.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>userData</td>
            <td style={customTdTypeStyle}>UserData</td>
            <td style={customTdStyle}>undefined</td>
            <td style={customTdStyle}>Optional override. Reads LogtoProvider context if omitted.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>colors</td>
            <td style={customTdTypeStyle}>ThemeColors</td>
            <td style={customTdStyle}>undefined</td>
            <td style={customTdStyle}>Optional override. Reads useThemeMode() context if omitted.</td>
          </tr>
        </tbody>
      </table>
      <CodeBlock title="UserBadgeProps interface" code={`export interface UserBadgeProps {
  Canvas?: 'Avatar' | 'Initials';
  Size?: string;
  shape?: 'circle' | 'sq' | 'rsq';
  userData?: UserData;
  colors?: ThemeColors;
}`} />

      <h2 id={slugify("UserCard Props")} style={h2Style}>UserCard Props</h2>
      <table style={customTableStyle}>
        <thead>
          <tr>
            <th style={{ ...customThStyle, width: '20%' }}>Prop</th>
            <th style={{ ...customThStyle, width: '30%' }}>Type</th>
            <th style={{ ...customThStyle, width: '20%' }}>Default</th>
            <th style={{ ...customThStyle, width: '30%' }}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={customTdPropStyle}>Canvas</td>
            <td style={customTdTypeStyle}>'Avatar' | 'Initials'</td>
            <td style={customTdStyle}>undefined</td>
            <td style={customTdStyle}>Forces avatar image or initials fallback. Defaults to showing avatar image if available.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>Size</td>
            <td style={customTdTypeStyle}>string</td>
            <td style={customTdStyle}>'2.5rem'</td>
            <td style={customTdStyle}>CSS size string (e.g. '80px', '4rem'). Note that default is smaller than button or badge.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>shape</td>
            <td style={customTdTypeStyle}>'circle' | 'sq' | 'rsq'</td>
            <td style={customTdStyle}>undefined</td>
            <td style={customTdStyle}>Sets border radius. Falls back to USER_SHAPE environment variable, then to 'circle'.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>userData</td>
            <td style={customTdTypeStyle}>UserData</td>
            <td style={customTdStyle}>undefined</td>
            <td style={customTdStyle}>Optional override. Reads LogtoProvider context if omitted.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>colors</td>
            <td style={customTdTypeStyle}>ThemeColors</td>
            <td style={customTdStyle}>undefined</td>
            <td style={customTdStyle}>Optional override. Reads useThemeMode() context if omitted.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>do</td>
            <td style={customTdTypeStyle}>() =&gt; void</td>
            <td style={customTdStyle}>undefined</td>
            <td style={customTdStyle}>Custom click action. If omitted, opens the user dashboard.</td>
          </tr>
        </tbody>
      </table>
      <CodeBlock title="UserCardProps interface" code={`export interface UserCardProps {
  Canvas?: 'Avatar' | 'Initials';
  Size?: string;
  shape?: 'circle' | 'sq' | 'rsq';
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
