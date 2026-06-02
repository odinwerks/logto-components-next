'use client';

import { useDocStyles } from '../../components/useDocStyles';
import CodeBlock from '../../components/SyntaxBlock';
import { useThemeMode } from '../../../logto-kit/components/providers/preferences';
import { slugify } from '../../components/SectionComponents';

export default function DashboardRendering() {
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
      <h2 id={slugify("The wiring (page.tsx)")} style={{ ...h2Style, marginTop: 0 }}>
        The wiring (page.tsx)
      </h2>
      <p style={styles.textStyle}>
        The dashboard supports two primary modes: a full-page route or an overlay modal.
      </p>
      <p style={styles.textStyle}>
        In the overlay modal scenario, the dashboard is passed as a Server Component JSX prop to the Client Component <code style={styles.codeStyle}>LogtoProvider</code>. This avoids React 19 Client Component boundary compilation errors when dealing with asynchronous server operations.
      </p>

      <CodeBlock
        title="Pre-rendered JSX as a prop"
        code={`export default async function HomePage() {
  const result = await fetchDashboardData();

  return (
    <LogtoProvider
      userData={result.userData}
      dashboard={<Dashboard />}  {/* Server Component JSX */}
    >
      <DemoApp />
    </LogtoProvider>
  );
}`}
      />

      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Key Pattern:</strong>{' '}
        Passing pre-rendered Server Component JSX directly as a prop lets developers embed server-side rendering logic directly within client-controlled layout components.
      </div>

      <h2 id={slugify("The modal (LogtoProvider)")} style={h2Style}>
        The modal (LogtoProvider)
      </h2>
      <p style={styles.textStyle}>
        The client-side <code style={styles.codeStyle}>LogtoProvider</code> manages the rendering lifecycle and opens the overlay when the internal state triggers.
      </p>

      <CodeBlock
        title="Modal lifecycle"
        code={`const [isDashboardOpen, setIsDashboardOpen] = useState(false);
const openDashboard = useCallback(() => setIsDashboardOpen(true), []);

// Escape key handler active only when open
useEffect(() => {
  if (!isDashboardOpen) return;
  const handleKey = (e) => e.key === 'Escape' && setIsDashboardOpen(false);
  document.addEventListener('keydown', handleKey);
  return () => document.removeEventListener('keydown', handleKey);
}, [isDashboardOpen]);

// Render overlay modal
{isDashboardOpen && dashboard && (
  <div style={{ position: 'fixed', inset: 0, zIndex: 9999, backdropFilter: 'blur(0.5rem)' }}>
    <button onClick={closeDashboard}>✕</button>
    {dashboard}
  </div>
)}`}
      />

      <h2 id={slugify("Trigger interaction and click events")} style={h2Style}>
        Trigger interaction and click events
      </h2>
      <p style={styles.textStyle}>
        Components like <code style={styles.codeStyle}>UserButton</code> and <code style={styles.codeStyle}>UserCard</code> utilize the <code style={styles.codeStyle}>useUserDisplay()</code> hook. This hook fetches the active context and calls <code style={styles.codeStyle}>openDashboard()</code>.
      </p>

      <CodeBlock
        title="useUserDisplay hook"
        code={`function useUserDisplay(opts) {
  const { openDashboard, userData } = useLogto();

  const handleClick = useCallback(() => {
    if (typeof opts.do === 'function') opts.do();
    else if (openDashboard) openDashboard();
  }, [opts.do, openDashboard]);

  return { userData, handleClick };
}`}
      />

      <div style={{ ...styles.noteStyle, marginBottom: 0 }}>
        <strong style={styles.strongNoteStyle}>UserBadge exception:</strong>{' '}
        The badge component is strictly display-only. It deactivates click interactions using the style <code style={styles.codeSmStyle}>pointerEvents: 'none'</code>.
      </div>
    </div>
  );
}