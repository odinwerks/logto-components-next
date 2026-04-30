'use client';

import CodeBlock from '../../utils/CodeBlock';
import { SectionContainer, Section } from '../../utils/Section';
import { useDocStyles } from '../../utils/useDocStyles';
import CalculatorPanel from '../../logic/CalculatorPanel';

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
          Shows how to wrap UI with <code style={styles.codeStyle}>&lt;Protected&gt;</code> and
          call <code style={styles.codeStyle}>POST /api/protected</code> from a client component.
        </p>

        <p style={styles.textStyle}>
          <strong>Key Features:</strong>
        </p>
        <ul style={{ ...styles.textStyle, marginLeft: '1rem', marginBottom: '0.75rem' }}>
          <li>UI gated by <code style={styles.codeSmStyle}>&lt;Protected&gt;</code> component</li>
          <li>Permission detection based on expression content</li>
          <li>Calls Protected Actions API on <code style={styles.codeSmStyle}>=</code> press</li>
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
              <td style={styles.tdStyle}><code style={styles.codeStyle}>demo/logic/CalculatorPanel.tsx</code></td>
              <td style={styles.tdStyle}>Thin wrapper with <code style={styles.codeSmStyle}>&lt;Protected&gt;</code> gate</td>
            </tr>
            <tr>
              <td style={styles.tdStyle}><code style={styles.codeStyle}>demo/logic/CalculatorClient.tsx</code></td>
              <td style={styles.tdStyle}>Calculator UI, parser, API calls (753 lines)</td>
            </tr>
            <tr>
              <td style={styles.tdStyle}><code style={styles.codeStyle}>custom-actions/calc-actions/basic.ts</code></td>
              <td style={styles.tdStyle}>Handler for basic operations</td>
            </tr>
            <tr>
              <td style={styles.tdStyle}><code style={styles.codeStyle}>custom-actions/calc-actions/scientific.ts</code></td>
              <td style={styles.tdStyle}>Handler for scientific functions</td>
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
          <code style={styles.codeStyle}>CalculatorPanel.tsx</code> is a thin Server Component
          that gates the calculator behind org membership + permission:
        </p>
        <CodeBlock title="CalculatorPanel.tsx" code={`'use client';

import { Protected } from '../../logto-kit/custom-logic';
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
          If the user isn't a member of the organization or lacks <code style={styles.codeSmStyle}>calc:basic</code>,
          the calculator doesn't render at all (fallback is null).
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
          The calculator requires membership in the <strong>Mathinators</strong> organization.
          Different permissions unlock different features:
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
                Basic calculator operations (+, −, ×, ÷, %, =).{' '}
                <strong>Required for calculator to appear.</strong>
              </td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>calc:scientific</td>
              <td style={styles.tdStyle}>
                Scientific functions: sin, cos, tan, asin, acos, atan, log, ln, log₂, √x, xʸ, n!, 1/x, |x|, 10ˣ, eˣ, π, e.
              </td>
            </tr>
          </tbody>
        </table>
        <div style={styles.noteStyle}>
          <strong style={styles.strongNoteStyle}>How it works:</strong>{' '}
          <ul style={{ margin: '8px 0 0 16px', padding: 0 }}>
            <li>Numbers, parentheses, and clear work locally (no API call)</li>
            <li>Pressing <code style={styles.codeSmStyle}>=</code> triggers an API call to validate <code style={styles.codeSmStyle}>calc:basic</code> permission</li>
            <li>If expression contains scientific functions, validates <code style={styles.codeSmStyle}>calc:scientific</code> permission</li>
            <li>Results display after successful permission validation</li>
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
          The calculator detects which permission to check based on expression content:
        </p>
        <CodeBlock title="Permission detection in CalculatorClient.tsx" code={`const hasScientific = /\\b(sin|cos|tan|log|ln|sqrt|asin|acos|atan|log2|fact|abs|inv_x|exp10|exp)\\b/.test(state.expr);
const action = hasScientific ? 'calc-scientific' : 'calc-basic';`} />
        <table style={styles.tableStyle}>
          <thead>
            <tr>
              <th style={styles.thStyle}>Action</th>
              <th style={styles.thStyle}>Required Permission</th>
              <th style={styles.thStyle}>Triggers On</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.tdStyle}><code style={styles.codeSmStyle}>calc-basic</code></td>
              <td style={styles.tdStyle}><code style={styles.codeSmStyle}>calc:basic</code></td>
              <td style={styles.tdStyle}>+, −, ×, ÷, %, ^, parentheses, numbers</td>
            </tr>
            <tr>
              <td style={styles.tdStyle}><code style={styles.codeSmStyle}>calc-scientific</code></td>
              <td style={styles.tdStyle}><code style={styles.codeSmStyle}>calc:scientific</code></td>
              <td style={styles.tdStyle}>sin, cos, tan, log, ln, sqrt, asin, acos, atan, log2, n!, |x|, 1/x, 10ˣ, eˣ</td>
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
          <li>Evaluates the expression locally (parser in <code style={styles.codeSmStyle}>evaluate()</code>)</li>
          <li>Gets a fresh access token via <code style={styles.codeSmStyle}>getFreshAccessToken()</code></li>
          <li>Calls <code style={styles.codeSmStyle}>POST /api/protected</code> with the result</li>
        </ol>
        <CodeBlock title="handleCalculate in CalculatorClient.tsx" code={`const handleCalculate = useCallback(async (result: number) => {
  const freshToken = await getFreshAccessToken();
  const hasScientific = /\\b(sin|cos|tan|log|ln|...)\\b/.test(state.expr);
  const action = hasScientific ? 'calc-scientific' : 'calc-basic';

  const response = await fetch('/api/protected', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: freshToken,
      id: userData.id,
      action,
      payload: { expression: state.expr, result },
    }),
  });

  const res = await response.json();
  if (res.ok) {
    console.log(\`✅ Calculation succeeded: \${res.data.message}\`);
  } else {
    alert(\`Permission denied: \${res.message}\`);
  }
}, [userData, state.expr]);`} />
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
          Both handlers are simple — they receive the expression and result, return success:
        </p>
        <CodeBlock title="calc-actions/basic.ts" code={`'use server';

export async function getBasicCalc() {
  return {
    requiredPerm: 'calc:basic',
    handler: async ({ payload }) => {
      const { expression, result } = payload as { expression: string; result: number };
      return {
        success: true,
        message: \`\${expression} = \${result}\`,
        data: { expression, result }
      };
    },
  };
}`} />
        <p style={styles.textStyle}>
          The real security is the <strong>Protected Actions API</strong> — it validates the token,
          checks org membership, and verifies the permission before calling the handler.
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
          The calculator below requires membership in the <strong>Mathinators</strong> organization
          with the <code style={styles.codeSmStyle}>calc:basic</code> permission. If you're not a member,
          it won't appear.
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
