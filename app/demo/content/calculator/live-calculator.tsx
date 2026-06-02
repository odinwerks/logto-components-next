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
        Test the live interactive calculator below. This client application parses mathematical expressions into an Abstract Syntax Tree (AST), then evaluates each step by dispatching secure Server Actions.
      </p>
      <div style={{ display: 'flex', justifyContent: 'center', margin: '24px 0' }}>
        <CalculatorPanel />
      </div>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Security Enforcement:</strong> If you do not belong to the Mathinators organization or lack the required <code style={styles.codeSmStyle}>calc:basic</code> permission, the calculator will completely refuse to render (rendering fallback: <code style={styles.codeSmStyle}>null</code>).
      </div>

      <h2 id={slugify("Overview: Protected Actions API")} style={h2Style}>Overview: Protected Actions API</h2>
      
      <p style={styles.textStyle}>
        This demo illustrates the <strong>Protected Actions API pattern</strong>. Instead of local evaluation, mathematical computation is delegated exclusively to the backend server. The calculator cannot solve any equation without successfully passing the OIDC auth and permission checks on every single atomic arithmetic request.
      </p>
      <p style={styles.textStyle}>
        <strong>Key Architectural Features:</strong>
      </p>
      <ul style={{ ...styles.textStyle, marginLeft: '1rem', marginBottom: '0.75rem' }}>
        <li>Declarative UI gating via the <code style={styles.codeSmStyle}>&lt;Protected&gt;</code> wrapper with organization-scoped RBAC.</li>
        <li>Server-side validation of active user sessions, organization memberships, and role-scoped permissions.</li>
        <li>AST parsing in the client with sequential API evaluation of expression tree nodes.</li>
        <li>No local javascript math evaluation fallback (completely secure and tamper-proof).</li>
      </ul>

      <h2 id={slugify("File Anatomy")} style={h2Style}>File Anatomy</h2>
      
      <p style={styles.textStyle}>
        The calculator implementation is cleanly separated into presentational wrappers, parsers, and protected server-side endpoints:
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
            <td style={customTdPropStyle}>demo/components/calculator/CalculatorPanel.tsx</td>
            <td style={customTdStyle}>
              Thin presentational gate wrapping the interactive client with <code style={styles.codeSmStyle}>&lt;Protected&gt;</code>.
            </td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>demo/components/calculator/CalculatorClient.tsx</td>
            <td style={customTdStyle}>
              Core React component: builds calculator keypads, implements the recursive-descent AST parser, and fires asynchronous API calls.
            </td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>logto-kit/action-registry/calc-actions.ts</td>
            <td style={customTdStyle}>
              Secure server-side mathematical handlers (add, subtract, sin, cos, etc.) protected by the Server Action gateway.
            </td>
          </tr>
        </tbody>
      </table>

      <h2 id={slugify("The Declarative Guard Pattern")} style={h2Style}>The Declarative Guard Pattern</h2>
      
      <p style={styles.textStyle}>
        The wrapper component <code style={styles.codeSmStyle}>CalculatorPanel.tsx</code> shields the interactive client interface from unauthorized rendering:
      </p>
      <CodeBlock title="CalculatorPanel.tsx" code={`'use client';

import { Protected } from '../../../logto-kit/custom-logic';
import { CalculatorClient } from './CalculatorClient';

export default function CalculatorPanel() {
  return (
    <Protected
      orgId="5b6sw6p5uzti" // Mathinators Organization ID
      perm="calc:basic"   // Required Permission
      fallback={null}     // Redact completely if check fails
    >
      <CalculatorClient />
    </Protected>
  );
}`} />

      <h2 id={slugify("Permission Scope Matrix")} style={h2Style}>Permission Scope Matrix</h2>
      
      <p style={styles.textStyle}>
        Server Actions require specific scopes based on the operational complexity of the expression node:
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
              Arithmetic operations: <code style={styles.codeSmStyle}>add</code>, <code style={styles.codeSmStyle}>subtract</code>, <code style={styles.codeSmStyle}>multiply</code>, <code style={styles.codeSmStyle}>divide</code>, <code style={styles.codeSmStyle}>modulo</code>, and <code style={styles.codeSmStyle}>power</code>. <strong>Mandatory to render the keypad.</strong>
            </td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>calc:scientific</td>
            <td style={customTdStyle}>
              Advanced operations: Trigonometric (<code style={styles.codeSmStyle}>sin</code>, <code style={styles.codeSmStyle}>cos</code>, <code style={styles.codeSmStyle}>tan</code>, <code style={styles.codeSmStyle}>asin</code>, <code style={styles.codeSmStyle}>acos</code>, <code style={styles.codeSmStyle}>atan</code>), Logarithmic (<code style={styles.codeSmStyle}>log</code>, <code style={styles.codeSmStyle}>ln</code>, <code style={styles.codeSmStyle}>log2</code>), Square Root, Exponentials, and Factorials.
            </td>
          </tr>
        </tbody>
      </table>

      <h2 id={slugify("AST Evaluation & Secure Communication")} style={h2Style}>AST Evaluation & Secure Communication</h2>
      
      <p style={styles.textStyle}>
        When evaluating a math string like <code style={styles.codeSmStyle}>2 + 3 * 4</code>, the client tokenizes and parses it into an AST, then systematically resolves nodes by executing requests:
      </p>
      <CodeBlock title="Expression Evaluation Order" code={`// Expression: 2 + 3 * 4
// AST Representation: Add(Number(2), Multiply(Number(3), Number(4)))

// Step-by-step resolution:
// 1. Dispatch Server Action: calc/multiply { a: 3, b: 4 }  => Returns 12
// 2. Dispatch Server Action: calc/add      { a: 2, b: 12 } => Returns 14`} />
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
        <strong style={styles.strongNoteStyle}>Cryptographic Security:</strong> The API endpoints obtain tokens server-side via cookies and the Logto SDK. The browser client does not possess or transmit access tokens, avoiding any leakage in the client-side network space.
      </div>

      <h2 id={slugify("Secure Server Action Handlers")} style={h2Style}>Secure Server Action Handlers</h2>
      
      <p style={styles.textStyle}>
        Every Server Action registration enforces strict authentication policies by defining org IDs, role IDs, and permissions:
      </p>
      <CodeBlock title="calc-actions.ts" code={`'use server';

export async function getCalcAdd() {
  return {
    requiredOrgId: '5b6sw6p5uzti',          // Hardcoded Organization Context
    requiredRoleId: 'calc-user-role-id',    // Logto Role UUID
    requiredPermId: 'calc:basic',           // Permission Scope
    handler: async ({ payload }) => {
      const { a, b } = payload as { a: number; b: number };
      return { answer: a + b };
    },
  };
}

export async function getCalcSin() {
  return {
    requiredOrgId: '5b6sw6p5uzti',
    requiredRoleId: 'calc-user-role-id',
    requiredPermId: 'calc:scientific',
    handler: async ({ payload }) => {
      const { n, mode } = payload as { n: number; mode: 'deg' | 'rad' };
      const radians = mode === 'deg' ? n * (Math.PI / 180) : n;
      return { answer: Math.sin(radians) };
    },
  };
}`} />
    </div>
  );
}
