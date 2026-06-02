'use client';

import { useDocStyles } from '../../components/useDocStyles';
import CodeBlock from '../../components/SyntaxBlock';
import { useThemeMode } from '../../../logto-kit/components/providers/preferences';
import { slugify } from '../../components/SectionComponents';

export default function DashboardMobile() {
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <h2 id={slugify("Mobile layout system")} style={{ ...h2Style, marginTop: 0 }}>
        Mobile layout system
      </h2>

      <p style={styles.textStyle}>
        The system adapts to viewports using an orientation-based responsive router. When portrait mode triggers, the system mounts the mobile layout optimized for touch navigation.
      </p>

      <CodeBlock
        title="Component hierarchy"
        code={`LogtoProvider
  └─ DashboardRouter (switches based on orientation)
       ├─ desktop: DashboardClient (sidebar and content)
       └─ mobile:  MobileClient   (menu and active tab views)`}
      />

      <p style={{ ...styles.textStyle, marginBottom: 0 }}>
        Detection is driven by CSS media-queries, not screen dimensions. A narrow desktop window in landscape format displays the sidebar, whereas a portrait device displays the mobile-specific stack.
      </p>

      <h2 id={slugify("Orientation detection: useIsPortrait()")} style={h2Style}>
        Orientation detection: useIsPortrait()
      </h2>

      <p style={styles.textStyle}>
        The <code style={styles.codeStyle}>useIsPortrait()</code> hook tracks active viewport changes:
      </p>

      <CodeBlock
        title="useIsPortrait implementation"
        code={`function useIsPortrait(): boolean {
  const [portrait, setPortrait] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(orientation: portrait)');
    setPortrait(mq.matches);
    const handler = (e) => setPortrait(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return portrait;
}`}
      />

      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Server-Side Rendering fallback:</strong>{' '}
        During SSR, the hook defaults to returning <code style={styles.codeSmStyle}>false</code> (desktop mode) until hydration completes on the client.
      </div>

      <h2 id={slugify("Responsive Switch: DashboardRouter")} style={h2Style}>
        Responsive Switch: DashboardRouter
      </h2>

      <p style={styles.textStyle}>
        The <code style={styles.codeStyle}>DashboardRouter</code> is a switch component that determines the active rendering target:
      </p>

      <CodeBlock
        title="Router Switch"
        code={`function DashboardRouter({
  desktop,
  mobile,
}: {
  desktop: ReactNode;
  mobile: ReactNode;
}) {
  const isPortrait = useIsPortrait();
  return <>{isPortrait ? mobile : desktop}</>;
}`}
      />

      <h2 id={slugify("MobileClient architecture and gestures")} style={h2Style}>
        MobileClient architecture and gestures
      </h2>

      <p style={styles.textStyle}>
        The <code style={styles.codeStyle}>MobileClient</code> component handles mobile interactions and transitions.
      </p>

      <table style={customTableStyle}>
        <thead>
          <tr>
            <th style={{ ...customThStyle, width: '30%' }}>Interaction Detail</th>
            <th style={{ ...customThStyle, width: '70%' }}>Mechanic</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={customTdPropStyle}>Two-view Stack</td>
            <td style={customTdStyle}>Toggles between the <code style={styles.codeSmStyle}>menu</code> list of tabs and the active <code style={styles.codeSmStyle}>tab</code> viewport.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>Staggered Entry</td>
            <td style={customTdStyle}>Employs <code style={styles.codeSmStyle}>mStagger</code> animations applying <code style={styles.codeSmStyle}>index * 0.08s</code> staggered delay values to layout items.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>Touch feedback</td>
            <td style={customTdStyle}>Monitors <code style={styles.codeSmStyle}>onTouchStart</code> and <code style={styles.codeSmStyle}>onTouchEnd</code> with an intentional 150ms release timer to smooth out list tap states.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>Navigation actions</td>
            <td style={customTdStyle}>Renders floating back triggers and overlay exit actions.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>mobmode prop</td>
            <td style={customTdStyle}>Passes <code style={styles.codeSmStyle}>mobmode=1</code> to nested tabs to adapt internal elements for mobile screen limitations.</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}