'use client';

import { useDocStyles } from '../../components/useDocStyles';
import CodeBlock from '../../components/SyntaxBlock';
import { slugify } from '../../components/SectionComponents';
import { useThemeMode } from '../../../logto-kit/components/providers/preferences';

export default function AnatomyAsyncPatternsDoc() {
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
      <h2 id={slugify('Cancelled Flag Pattern for Effects')} style={{ ...h2Style, marginTop: 0 }}>
        Cancelled Flag Pattern for Effects
      </h2>
      <p style={styles.textStyle}>
        Components that load async data inside <code>useEffect</code> must guard against stale updates. The current pattern uses a
        local <code>cancelled</code> boolean and checks it before setting state in <code>then</code>/<code>catch</code>/<code>finally</code>
        blocks.
      </p>
      <p style={styles.textStyle}>
        This prevents React state updates after unmount, and it also prevents a slower in-flight request from overriding a newer
        section state when dependencies change rapidly (for example, organization switching).
      </p>

      <CodeBlock
        title="Safe Async Effect Pattern"
        code={`useEffect(() => {
  let cancelled = false;

  setLoading(true);
  setRows([]);

  loadRows(activeOrg)
    .then((result) => {
      if (cancelled) return;
      if (result.ok) setRows(result.data);
    })
    .catch(() => {
      if (!cancelled) setRows([]);
    })
    .finally(() => {
      if (!cancelled) setLoading(false);
    });

  return () => {
    cancelled = true;
  };
}, [activeOrg]);`}
      />

      <h2 id={slugify('AbortController Limits in Server-Action Flows')} style={h2Style}>
        AbortController Limits in Server-Action Flows
      </h2>
      <p style={styles.textStyle}>
        <code>AbortController</code> can cancel browser-managed fetch activity, but it does not reliably cancel already-triggered
        server-side work in Server Action pipelines. Once the server action is executing on the server, the browser abort signal
        cannot be treated as a guaranteed stop mechanism for that server execution path.
      </p>
      <p style={styles.textStyle}>
        For this codebase, the canonical safety mechanism is still the UI-side cancellation guard. The component should ignore
        late responses after unmount or dependency change instead of assuming transport-level cancellation ended all work.
      </p>

      <table style={customTableStyle}>
        <thead>
          <tr>
            <th style={customThStyle}>Concern</th>
            <th style={customThStyle}>Recommended Handling</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={customTdPropStyle}>Unmount while request is in flight</td>
            <td style={customTdStyle}>Set <code>cancelled = true</code> in cleanup and ignore all subsequent resolution callbacks.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>Dependency changes before response returns</td>
            <td style={customTdStyle}>Start a fresh effect run and let previous run resolve silently without state writes.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>Need to stop stale UI updates</td>
            <td style={customTdStyle}>Guard every <code>setState</code> branch (<code>then</code>, <code>catch</code>, <code>finally</code>).</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>Attempting full server-side cancellation</td>
            <td style={customTdStyle}>Do not rely on <code>AbortController</code> as the sole protection in Server Action paths.</td>
          </tr>
        </tbody>
      </table>

      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Rule of thumb:</strong> treat async effects as best-effort operations. Always guard
        state writes locally so stale responses become harmless no-ops.
      </div>

      <h2 id={slugify('Generation Ref Counter Pattern')} style={h2Style}>
        Generation Ref Counter Pattern
      </h2>
      <p style={styles.textStyle}>
        The <code>useAsyncList</code> hook (in <code>app/logto-kit/hooks/use-async-list.ts</code>) uses a numeric counter alongside
        the boolean cancellation pattern. A <code>generationRef</code> increments each time a fetch starts. When the async operation
        completes, it compares its captured generation value against the current ref. If they differ, the result is discarded.
      </p>
      <p style={styles.textStyle}>
        This avoids the need for a mutable boolean that must be set in both the effect cleanup and the resolution callbacks.
        The counter pattern is self-contained: each effect run captures its own generation, and only the latest run&apos;s value
        will match the ref when the promise settles.
      </p>

      <CodeBlock
        title="Generation Ref Cancellation"
        code={`const generationRef = useRef(0);

useEffect(() => {
  const generation = ++generationRef.current;

  loader()
    .then((result) => {
      // Discard if a newer fetch started before this one finished
      if (generation !== generationRef.current) return;
      dispatch({ type: 'success', data: result.data });
    })
    .catch((err) => {
      if (generation !== generationRef.current) return;
      dispatch({ type: 'error', error: err.message });
    });

  return () => {
    generationRef.current++;
  };
}, [sourceKey]);`}
      />

      <h2 id={slugify('Streaming and Suspense with RSC')} style={h2Style}>
        Streaming and Suspense with RSC
      </h2>
      <p style={styles.textStyle}>
        The codebase uses React Server Components to kick off data fetches on the server and stream the results to the client.{' '}
        <code>RbacPromisesProvider</code> wraps the component tree and passes server-created promises into a client context.
        Consumer components call <code>use(promise)</code> inside a <code>&lt;Suspense&gt;</code> boundary, which suspends until
        the server data resolves.
      </p>
      <p style={styles.textStyle}>
        Once resolved, the data is passed as <code>initialData</code> to hooks like <code>useAsyncList</code>. When
        <code>initialData</code> is provided, the hook seeds its state immediately and skips the mount-effect fetch. This is the
        &quot;instant-fetch&quot; architecture from commit 5b608e9: the server does the heavy lifting, the client renders with data on
        first paint, and subsequent interactions (org switches, manual refresh) still go through the normal server-action path.
      </p>

      <CodeBlock
        title="Streaming Data Flow"
        code={`// Server component: kick off the promise
const dataPromise = fetchDashboardData();

// Client provider: pass promise to context
<RbacPromisesProvider promises={[dataPromise]}>
  <DashboardConsumer />
</RbacPromisesProvider>

// Consumer: use() inside Suspense
function DashboardConsumer() {
  const promise = useRbacPromise(0);
  const result = use(promise);
  // Pass to hook -- skips mount fetch
  const { items } = useAsyncList({
    loader: loadRoles,
    initialData: result.data.roles,
  });
}`}
      />
    </div>
  );
}
