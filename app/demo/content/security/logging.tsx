'use client';

import { useDocStyles } from "../../components/useDocStyles";
import CodeBlock from "../../components/SyntaxBlock";
import { SectionWrap } from "../../components/SectionComponents";

export default function SecurityLoggingDoc() {
  const styles = useDocStyles();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <SectionWrap label="Logging and Observability Frameworks">
        <p style={styles.textStyle}>
          The application implements a dual-mode logging system supporting both unstructured console logs and structured observability events. This allows developers to use familiar logging syntax in development while generating structured JSON telemetry for log management systems in production.
        </p>
      </SectionWrap>

      <SectionWrap label="Unstructured Logging API">
        <p style={styles.textStyle}>
          For simple, ad-hoc, or development logging, the framework exports classic console-style methods. These methods accept arbitrary arguments and are safe to call across all server-side environments (server actions, API routes, middleware, and backend utilities).
        </p>
        <CodeBlock
          title="Unstructured Log Usage"
          code={`import { log, warn, error, debug } from 'app/logto-kit/logic/log';

// Simple logging
log('Processing user update');

// Warning with metadata
warn('[upload] Upload speed throttled', { rateLimit: true });

// Error catching
try {
  await executeDatabaseQuery();
} catch (err) {
  error('Database query failed', err);
}`}
        />
        <p style={styles.textStyle}>
          In production, these unstructured logs are automatically intercepted. The arguments are parsed, the first string is extracted as the message, and any remaining arguments are serialized into a single detail string. This formatted structure is then forwarded to the structured Pino backend as a generic log event.
        </p>
      </SectionWrap>

      <SectionWrap label="Structured Observability Events">
        <p style={styles.textStyle}>
          For high-integrity production audit trails and observability, developers use the structured <code style={styles.codeStyle}>logEvent</code> API. Every structured log requires an explicit, typed event name and supports a flat context object for telemetry filtering.
        </p>
        <CodeBlock
          title="Structured Observability Log Usage"
          code={`import { logEvent } from 'app/logto-kit/logic/log';
import { LOG_EVENTS } from 'app/lib/log-events';

// Log a structured information event
logEvent.info(LOG_EVENTS.AUTH_SIGN_IN, 'User signed in', { 
  userId: 'usr_abc123',
  method: 'passkey'
});

// Log a structured warning event
logEvent.warn(LOG_EVENTS.API_THROTTLED, 'API rate limit triggered', {
  ipAddress: '192.0.2.1',
  limit: 100
});

// Log a structured error event
logEvent.error(LOG_EVENTS.API_ERROR, 'M2M token request failed', {
  endpoint: 'https://default.logto.app/api',
  statusCode: 500
});`}
        />
        <p style={styles.textStyle}>
          The typed event parameter restricts developers to defined constants in the LogEvent schema, ensuring consistency across metrics dashboards and log search patterns.
        </p>
      </SectionWrap>

      <SectionWrap label="Logger Backend Routing">
        <p style={styles.textStyle}>
          The logging system determines how messages are routed using the <code style={styles.codeStyle}>LOG_BACKEND</code> environment variable. There are three configuration modes available:
        </p>
        <table style={styles.tableStyle}>
          <thead>
            <tr>
              <th style={{ ...styles.thStyle, width: '30%' }}>LOG_BACKEND Mode</th>
              <th style={{ ...styles.thStyle, width: '70%' }}>Routing Behavior</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.tdPropStyle}>console</td>
              <td style={styles.tdStyle}>Writes to standard console output only (console.log, console.warn, etc.). Best for raw terminal readability during local development.</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>pino</td>
              <td style={styles.tdStyle}>Writes Pino-structured JSON objects to standard output only. Excludes standard console logs. Preferred for production systems.</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>both</td>
              <td style={styles.tdStyle}>Writes to standard console output AND forwards structured JSON messages to Pino. This is the default configuration.</td>
            </tr>
          </tbody>
        </table>
        <p style={styles.textStyle}>
          Pino logs are lazy-loaded to prevent instantiation overhead. When the backend is configured for Pino or both, the framework instantiates the Pino logger using an isolated factory method:
        </p>
        <CodeBlock
          title="Pino Backend Routing Logic"
          code={`type LogBackend = 'console' | 'pino' | 'both';

function getBackend(): LogBackend {
  const val = process.env.LOG_BACKEND?.toLowerCase();
  if (val === 'console' || val === 'pino') return val;
  return 'both';
}

const backend = getBackend();
const useConsole = backend === 'console' || backend === 'both';
const usePino = backend === 'pino' || backend === 'both';

let _pinoLogger: TypedLogger | null = null;

function getPinoLogger(): TypedLogger {
  if (!_pinoLogger) {
    _pinoLogger = createLogger(); // Instantiates the Pino engine
  }
  return _pinoLogger;
}`}
        />
        <p style={styles.textStyle}>
          When writing messages in "both" mode, unstructured calls are routed to console, formatted into structured models, and subsequently fed into Pino, whereas structured <code style={styles.codeStyle}>logEvent</code> calls print formatted prefixes to the console and pass raw objects directly to Pino.
        </p>
      </SectionWrap>
    </div>
  );
}
