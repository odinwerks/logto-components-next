'use client';

import { useDocStyles } from '../../components/useDocStyles';
import CodeBlock from '../../components/SyntaxBlock';
import { SectionWrap } from '../../components/SectionComponents';

export default function DashboardRendering() {
  const styles = useDocStyles();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <SectionWrap label="The wiring (page.tsx)">
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
      </SectionWrap>

      <SectionWrap label="The modal (LogtoProvider)">
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
      </SectionWrap>

      <SectionWrap label="Trigger interaction and click events">
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
      </SectionWrap>
    </div>
  );
}
