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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <h2 id={slugify("The wiring (page.tsx)")} style={{ ...h2Style, marginTop: 0 }}>
        The wiring (page.tsx)
      </h2>
      <p style={styles.textStyle}>
        The dashboard is rendered exclusively as an overlay modal inside <code style={styles.codeStyle}>LogtoProvider</code> via <code style={styles.codeStyle}>DashboardDialog</code> — there is no full-page dashboard route (<code style={styles.codeStyle}>app/page.tsx</code> is a public redirect to the docs).
      </p>
      <p style={styles.textStyle}>
        The dashboard is passed as a Server Component JSX prop to the Client Component <code style={styles.codeStyle}>LogtoProvider</code>. This avoids React 19 Client Component boundary compilation errors when dealing with asynchronous server operations.
      </p>

      <CodeBlock
        title="Pre-rendered JSX as a prop"
        code={`export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const result = await fetchDashboardDataCached({ tolerateAuthErrors: true });
  const userData = result.success ? result.userData : null;

  return (
    <LogtoProvider
      userData={userData}
      dashboard={{ desktop: <Dashboard />, mobile: <MobileDashboard /> }}
    >
      {children}
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
        code={`function DashboardDialog({
  onClose, desktop, mobile, routeTo, authMode,
}: {
  onClose: () => void;
  desktop: ReactNode;
  mobile?: ReactNode;
  routeTo?: string;
  authMode?: 'optional' | 'mandatory';
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, onClose);
  const { isAuthenticated } = useLogto();
  const isMobile = useIsPortrait();

  return (
    <motion.div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.07 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(0.5rem)',
      }}
    >
      {isAuthenticated ? (
        <>
          {!isMobile && (
            <button onClick={onClose} aria-label="Close dashboard">
              <X size={16} strokeWidth={1.5} />
            </button>
          )}
          <DashboardRouter desktop={desktop} mobile={mobile} />
        </>
      ) : (
        <AuthPromptModal routeTo={routeTo} mode={authMode} />
      )}
    </motion.div>
  );
}`}
      />

      <h2 id={slugify("Trigger interaction and click events")} style={h2Style}>
        Trigger interaction and click events
      </h2>
      <p style={styles.textStyle}>
        Components like <code style={styles.codeStyle}>UserButton</code> and <code style={styles.codeStyle}>UserCard</code> utilize the <code style={styles.codeStyle}>useUserDisplay()</code> hook. This hook fetches the active context and calls <code style={styles.codeStyle}>openDashboard()</code>.
      </p>

      <CodeBlock
        title="useUserDisplay hook (condensed)"
        code={`function useUserDisplay(opts: UseUserDisplayOptions) {
  const { colors: contextColors } = useThemeMode();
  const colors = opts.colors ?? contextColors;
  const { openDashboard, lang, isAuthenticated } = useLogto();
  const contextUserData = useUserDataContext();

  const [showFallback, setShowFallback] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  const userData = opts.userData ?? contextUserData ?? null;
  const isExplicitlyUnauthenticated = isAuthenticated === false;
  const effectiveShowFallback = userData ? false : showFallback;
  const loading = !userData && !effectiveShowFallback;

  // 1.5s timeout fallback before showing anonymous avatar
  useEffect(() => {
    if (userData || isExplicitlyUnauthenticated) return;
    const timeout = setTimeout(() => setShowFallback(true), 1500);
    return () => clearTimeout(timeout);
  }, [userData, isExplicitlyUnauthenticated]);

  const handleClick = useCallback(() => {
    if (typeof opts.do === 'function') opts.do();
    else if (openDashboard) openDashboard();
  }, [opts.do, openDashboard]);

  return {
    userData, loading,
    showFallback: effectiveShowFallback,
    isExplicitlyUnauthenticated,
    imageFailed, setImageFailed,
    colors, handleClick,
  };
}`}
      />

      <div style={{ ...styles.noteStyle, marginBottom: 0 }}>
        <strong style={styles.strongNoteStyle}>Source note:</strong>{' '}
        The real <code style={styles.codeSmStyle}>useUserDisplay</code> hook is 52 lines with additional i18n (<code style={styles.codeSmStyle}>t</code> translations) and mounted-ref management. User data is sourced from <code style={styles.codeSmStyle}>useUserDataContext()</code> (not the raw <code style={styles.codeSmStyle}>useLogto()</code> value), enabling cross-provider consistency.
      </div>

      <div style={{ ...styles.noteStyle, marginBottom: 0 }}>
        <strong style={styles.strongNoteStyle}>UserBadge exception:</strong>{' '}
        The badge component is strictly display-only. It deactivates click interactions using the style <code style={styles.codeSmStyle}>pointerEvents: &apos;none&apos;</code>.
      </div>
    </div>
  );
}
