'use client';

import CodeBlock from '../components/SyntaxBlock';
import { SectionContainer, Section } from '../components/Section';
import { useDocStyles } from '../components/useDocStyles';
import { SectionHeader, SectionWrap } from '../components/SectionComponents';

// ═══════════════════════════════════════════════════════════════════════════════
// Page 1, left: useRefreshable() hook
// ═══════════════════════════════════════════════════════════════════════════════

function UseRefreshableSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="useRefreshable()">
      <p style={styles.textStyle}>
        A hook that unmounts and remounts a React subtree on demand.
        Useful for data blocks that need live-refreshing - permissions lists,
        role tables, any block that fetches server-side data on mount.
      </p>
      <p style={styles.textStyle}>
        Returns <code style={styles.codeStyle}>&#123; visible, triggerRefresh &#125;</code>:
      </p>
      <table style={styles.tableStyle}>
        <thead>
          <tr>
            <th style={styles.thStyle}>Return</th>
            <th style={styles.thStyle}>Type</th>
            <th style={styles.thStyle}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tdPropStyle}>visible</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>boolean</code></td>
            <td style={styles.tdStyle}>Starts <code style={styles.codeSmStyle}>true</code>. When <code style={styles.codeSmStyle}>false</code>, the wrapped block should return <code style={styles.codeSmStyle}>null</code> (unmount).</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>triggerRefresh()</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>{'() => void'}</code></td>
            <td style={styles.tdStyle}>Sets visible to false (unmounts children), then after 35ms sets it to true (remounts). On remount all useEffect hooks re-run fresh, all useState resets to initial values.</td>
          </tr>
        </tbody>
      </table>
      <CodeBlock title="Hook source (hooks/use-refreshable.ts)" code={`'use client';
import { useState, useCallback, useEffect, useRef } from 'react';

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
}`} />
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Why 35ms?</strong>{' '}
        One render cycle to flush cleanup effects. Feels instant.
      </div>
      <CodeBlock title="Basic wrapper pattern" code={`function MyDataBlock() {
  const { visible, triggerRefresh } = useRefreshable();

  // ── useEffect runs on mount → fetches data ──
  useEffect(() => { fetchMyData(); }, []);

  if (!visible) return null; // ← unloaded state

  return (
    <div>
      <RefreshButton onClick={triggerRefresh} ... />
      {/* data display */}
    </div>
  );
}`} />
    </SectionWrap>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page 1, right: RefreshButton + Direct token fetch
// ═══════════════════════════════════════════════════════════════════════════════

function RefreshButtonSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="<RefreshButton />">
      <p style={styles.textStyle}>
        A shared button component for triggering the refresh. Lives inside the
        guarded block so it unmounts / remounts with the rest of the content.
      </p>
      <table style={styles.tableStyle}>
        <thead>
          <tr>
            <th style={styles.thStyle}>Prop</th>
            <th style={styles.thStyle}>Type</th>
            <th style={styles.thStyle}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tdPropStyle}>onClick</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>{'() => void'}</code></td>
            <td style={styles.tdStyle}>{'Pass '}<code style={styles.codeSmStyle}>triggerRefresh</code>{' from useRefreshable()'}</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>loading</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>boolean</code></td>
            <td style={styles.tdStyle}>Lowers opacity while data is loading, disables click</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>colors</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>ThemeColors</code></td>
            <td style={styles.tdStyle}>Theme color tokens for border, text color</td>
          </tr>
        </tbody>
      </table>
      <p style={styles.textStyle}>
        Source: <code style={styles.codeStyle}>components/dashboard/shared/RefreshButton.tsx</code>
      </p>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Button placement:</strong>{' '}
        Must be inside the useRefreshable() guard area so it unmounts and remounts with the data.
      </div>
    </SectionWrap>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page 2: Direct token fetch
// ═══════════════════════════════════════════════════════════════════════════════

function DirectTokenSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Direct token fetch">
      <p style={styles.textStyle}>
        The Logto SDK caches org access tokens in a cookie-persisted{' '}
        <code style={styles.codeStyle}>accessTokenMap</code>. Calling{' '}
        <code style={styles.codeStyle}>getOrganizationToken()</code> returns the
        cached token if it hasn&rsquo;t expired, even if the user was just granted
        new permissions. The direct HTTP call bypasses this cache entirely.
      </p>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Why not clearAccessToken()?</strong>{' '}
        clearAccessToken() clears all cached tokens and triggers Next.js cookie revalidation. Direct fetch avoids both.
      </div>
      <p style={styles.textStyle}>
        Source: <code style={styles.codeStyle}>logic/actions/organizations.ts</code>
      </p>
      <p style={styles.textStyle}>
        This server action is called by the component&rsquo;s{' '}
        <code style={styles.codeStyle}>useEffect</code> on mount. Since{' '}
        <code style={styles.codeStyle}>useRefreshable()</code> forces a remount on
        each refresh, the effect always runs with a fresh token from Logto.
      </p>
    </SectionWrap>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page 2, right: PermissionsBlock full example
// ═══════════════════════════════════════════════════════════════════════════════

function PermissionsBlockSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="PermissionsBlock pattern">
      <p style={styles.textStyle}>
        The complete pattern, extracted from the Organizations tab. Combines all
        three primitives into a refreshable data block.
      </p>
      <CodeBlock title="PermissionsBlock (tabs/organizations.tsx)" code={`const PermissionsBlock = ({ activeOrgId, colors, t, userData }) => {
  const { visible, triggerRefresh } = useRefreshable();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // ── Fetch on mount (and remount after refresh) ──
  useEffect(() => {
    let cancelled = false;
    setPermissions([]);
    setLoading(true);

    loadOrganizationPermissions(activeOrgId)
      .then(r => {
        if (cancelled) return;
        if (r.ok) setPermissions(r.data);
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [activeOrgId]);

  // ── 0 = unloaded ──
  if (!visible) return null;

  // ── 1 = loaded ──
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <p>PERMISSIONS</p>
        <RefreshButton
          onClick={triggerRefresh}
          loading={loading}
          colors={colors}
        />
      </div>
      <div>
        {permissions.map(p => (
          <div key={p}>{p}</div>
        ))}
      </div>
    </>
  );
};`} />
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Key design rules:</strong>
        <ul style={{ margin: '4px 0 0 12px', padding: 0, ...styles.textStyle }}>
          <li>The <code style={styles.codeSmStyle}>useEffect</code> lives inside the guarded block; it re-runs fresh on every remount</li>
          <li>The button lives inside the block; it unmounts and remounts with the data, so the user can click it again immediately</li>
          <li>The <code style={styles.codeSmStyle}>cancelled</code> flag prevents setState on unmounted components (React 18 strict mode)</li>
          <li>The <code style={styles.codeSmStyle}>useRefreshable</code> guard (<code style={styles.codeSmStyle}>if (!visible) return null</code>) is always the first render check</li>
        </ul>
      </div>
    </SectionWrap>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main export
// ═══════════════════════════════════════════════════════════════════════════════

export default function PrimitivesDoc() {
  const styles = useDocStyles();
  return (
    <SectionContainer>
      {/* Page 1: useRefreshable + RefreshButton / Direct token fetch */}
      <Section id={1}>
        <div style={{ ...styles.twoColLayoutStyle, minHeight: '100%', padding: '16px' }}>
          <div style={styles.colLeftStyle}>
            <UseRefreshableSection />
          </div>
          <div style={styles.colRightStyle}>
            <RefreshButtonSection />
          </div>
        </div>
      </Section>

      {/* Page 2: Direct token + PermissionsBlock */}
      <Section id={2}>
        <div style={{ ...styles.twoColLayoutStyle, minHeight: '100%', padding: '16px' }}>
          <div style={styles.colLeftStyle}>
            <DirectTokenSection />
          </div>
          <div style={styles.colRightStyle}>
            <PermissionsBlockSection />
          </div>
        </div>
      </Section>
    </SectionContainer>
  );
}
