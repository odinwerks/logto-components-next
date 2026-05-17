'use client';

import CodeBlock from '../utils/CodeBlock';
import { SectionContainer, Section } from '../utils/Section';
import { useDocStyles } from '../utils/useDocStyles';
import { SectionHeader, SectionWrap } from '../utils/SectionComponents';

// ═══════════════════════════════════════════════════════════════════════════════
// Page 1: Overview
// ═══════════════════════════════════════════════════════════════════════════════

function OverviewSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Overview">
      <p style={styles.textStyle}>
        Configurable logging system with two APIs and three backends. Routes log output
        to console, Pino structured JSON, or both based on the <code style={styles.codeStyle}>LOG_BACKEND</code> env var.
      </p>
      <CodeBlock title="LOG_BACKEND variants" code={`LOG_BACKEND=console  # console.* only (default)
LOG_BACKEND=pino     # Pino structured JSON only
LOG_BACKEND=both     # both console + Pino`} />
      <table style={styles.tableStyle}>
        <thead>
          <tr>
            <th style={styles.thStyle}>API</th>
            <th style={styles.thStyle}>Style</th>
            <th style={styles.thStyle}>Use case</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tdPropStyle}>log / warn / error / debug</td>
            <td style={styles.tdStyle}>Unstructured (console-style)</td>
            <td style={styles.tdStyle}>Quick debugging, ad-hoc messages</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>logEvent.info / .warn / .error / .debug</td>
            <td style={styles.tdStyle}>Structured (Pino-style, event-driven)</td>
            <td style={styles.tdStyle}>Production observability, typed events</td>
          </tr>
        </tbody>
      </table>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Server-side only:</strong>{' '}
        This module uses Pino, which is a server-only library. Do not import it from client
        components. The unstructured API (log/warn/error/debug) is safe on both sides.
      </div>
    </SectionWrap>
  );
}

function BackendSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Backend routing">
      <CodeBlock title="Backend selection logic" code={`type LogBackend = 'console' | 'pino' | 'both';

function getBackend(): LogBackend {
  const val = process.env.LOG_BACKEND?.toLowerCase();
  if (val === 'console' || val === 'pino') return val;
  return 'both'; // default when unset
}

const backend = getBackend();
const useConsole = backend === 'console' || backend === 'both';
const usePino = backend === 'pino' || backend === 'both';`} />
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Default behavior:</strong>{' '}
        When <code style={styles.codeSmStyle}>LOG_BACKEND</code> is unset, defaults to "both"  - 
        writes to console AND Pino. No special config needed to start receiving structured logs.
      </div>
    </SectionWrap>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page 2: Unstructured API
// ═══════════════════════════════════════════════════════════════════════════════

function UnstructuredSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Unstructured API (console-style)">
      <p style={styles.textStyle}>
        Simple console-style functions for quick logging. When Pino mode is active, arguments
        are formatted into {`{ msg, detail }`} and forwarded as structured entries.
      </p>
      <CodeBlock title="Usage" code={`import { log, warn, error, debug } from './logto-kit/logic/log';

// Standard console-style variadic args
log('Server started on port', port);
warn('[upload] HTTP 429: rate limited');
error('Failed to fetch user data:', err);
debug('Token payload:', decoded);

// In "both" mode, these also appear as Pino structured entries
// with event type LOG_EVENTS.GENERIC_LOG`} />
      <CodeBlock title="Internal message formatting" code={`function formatMessage(args: unknown[]): { msg: string; detail?: string } {
  if (args.length === 0) return { msg: '' };
  if (args.length === 1) {
    return { msg: typeof args[0] === 'string' ? args[0] : String(args[0]) };
  }
  const [first, ...rest] = args;
  const prefix = typeof first === 'string' ? first : String(first);
  const detail = stringifyArgs(rest);
  return { msg: prefix, detail };
}

function stringifyArgs(args: unknown[]): string {
  return args.map((a) => {
    if (a instanceof Error) return a.message;
    if (typeof a === 'string') return a;
    try { return JSON.stringify(a); } catch { return String(a); }
  }).join(' ');
}`} />
    </SectionWrap>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page 3: Structured API
// ═══════════════════════════════════════════════════════════════════════════════

function StructuredSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Structured API (Pino-style)">
      <p style={styles.textStyle}>
        Event-driven logging with typed event names and structured context objects.
        Use this for production observability - every log entry has a typed event, a message,
        and an optional context object with any metadata.
      </p>
      <CodeBlock title="logEvent" code={`import { logEvent } from './logto-kit/logic/log';
import { LOG_EVENTS } from '../../lib/log-events';

// Structured event logging - typed event + message + context
logEvent.info(LOG_EVENTS.AUTH_SIGN_IN, 'User signed in', { userId: 'user_123' });
logEvent.warn(LOG_EVENTS.API_RATE_LIMIT, 'Rate limit approaching', { threshold: 0.9 });
logEvent.error(LOG_EVENTS.API_ERROR, 'Request failed', { statusCode: 500, path: '/api/data' });
logEvent.debug(LOG_EVENTS.GENERIC_LOG, 'Token decoded', { sub: 'user_123' });`} />
      <CodeBlock title="TypedLogger interface" code={`export const logEvent: TypedLogger = {
  info(event: LogEvent, msg: string, context: Record<string, unknown> = {}): void;
  warn(event: LogEvent, msg: string, context: Record<string, unknown> = {}): void;
  error(event: LogEvent, msg: string, context: Record<string, unknown> = {}): void;
  debug(event: LogEvent, msg: string, context: Record<string, unknown> = {}): void;
  child(bindings: Record<string, unknown>): TypedLogger;
  raw: PinoLogger;
};`} />
      <p style={styles.textStyle}>
        In "console" mode, writes structured format to console:
        <code style={styles.codeStyle}>[EVENT_NAME] message {'{context}'}</code>.
        In "pino" mode, writes through Pino as structured JSON.
        In "both" mode, writes through both.
      </p>
    </SectionWrap>
  );
}

function ChildSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Child loggers">
      <p style={styles.textStyle}>
        Create scoped loggers with pre-bound context using <code style={styles.codeStyle}>logEvent.child()</code>.
        Useful for service-specific logging where you always want certain fields.
      </p>
      <CodeBlock title="Child logger pattern" code={`const uploadLog = logEvent.child({ service: 'avatar-upload', backend: 's3' });
uploadLog.info(LOG_EVENTS.UPLOAD_START, 'Uploading file', { size: 1048576 });
uploadLog.error(LOG_EVENTS.UPLOAD_FAILED, 'S3 rejected', { statusCode: 403 });
// Every log entry from uploadLog automatically includes { service, backend }`} />
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Under the hood:</strong>{' '}
        <code style={styles.codeSmStyle}>child()</code> creates a Pino child logger and wraps it
        with the same event-based API. Console mode merges bindings into each call's context.
      </div>
    </SectionWrap>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page 4: Integration
// ═══════════════════════════════════════════════════════════════════════════════

function IntegrationSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Integration guide">
      <p style={styles.textStyle}>
        The logger is used throughout the kit's server actions. Here's how it integrates
        with the error handling system:
      </p>
      <CodeBlock title="Full integration example" code={`import { log, warn, error } from '../logic/log';
import { throwOnApiError } from '../logic/errors';

export async function updateSomeResource(data: unknown): Promise<ActionResult> {
  return safeAction(async () => {
    log('Updating resource with data:', data);
    const res = await makeRequest('/api/resource', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    // throwOnApiError logs the full upstream error server-side
    await throwOnApiError(res, 'UPDATE_FAILED', 'resource-update');
    log('Resource updated successfully');
  });
}`} />
      <CodeBlock title=".env config" code={`# Minimal - console only (no Pino dependency)
LOG_BACKEND=console

# Structured JSON via Pino (good for log aggregation)
LOG_BACKEND=pino

# Both console + Pino (default when unset)
LOG_BACKEND=both

# Debug mode enables verbose server logging
DEBUG=true`} />
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Note:</strong>{' '}
        The <code style={styles.codeStyle}>DEBUG</code> env var is separate from{' '}
        <code style={styles.codeStyle}>LOG_BACKEND</code>. <code style={styles.codeStyle}>DEBUG=true</code>{' '}
        enables additional verbose logging in specific server actions, while{' '}
        <code style={styles.codeStyle}>LOG_BACKEND</code> controls where logs are routed.
      </div>
    </SectionWrap>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export default function LoggingDoc() {
  const styles = useDocStyles();
  return (
    <SectionContainer>
      {/* Page 1: Overview */}
      <Section id={1}>
        <div style={{ ...styles.twoColLayoutStyle, minHeight: '100%', padding: '16px' }}>
          <div style={styles.colLeftStyle}>
            <OverviewSection />
          </div>
          <div style={styles.colLeftStyle}>
            <BackendSection />
          </div>
        </div>
      </Section>

      {/* Page 2: Unstructured API */}
      <Section id={2}>
        <div style={{ ...styles.twoColLayoutStyle, minHeight: '100%', padding: '16px' }}>
          <div style={{ ...styles.colLeftStyle, gridColumn: '1 / -1' }}>
            <UnstructuredSection />
          </div>
        </div>
      </Section>

      {/* Page 3: Structured API + Child loggers */}
      <Section id={3}>
        <div style={{ ...styles.twoColLayoutStyle, minHeight: '100%', padding: '16px' }}>
          <div style={styles.colLeftStyle}>
            <StructuredSection />
          </div>
          <div style={styles.colLeftStyle}>
            <ChildSection />
          </div>
        </div>
      </Section>

      {/* Page 4: Integration */}
      <Section id={4}>
        <div style={{ ...styles.twoColLayoutStyle, minHeight: '100%', padding: '16px' }}>
          <div style={{ ...styles.colLeftStyle, gridColumn: '1 / -1' }}>
            <IntegrationSection />
          </div>
        </div>
      </Section>
    </SectionContainer>
  );
}
