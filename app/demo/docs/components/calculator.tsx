'use client';

import CodeBlock from '../../components/SyntaxBlock';
import { SectionContainer, Section } from '../../components/Section';
import { useDocStyles } from '../../components/useDocStyles';
import CalculatorPanel from '../../components/calculator/CalculatorPanel';

function OverviewSection() {
  const styles = useDocStyles();
  return (
    <div style={styles.sectionWrapStyle}>
      <div style={styles.sectionHeadStyle}>
        <div style={styles.sectionDotStyle} />
        <span style={styles.sectionLabelStyle}>Calculator Demo</span>
      </div>
      <div style={styles.sectionBodyStyle}>
        <p style={styles.textStyle}>
          A permission-gated calculator demonstrating the <strong>Protected Actions API</strong>.
          Shows how to wrap UI with <code style={styles.codeStyle}>&lt;Protected&gt;</code>, gate via
          org-scoped RBAC, and call the API
          for every mathematical operation.
        </p>

        <p style={styles.textStyle}>
          <strong>Key Features:</strong>
        </p>
        <ul style={{ ...styles.textStyle, marginLeft: '1rem', marginBottom: '0.75rem' }}>
          <li>UI gated by <code style={styles.codeSmStyle}>&lt;Protected&gt;</code> component with org-scoped RBAC</li>
          <li>Each math operation is a protected server action (add, subtract, sin, cos, etc.)</li>
          <li>Calculator parses expressions into an AST and evaluates via sequential API calls</li>
          <li>No local evaluation -- the calculator cannot compute without the API</li>
          <li>Session state persistence via sessionStorage</li>
          <li>Two-tier permissions: basic vs scientific</li>
        </ul>
      </div>
    </div>
  );
}

function FilesSection() {
  const styles = useDocStyles();
  return (
    <div style={styles.sectionWrapStyle}>
      <div style={styles.sectionHeadStyle}>
        <div style={styles.sectionDotStyle} />
        <span style={styles.sectionLabelStyle}>Files</span>
      </div>
      <div style={styles.sectionBodyStyle}>
        <table style={styles.tableStyle}>
          <thead>
            <tr>
              <th style={styles.thStyle}>File</th>
              <th style={styles.thStyle}>Purpose</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.tdStyle}><code style={styles.codeStyle}>demo/components/calculator/CalculatorPanel.tsx</code></td>
              <td style={styles.tdStyle}>Thin wrapper with <code style={styles.codeSmStyle}>&lt;Protected&gt;</code> gate (org-scoped RBAC)</td>
            </tr>
            <tr>
              <td style={styles.tdStyle}><code style={styles.codeStyle}>demo/components/calculator/CalculatorClient.tsx</code></td>
              <td style={styles.tdStyle}>Calculator UI, AST parser, sequential API evaluator</td>
            </tr>
            <tr>
              <td style={styles.tdStyle}><code style={styles.codeStyle}>logto-kit/action-registry/calc-actions.ts</code></td>
              <td style={styles.tdStyle}>Atomic calc action handlers (add, subtract, sin, cos, etc.)</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProtectedGateSection() {
  const styles = useDocStyles();
  return (
    <div style={styles.sectionWrapStyle}>
      <div style={styles.sectionHeadStyle}>
        <div style={styles.sectionDotStyle} />
        <span style={styles.sectionLabelStyle}>Protected Gate Pattern</span>
      </div>
      <div style={styles.sectionBodyStyle}>
        <p style={styles.textStyle}>
          <code style={styles.codeStyle}>CalculatorPanel.tsx</code> is a thin wrapper
          that gates the calculator behind org-scoped RBAC:
        </p>
        <CodeBlock title="CalculatorPanel.tsx" code={`'use client';

import { Protected } from '../../../logto-kit/custom-logic';
import { CalculatorClient } from './CalculatorClient';

export default function CalculatorPanel() {
  return (
    <Protected
      orgId="5b6sw6p5uzti"
      perm="calc:basic"
      fallback={null}
    >
      <CalculatorClient />
    </Protected>
  );
}`} />
        <p style={styles.textStyle}>
          If the user lacks the <code style={styles.codeSmStyle}>calc:basic</code> permission,
          the calculator does not render at all (fallback is null). The org ID identifies which
          organization's roles and permissions to check.
        </p>
      </div>
    </div>
  );
}

function PermissionMatrixSection() {
  const styles = useDocStyles();
  return (
    <div style={styles.sectionWrapStyle}>
      <div style={styles.sectionHeadStyle}>
        <div style={styles.sectionDotStyle} />
        <span style={styles.sectionLabelStyle}>Permission Matrix</span>
      </div>
      <div style={styles.sectionBodyStyle}>
        <p style={styles.textStyle}>
          The calculator is scoped to an organization. The user must have the
          appropriate org role and permissions:
        </p>
        <table style={styles.tableStyle}>
          <thead>
            <tr>
              <th style={styles.thStyle}>Permission</th>
              <th style={styles.thStyle}>Unlocks</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.tdPropStyle}>calc:basic</td>
              <td style={styles.tdStyle}>
                Arithmetic operations: add, subtract, multiply, divide, modulo, power.{' '}
                <strong>Required for calculator to appear.</strong>
              </td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>calc:scientific</td>
              <td style={styles.tdStyle}>
                Scientific functions: sin, cos, tan, asin, acos, atan, log, ln, log₂, √x, xʸ, n!, 1/x, |x|, 10ˣ, eˣ.
              </td>
            </tr>
          </tbody>
        </table>
        <div style={styles.noteStyle}>
          <strong style={styles.strongNoteStyle}>How it works:</strong>{' '}
          <ul style={{ margin: '8px 0 0 16px', padding: 0 }}>
            <li>Numbers and parentheses are typed into the expression string locally</li>
            <li>Pressing <code style={styles.codeSmStyle}>=</code> triggers expression parsing into an AST</li>
            <li>Each AST node (e.g. <code style={styles.codeSmStyle}>Multiply(3, 4)</code>) is sent to the API as a separate protected action</li>
            <li>The API evaluates the operation server-side and returns the answer</li>
            <li>Results are assembled back into the expression until a final answer is reached</li>
            <li>The calculator cannot compute without the Protected Actions API</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function PermissionFlowSection() {
  const styles = useDocStyles();
  return (
    <div style={styles.sectionWrapStyle}>
      <div style={styles.sectionHeadStyle}>
        <div style={styles.sectionDotStyle} />
        <span style={styles.sectionLabelStyle}>Permission Flow</span>
      </div>
      <div style={styles.sectionBodyStyle}>
        <p style={styles.textStyle}>
          The calculator parses the user's expression into an abstract syntax tree (AST),
          then evaluates each node by calling the Protected Actions API:
        </p>
        <CodeBlock title="Expression tree and API call flow" code={`// Expression: 2 + 3 * 4
// AST: Add(Number(2), Multiply(Number(3), Number(4)))

// Evaluation order (respects precedence):
// 1. API: calc/multiply { a: 3, b: 4 }  -> 12
// 2. API: calc/add      { a: 2, b: 12 } -> 14

// Expression: sin(45) in DEG mode
// AST: Function('sin', Number(45))

// Evaluation:
// 1. API: calc/sin { n: 45, mode: 'deg' } -> 0.7071...`} />
        <table style={styles.tableStyle}>
          <thead>
            <tr>
              <th style={styles.thStyle}>Action</th>
              <th style={styles.thStyle}>Required Permission</th>
              <th style={styles.thStyle}>Payload</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.tdStyle}><code style={styles.codeSmStyle}>calc/add</code></td>
              <td style={styles.tdStyle}><code style={styles.codeSmStyle}>calc:basic</code></td>
              <td style={styles.tdStyle}><code style={styles.codeSmStyle}>{'{ a: number, b: number }'}</code></td>
            </tr>
            <tr>
              <td style={styles.tdStyle}><code style={styles.codeSmStyle}>calc/multiply</code></td>
              <td style={styles.tdStyle}><code style={styles.codeSmStyle}>calc:basic</code></td>
              <td style={styles.tdStyle}><code style={styles.codeSmStyle}>{'{ a: number, b: number }'}</code></td>
            </tr>
            <tr>
              <td style={styles.tdStyle}><code style={styles.codeSmStyle}>calc/power</code></td>
              <td style={styles.tdStyle}><code style={styles.codeSmStyle}>calc:basic</code></td>
              <td style={styles.tdStyle}><code style={styles.codeSmStyle}>{'{ a: number, b: number }'}</code></td>
            </tr>
            <tr>
              <td style={styles.tdStyle}><code style={styles.codeSmStyle}>calc/sin</code></td>
              <td style={styles.tdStyle}><code style={styles.codeSmStyle}>calc:scientific</code></td>
              <td style={styles.tdStyle}><code style={styles.codeSmStyle}>{"{ n: number, mode: 'deg' | 'rad' }"}</code></td>
            </tr>
            <tr>
              <td style={styles.tdStyle}><code style={styles.codeSmStyle}>calc/log</code></td>
              <td style={styles.tdStyle}><code style={styles.codeSmStyle}>calc:scientific</code></td>
              <td style={styles.tdStyle}><code style={styles.codeSmStyle}>{'{ n: number }'}</code></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ApiCallSection() {
  const styles = useDocStyles();
  return (
    <div style={styles.sectionWrapStyle}>
      <div style={styles.sectionHeadStyle}>
        <div style={styles.sectionDotStyle} />
        <span style={styles.sectionLabelStyle}>API Call on Equals</span>
      </div>
      <div style={styles.sectionBodyStyle}>
        <p style={styles.textStyle}>
          When the user presses <code style={styles.codeSmStyle}>=</code>, the calculator:
        </p>
        <ol style={{ ...styles.textStyle, marginLeft: '1rem', marginBottom: '0.75rem' }}>
          <li>Parses the expression string into an AST using a recursive-descent parser</li>
          <li>Evaluates the AST recursively, sending each operation to the API as a protected action</li>
          <li>The Protected Actions API validates the user's session, role, and permission before executing</li>
          <li>Each action returns an answer which feeds into the next operation</li>
        </ol>
        <CodeBlock title="handleEquals in CalculatorClient.tsx" code={`const handleEquals = useCallback(async () => {
  let exprToEval = '';
  let radMode = false;

  // Build expression string from state
  setState(prev => {
    exprToEval = prev.expr + (prev.curToken || '');
    radMode = prev.isRad;
    // close open parens...
    return { ...prev, expr: exprToEval, isCalculating: true };
  });

  // Parse into AST
  const tokens = tokenize(exprToEval);
  const tree = parseExpr(tokens);

  // Evaluate by calling the API for each node
  const result = await evalNode(tree, radMode);
  setState(prev => ({ ...prev, expr: fmtNum(result), isCalculating: false }));
}, []);`} />
        <CodeBlock title="evalNode sends each operation to the API" code={`async function evalNode(node: ExprNode, isRad: boolean): Promise<number> {
  switch (node.type) {
    case 'num': return node.value;
    case 'unary': return -(await evalNode(node.arg, isRad));
    case 'binop': {
      const left  = await evalNode(node.left, isRad);
      const right = await evalNode(node.right, isRad);
      return await callApi('calc/' + node.op, { a: left, b: right });
    }
    case 'func': {
      const arg = await evalNode(node.arg, isRad);
      const payload = isTrig(node.name)
        ? { n: arg, mode: isRad ? 'rad' : 'deg' }
        : { n: arg };
      return await callApi('calc/' + node.name, payload);
    }
  }
}`} />
        <p style={styles.textStyle}>
          <strong>Note:</strong> The API route derives authentication server-side via{' '}
          <code style={styles.codeSmStyle}>getTokenForServerAction()</code>. The client sends
          only <code style={styles.codeSmStyle}>{'{ action, payload }'}</code> -- no token or user ID
          in the request body.
        </p>
      </div>
    </div>
  );
}

function ActionHandlersSection() {
  const styles = useDocStyles();
  return (
    <div style={styles.sectionWrapStyle}>
      <div style={styles.sectionHeadStyle}>
        <div style={styles.sectionDotStyle} />
        <span style={styles.sectionLabelStyle}>Action Handlers</span>
      </div>
      <div style={styles.sectionBodyStyle}>
        <p style={styles.textStyle}>
          Every math operation is registered as its own protected action with all three required fields:
        </p>
        <CodeBlock title="calc-actions.ts (atomic actions)" code={`'use server';

export async function getCalcAdd() {
  return {
    requiredOrgId: CALC_ORG_ID,          // '5b6sw6p5uzti'
    requiredRoleId: 'calc-user-role-id', // actual Logto role UUID
    requiredPermId: 'calc:basic',
    handler: async ({ payload }) => {
      const { a, b } = payload as { a: number; b: number };
      return { answer: a + b };
    },
  };
}

export async function getCalcSin() {
  return {
    requiredOrgId: CALC_ORG_ID,
    requiredRoleId: 'calc-user-role-id',
    requiredPermId: 'calc:scientific',
    handler: async ({ payload }) => {
      const { n, mode } = payload as { n: number; mode: 'deg' | 'rad' };
      const radians = mode === 'deg' ? n * (Math.PI / 180) : n;
      return { answer: Math.sin(radians) };
    },
  };
}`} />
        <p style={styles.textStyle}>
          The real security is the <strong>Protected Actions API</strong>  it validates the session,
          checks the user's membership in the specified organization, their org roles,
          and their org permissions via the Management API (M2M), and only then
          calls the handler. Actions that are missing any of the three required fields throw{' '}
          <code style={styles.codeSmStyle}>IMPROPER_SETUP_ERROR</code> at startup.
        </p>
      </div>
    </div>
  );
}

function LiveDemoSection() {
  const styles = useDocStyles();
  return (
    <div style={styles.sectionWrapStyle}>
      <div style={styles.sectionHeadStyle}>
        <div style={styles.sectionDotStyle} />
        <span style={styles.sectionLabelStyle}>Live Calculator</span>
      </div>
      <div style={styles.sectionBodyStyle}>
        <p style={styles.textStyle}>
          The calculator below requires the <code style={styles.codeSmStyle}>calc:basic</code> permission
          in the Mathinators organization. If you are not a member or lack the permission, it will not appear.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
          <CalculatorPanel />
        </div>
      </div>
    </div>
  );
}

export default function CalculatorDoc() {
  const styles = useDocStyles();
  return (
    <SectionContainer>
      <Section id={1}>
        <div style={{ ...styles.twoColLayoutStyle, minHeight: '100%', padding: '16px' }}>
          <div style={styles.colLeftStyle}>
            <OverviewSection />
          </div>
          <div style={styles.colLeftStyle}>
            <FilesSection />
          </div>
        </div>
      </Section>

      <Section id={2}>
        <div style={{ ...styles.twoColLayoutStyle, minHeight: '100%', padding: '16px' }}>
          <div style={styles.colLeftStyle}>
            <ProtectedGateSection />
          </div>
          <div style={styles.colLeftStyle}>
            <PermissionMatrixSection />
          </div>
        </div>
      </Section>

      <Section id={3}>
        <div style={{ ...styles.twoColLayoutStyle, minHeight: '100%', padding: '16px' }}>
          <div style={styles.colLeftStyle}>
            <PermissionFlowSection />
          </div>
          <div style={styles.colLeftStyle}>
            <ApiCallSection />
          </div>
        </div>
      </Section>

      <Section id={4}>
        <div style={{ ...styles.twoColLayoutStyle, minHeight: '100%', padding: '16px' }}>
          <div style={styles.colLeftStyle}>
            <ActionHandlersSection />
          </div>
          <div style={styles.colLeftStyle}>
            <LiveDemoSection />
          </div>
        </div>
      </Section>
    </SectionContainer>
  );
}
