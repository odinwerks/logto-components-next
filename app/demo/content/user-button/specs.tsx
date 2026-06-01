'use client';

import { useDocStyles } from '../../components/useDocStyles';
import CodeBlock from '../../components/SyntaxBlock';
import { SectionWrap } from '../../components/SectionComponents';

export default function UserButtonSpecs() {
  const styles = useDocStyles();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <SectionWrap label="Quick start">
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
      </SectionWrap>

      <SectionWrap label="UserButton Props">
        <table style={styles.tableStyle}>
          <thead>
            <tr>
              <th style={{ ...styles.thStyle, width: '20%' }}>Prop</th>
              <th style={{ ...styles.thStyle, width: '30%' }}>Type</th>
              <th style={{ ...styles.thStyle, width: '20%' }}>Default</th>
              <th style={{ ...styles.thStyle, width: '30%' }}>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.tdPropStyle}>Canvas</td>
              <td style={styles.tdTypeStyle}>'Avatar' | 'Initials'</td>
              <td style={styles.tdStyle}>undefined</td>
              <td style={styles.tdStyle}>Forces avatar image or initials fallback. Defaults to showing avatar image if available.</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>Size</td>
              <td style={styles.tdTypeStyle}>string</td>
              <td style={styles.tdStyle}>'6.25rem'</td>
              <td style={styles.tdStyle}>CSS size string (e.g. '80px', '4rem').</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>shape</td>
              <td style={styles.tdTypeStyle}>'circle' | 'sq' | 'rsq'</td>
              <td style={styles.tdStyle}>undefined</td>
              <td style={styles.tdStyle}>Sets border radius. Falls back to USER_SHAPE environment variable, then to 'circle'.</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>userData</td>
              <td style={styles.tdTypeStyle}>UserData</td>
              <td style={styles.tdStyle}>undefined</td>
              <td style={styles.tdStyle}>Optional override. Reads LogtoProvider context if omitted.</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>colors</td>
              <td style={styles.tdTypeStyle}>ThemeColors</td>
              <td style={styles.tdStyle}>undefined</td>
              <td style={styles.tdStyle}>Optional override. Reads useThemeMode() context if omitted.</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>do</td>
              <td style={styles.tdTypeStyle}>() =&gt; void</td>
              <td style={styles.tdStyle}>undefined</td>
              <td style={styles.tdStyle}>Custom click action. If omitted, opens the user dashboard.</td>
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
      </SectionWrap>

      <SectionWrap label="UserBadge Props">
        <table style={styles.tableStyle}>
          <thead>
            <tr>
              <th style={{ ...styles.thStyle, width: '20%' }}>Prop</th>
              <th style={{ ...styles.thStyle, width: '30%' }}>Type</th>
              <th style={{ ...styles.thStyle, width: '20%' }}>Default</th>
              <th style={{ ...styles.thStyle, width: '30%' }}>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.tdPropStyle}>Canvas</td>
              <td style={styles.tdTypeStyle}>'Avatar' | 'Initials'</td>
              <td style={styles.tdStyle}>undefined</td>
              <td style={styles.tdStyle}>Forces avatar image or initials fallback. Defaults to showing avatar image if available.</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>Size</td>
              <td style={styles.tdTypeStyle}>string</td>
              <td style={styles.tdStyle}>'6.25rem'</td>
              <td style={styles.tdStyle}>CSS size string (e.g. '80px', '4rem').</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>shape</td>
              <td style={styles.tdTypeStyle}>'circle' | 'sq' | 'rsq'</td>
              <td style={styles.tdStyle}>undefined</td>
              <td style={styles.tdStyle}>Sets border radius. Falls back to USER_SHAPE environment variable, then to 'circle'.</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>userData</td>
              <td style={styles.tdTypeStyle}>UserData</td>
              <td style={styles.tdStyle}>undefined</td>
              <td style={styles.tdStyle}>Optional override. Reads LogtoProvider context if omitted.</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>colors</td>
              <td style={styles.tdTypeStyle}>ThemeColors</td>
              <td style={styles.tdStyle}>undefined</td>
              <td style={styles.tdStyle}>Optional override. Reads useThemeMode() context if omitted.</td>
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
      </SectionWrap>

      <SectionWrap label="UserCard Props">
        <table style={styles.tableStyle}>
          <thead>
            <tr>
              <th style={{ ...styles.thStyle, width: '20%' }}>Prop</th>
              <th style={{ ...styles.thStyle, width: '30%' }}>Type</th>
              <th style={{ ...styles.thStyle, width: '20%' }}>Default</th>
              <th style={{ ...styles.thStyle, width: '30%' }}>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.tdPropStyle}>Canvas</td>
              <td style={styles.tdTypeStyle}>'Avatar' | 'Initials'</td>
              <td style={styles.tdStyle}>undefined</td>
              <td style={styles.tdStyle}>Forces avatar image or initials fallback. Defaults to showing avatar image if available.</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>Size</td>
              <td style={styles.tdTypeStyle}>string</td>
              <td style={styles.tdStyle}>'2.5rem'</td>
              <td style={styles.tdStyle}>CSS size string (e.g. '80px', '4rem'). Note that default is smaller than button or badge.</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>shape</td>
              <td style={styles.tdTypeStyle}>'circle' | 'sq' | 'rsq'</td>
              <td style={styles.tdStyle}>undefined</td>
              <td style={styles.tdStyle}>Sets border radius. Falls back to USER_SHAPE environment variable, then to 'circle'.</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>userData</td>
              <td style={styles.tdTypeStyle}>UserData</td>
              <td style={styles.tdStyle}>undefined</td>
              <td style={styles.tdStyle}>Optional override. Reads LogtoProvider context if omitted.</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>colors</td>
              <td style={styles.tdTypeStyle}>ThemeColors</td>
              <td style={styles.tdStyle}>undefined</td>
              <td style={styles.tdStyle}>Optional override. Reads useThemeMode() context if omitted.</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>do</td>
              <td style={styles.tdTypeStyle}>() =&gt; void</td>
              <td style={styles.tdStyle}>undefined</td>
              <td style={styles.tdStyle}>Custom click action. If omitted, opens the user dashboard.</td>
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
      </SectionWrap>

      <SectionWrap label="Core Behaviors and Design Notes">
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
      </SectionWrap>
    </div>
  );
}
