'use client';

import { useDocStyles } from '../../components/useDocStyles';
import CodeBlock from '../../components/SyntaxBlock';
import { SectionWrap } from '../../components/SectionComponents';

export default function DashboardMobile() {
  const styles = useDocStyles();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <SectionWrap label="Mobile layout system">
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
      </SectionWrap>

      <SectionWrap label="Orientation detection: useIsPortrait()">
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
      </SectionWrap>

      <SectionWrap label="Responsive Switch: DashboardRouter">
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
      </SectionWrap>

      <SectionWrap label="MobileClient architecture and gestures">
        <p style={styles.textStyle}>
          The <code style={styles.codeStyle}>MobileClient</code> component handles mobile interactions and transitions.
        </p>

        <table style={styles.tableStyle}>
          <thead>
            <tr>
              <th style={{ ...styles.thStyle, width: '30%' }}>Interaction Detail</th>
              <th style={{ ...styles.thStyle, width: '70%' }}>Mechanic</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.tdPropStyle}>Two-view Stack</td>
              <td style={styles.tdStyle}>Toggles between the <code style={styles.codeSmStyle}>menu</code> list of tabs and the active <code style={styles.codeSmStyle}>tab</code> viewport.</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>Staggered Entry</td>
              <td style={styles.tdStyle}>Employs <code style={styles.codeSmStyle}>mStagger</code> animations applying <code style={styles.codeSmStyle}>index * 0.08s</code> staggered delay values to layout items.</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>Touch feedback</td>
              <td style={styles.tdStyle}>Monitors <code style={styles.codeSmStyle}>onTouchStart</code> and <code style={styles.codeSmStyle}>onTouchEnd</code> with an intentional 150ms release timer to smooth out list tap states.</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>Navigation actions</td>
              <td style={styles.tdStyle}>Renders floating back triggers and overlay exit actions.</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>mobmode prop</td>
              <td style={styles.tdStyle}>Passes <code style={styles.codeSmStyle}>mobmode=1</code> to nested tabs to adapt internal elements for mobile screen limitations.</td>
            </tr>
          </tbody>
        </table>
      </SectionWrap>
    </div>
  );
}
