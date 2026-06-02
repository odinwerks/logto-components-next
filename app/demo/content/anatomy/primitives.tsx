'use client';

import { useDocStyles } from '../../components/useDocStyles';
import CodeBlock from '../../components/SyntaxBlock';
import { slugify } from '../../components/SectionComponents';
import { useThemeMode } from '../../../logto-kit/components/providers/preferences';

export default function AnatomyPrimitivesDoc() {
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h2 id={slugify("useRefreshable() State Tracker Hook")} style={{ ...h2Style, marginTop: 0 }}>
        useRefreshable() State Tracker Hook
      </h2>
      <p style={styles.textStyle}>
        The <code>useRefreshable()</code> hook handles dynamic client-side lifecycle management. It facilitates the unmounting and subsequent remounting of a React component subtree. This capability is used to force a reset of all local state variables and re-trigger initialization effects, such as fetching fresh data from the server.
      </p>
      <p style={styles.textStyle}>
        The hook toggles a boolean state parameter (<code>visible</code>). Calling <code>triggerRefresh()</code> changes <code>visible</code> to <code>false</code> to unmount the subtree, then restores it to <code>true</code> after a brief delay of 35 milliseconds. This delay ensures the React render loop fully cleans up the unmounted nodes before rebuilding them.
      </p>

      <CodeBlock
        title="useRefreshable Hook Implementation"
        code={`import { useState, useCallback, useEffect, useRef } from 'react';

const REFRESH_GAP_MS = 35;

export function useRefreshable() {
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerRefresh = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
    timerRef.current = setTimeout(() => {
      setVisible(true);
    }, REFRESH_GAP_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { visible, triggerRefresh };
}`}
      />

      <h2 id={slugify("RefreshButton Component")} style={h2Style}>
        RefreshButton Component
      </h2>
      <p style={styles.textStyle}>
        The <code>&lt;RefreshButton /&gt;</code> is a reusable user interface trigger connected to the refresh lifecycle. It accepts configuration properties to handle actions and loading status.
      </p>
      <table style={customTableStyle}>
        <thead>
          <tr>
            <th style={customThStyle}>Prop Name</th>
            <th style={customThStyle}>Type Definition</th>
            <th style={customThStyle}>Functional Purpose</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={customTdPropStyle}>onClick</td>
            <td style={customTdStyle}><code>{'() => void'}</code></td>
            <td style={customTdStyle}>
              Triggers the lifecycle update callback. Typically assigned to the <code>triggerRefresh</code> function returned by the refresh tracker hook.
            </td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>loading</td>
            <td style={customTdStyle}><code>boolean</code></td>
            <td style={customTdStyle}>
              Alters component opacity to indicate active operations and deactivates clicking events during state loading.
            </td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>colors</td>
            <td style={customTdStyle}><code>ThemeColors</code></td>
            <td style={customTdStyle}>
              Supplies color tokens for drawing matching boundaries, hover borders, and icon fills.
            </td>
          </tr>
        </tbody>
      </table>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Placement Constraint:</strong> The button must be positioned within the subtree guarded by the <code>visible</code> conditional check. This ensures that the button itself is unmounted and remounted alongside the displayed data, restoring instant interaction once reloading completes.
      </div>

      <h2 id={slugify("Direct Token Fetching (Bypassing SDK Cache)")} style={h2Style}>
        Direct Token Fetching (Bypassing SDK Cache)
      </h2>
      <p style={styles.textStyle}>
        By default, the Logto SDK caches organization tokens within a cookie-persisted <code>accessTokenMap</code>. When requesting permissions via <code>getOrganizationToken()</code>, the SDK returns the cached token if it has not reached expiration, even if the user has recently been assigned new permissions.
      </p>
      <p style={styles.textStyle}>
        To support instant permissions updates, the application bypasses this caching mechanism. Instead of relying on cookie-based client calls, it makes direct HTTP requests directly to the Logto Token endpoint on the server. Combining this direct API call with the <code>useRefreshable()</code> remounting lifecycle forces the application to load a fresh organization access token containing newly modified permissions list on every manual refresh.
      </p>

      <h2 id={slugify("PermissionsBlock Live-Update UI Pattern")} style={h2Style}>
        PermissionsBlock Live-Update UI Pattern
      </h2>
      <p style={styles.textStyle}>
        The live-update architecture integrates all three primitive blocks (unmount tracking, the refresh action button, and custom token fetching) into a single cohesive UI pattern. This pattern is demonstrated in the <code>PermissionsBlock</code> element:
      </p>

      <CodeBlock
        title="PermissionsBlock Integration Example"
        code={`const PermissionsBlock = ({ activeOrgId, colors, t }) => {
  const { visible, triggerRefresh } = useRefreshable();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setPermissions([]);
    setLoading(true);

    // Call server action that fetches fresh token and permissions bypasses cache
    loadOrganizationPermissions(activeOrgId)
      .then(r => {
        if (cancelled) return;
        if (r.ok) setPermissions(r.data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeOrgId]);

  // First render check: unmount subtree when requested
  if (!visible) return null;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <p>Permissions List</p>
        <RefreshButton
          onClick={triggerRefresh}
          loading={loading}
          colors={colors}
        />
      </div>
      <ul>
        {permissions.map(p => (
          <li key={p}>{p}</li>
        ))}
      </ul>
    </div>
  );
};`}
      />

      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Architectural Design Rules:</strong>
        <ul style={{ margin: '4px 0 0 12px', padding: 0, ...styles.textStyle }}>
          <li>The <code>useEffect</code> block must be contained inside the conditional rendering tree so that it re-initializes on mount.</li>
          <li>The cleanup function must toggle a <code>cancelled</code> boolean state to prevent post-unmount state updates.</li>
          <li>The visibility boundary guard (<code>if (!visible) return null</code>) must execute before accessing any active content markup.</li>
        </ul>
      </div>
    </div>
  );
}