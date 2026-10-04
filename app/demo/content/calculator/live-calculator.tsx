'use client';

import { useDocStyles } from '../../components/useDocStyles';
import CodeBlock from '../../components/SyntaxBlock';
import { useThemeMode } from '../../../logto-kit/components/providers/preferences';
import { slugify } from '../../components/SectionComponents';
import CalculatorPanel from '../../components/calculator/CalculatorPanel';

export default function LiveCalculator() {
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
      <h2 id={slugify("Live Interactive Calculator")} style={{ ...h2Style, marginTop: 0 }}>Live Interactive Calculator</h2>
      
      <p style={styles.textStyle}>
        Test the live interactive calculator below. The client parses expressions into an Abstract Syntax Tree (AST), then posts each operation to the session adapter at <code style={styles.codeSmStyle}>/api/protected</code>.
      </p>
      <div style={{ display: 'flex', justifyContent: 'center', margin: '24px 0' }}>
        <CalculatorPanel />
      </div>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Authorization:</strong> The <code style={styles.codeSmStyle}>&lt;Protected&gt;</code> wrapper is a client-side display gate. The server-side executor independently checks the authenticated principal, live organization roles, and permissions for every operation.
      </div>

      <h2 id={slugify("Overview: Protected Actions API")} style={h2Style}>Overview: Protected Actions API</h2>
      
      <p style={styles.textStyle}>
        This demo illustrates the protected-action executor. Mathematical operations run on the server after the session transport adapter establishes a principal and the executor checks the action policy.
      </p>
      <p style={styles.textStyle}>
        <strong>Key Architectural Features:</strong>
      </p>
      <ul style={{ ...styles.textStyle, marginLeft: '1rem', marginBottom: '0.75rem' }}>
        <li>Declarative client UI gating via <code style={styles.codeSmStyle}>&lt;Protected&gt;</code>. This gate does not authorize server requests.</li>
        <li>Session and automation transport adapters authenticate credentials before passing a server-derived principal to the executor.</li>
        <li>The executor uses <code style={styles.codeSmStyle}>fetchOrgRolePermissions()</code> for live organization RBAC and invokes only a registered handler.</li>
        <li>Action metadata controls accepted <code style={styles.codeSmStyle}>credentialModes</code> and <code style={styles.codeSmStyle}>permissionBinding</code>.</li>
        <li>AST parsing in the client with sequential HTTP evaluation of expression tree nodes.</li>
        <li>All arithmetic and scientific operations are delegated to the server. Only constant propagation (number nodes) and unary negation are performed locally.</li>
      </ul>

      <h2 id={slugify("File Anatomy")} style={h2Style}>File Anatomy</h2>
      
      <p style={styles.textStyle}>
        The calculator separates presentation, transport adapters, action policy, and server-side execution:
      </p>
      <table style={customTableStyle}>
        <thead>
          <tr>
            <th style={{ ...customThStyle, width: '40%' }}>File Path</th>
            <th style={{ ...customThStyle, width: '60%' }}>Role & Responsibility</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={customTdPropStyle}>app/demo/components/calculator/CalculatorPanel.tsx</td>
            <td style={customTdStyle}>
              Client-side display gate using <code style={styles.codeSmStyle}>&lt;Protected&gt;</code>. Server authorization remains in the API adapter and executor.
            </td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>app/demo/components/calculator/CalculatorClient.tsx</td>
            <td style={customTdStyle}>
              Core React component: builds the keypad, parses the expression tree, and sends only <code>action</code> and <code>payload</code> to the session route.
            </td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>app/api/protected/route.ts</td>
            <td style={customTdStyle}>
              Session transport adapter. It checks the origin and session, applies route-side limits, and serializes the executor result.
            </td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>app/logto-kit/action-registry/execute.ts</td>
            <td style={customTdStyle}>
              Credential-free executor. It checks action metadata, live roles and permissions, then calls the handler.
            </td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>app/logto-kit/action-registry/calc-actions.ts</td>
            <td style={customTdStyle}>
              Validates calculator payloads and declares the action&apos;s required organization, role, permissions, credential modes, and permission binding.
            </td>
          </tr>
        </tbody>
      </table>

      <h2 id={slugify("Client UI Gate")} style={h2Style}>Client UI Gate</h2>
      
      <p style={styles.textStyle}>
        <code style={styles.codeSmStyle}>CalculatorPanel.tsx</code> uses <code style={styles.codeSmStyle}>&lt;Protected&gt;</code> to hide the interface when the basic permission is absent from the client&apos;s current user data. This improves the interface but does not protect the API.
      </p>
      <CodeBlock title="CalculatorPanel.tsx" code={`'use client';

import { useEffect } from 'react';
import { Protected } from '../../../logto-kit';
import { useLogto } from '../../../logto-kit/components/providers/logto-provider';
import { CalculatorClient } from './CalculatorClient';

export default function CalculatorPanel() {
  const { isAuthenticated, openDashboard } = useLogto();

  // When unauthenticated, open the main auth modal instead of rendering an
  // inline fallback. The modal's routeTo will redirect the user back here
  // after they sign in.
  useEffect(() => {
    if (!isAuthenticated) {
      openDashboard({ routeTo: '/calculator/live-demo' });
    }
  }, [isAuthenticated, openDashboard]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Protected
      orgId="8joxv3kicmlz"
      perm="calc:basic"
      fallback={null}
    >
      <CalculatorClient />
    </Protected>
  );
}`} />

      <h2 id={slugify("Live RBAC and Action Policy")} style={h2Style}>Live RBAC and Action Policy</h2>
      
      <p style={styles.textStyle}>
        Each calculator operation declares its organization, required role, and required permission. The executor resolves current roles and permissions with <code style={styles.codeSmStyle}>fetchOrgRolePermissions()</code> for each execution instead of trusting client state.
      </p>
      <table style={customTableStyle}>
        <thead>
          <tr>
            <th style={{ ...customThStyle, width: '30%' }}>Scope / Permission</th>
            <th style={{ ...customThStyle, width: '70%' }}>Permitted Mathematical Capabilities</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={customTdPropStyle}>calc:basic</td>
            <td style={customTdStyle}>
              The basic operations: <code style={styles.codeSmStyle}>add</code>, <code style={styles.codeSmStyle}>subtract</code>, <code style={styles.codeSmStyle}>multiply</code>, <code style={styles.codeSmStyle}>divide</code>, <code style={styles.codeSmStyle}>modulo</code>, and <code style={styles.codeSmStyle}>power</code>. The client uses this permission for display gating only.
            </td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>calc:scientific</td>
            <td style={customTdStyle}>
              The advanced operations: trigonometric functions, logarithms, square root, absolute value, reciprocal, exponentials, and factorials. The executor enforces this permission even if a client sends a request directly.
            </td>
          </tr>
        </tbody>
      </table>

      <h2 id={slugify("AST Evaluation and Request Contract")} style={h2Style}>AST Evaluation and Request Contract</h2>
      
      <p style={styles.textStyle}>
        When evaluating a math string such as <code style={styles.codeSmStyle}>2 + 3 * 4</code>, the client tokenizes and parses it into an AST, then sends each non-constant node to the session route:
      </p>
      <CodeBlock title="Expression Evaluation Order" code={`// Expression: 2 + 3 * 4
// AST: Add(Number(2), Multiply(Number(3), Number(4)))

// 1. POST { action: 'calc/multiply', payload: { a: 3, b: 4 } }
//    The executor returns { answer: 12 } after live RBAC succeeds.
// 2. POST { action: 'calc/add', payload: { a: 2, b: 12 } }
//    The executor returns { answer: 14 } after live RBAC succeeds.`} />
      <CodeBlock title="AST Evaluator Loop (CalculatorClient.tsx)" code={`async function evalNode(node: ExprNode, isRad: boolean): Promise<number> {
  switch (node.type) {
    case 'num':
      return node.value;
    case 'unary':
      return -(await evalNode(node.arg, isRad));
    case 'binop': {
      const left = await evalNode(node.left, isRad);
      const right = await evalNode(node.right, isRad);
      return await callProtectedAction(OP_TO_ACTION[node.op], { a: left, b: right });
    }
    case 'func': {
      const arg = await evalNode(node.arg, isRad);
      const isTrig = ['sin', 'cos', 'tan', 'asin', 'acos', 'atan'].includes(node.name);
      if (isTrig) {
        return await callProtectedAction(FUNC_TO_ACTION[node.name], { n: arg, mode: isRad ? 'rad' : 'deg' });
      }
      return await callProtectedAction(FUNC_TO_ACTION[node.name], { n: arg });
    }
  }
}`} />
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Credential Boundary:</strong> The browser sends no credential or authorization context in the request body. The session adapter reads the session server-side, and the executor receives only a server-derived principal and mode.
      </div>

      <h2 id={slugify("Action Policy Metadata")} style={h2Style}>Action Policy Metadata</h2>
      
      <p style={styles.textStyle}>
        The registry stores authorization policy beside each handler. <code style={styles.codeSmStyle}>credentialModes</code> lists accepted principal modes. <code style={styles.codeSmStyle}>permissionBinding</code> chooses how the executor associates required permissions with roles.
      </p>
      <CodeBlock title="Action policy example" code={`const calcAdd: ActionConfig = {
  requiredOrgId: CALC_ORG_ID,
  requiredRoleId: CALC_ROLE_ID,
  requiredPermId: 'calc:basic',
  credentialModes: ['session', 'external'],
  permissionBinding: 'union',
  handler: async ({ payload }) => {
    const { a, b } = getBinaryPayload(payload);
    return { answer: a + b };
  },
};`} />
    </div>
  );
}
