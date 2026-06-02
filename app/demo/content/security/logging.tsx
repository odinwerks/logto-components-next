'use client';

import { useDocStyles } from "../../components/useDocStyles";
import CodeBlock from "../../components/SyntaxBlock";
import { useThemeMode } from "../../../logto-kit/components/providers/preferences";
import { slugify } from "../../components/SectionComponents";

export default function SecurityLoggingDoc() {
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
      <h2 id={slugify("Logging and Observability Frameworks")} style={{ ...h2Style, marginTop: 0 }}>Logging and Observability Frameworks</h2>
      <p style={styles.textStyle}>
        The application implements a dual-mode logging system supporting both unstructured console logs and structured observability events. This allows developers to use familiar logging syntax in development while generating structured JSON telemetry for log management systems in production.
      </p>

      <h2 id={slugify("Unstructured Logging API")} style={h2Style}>Unstructured Logging API</h2>
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

      <h2 id={slugify("Structured Observability Events")} style={h2Style}>Structured Observability Events</h2>
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

      <h2 id={slugify("Logger Backend Routing")} style={h2Style}>Logger Backend Routing</h2>
      <p style={styles.textStyle}>
        The logging system determines how messages are routed using the <code style={styles.codeStyle}>LOG_BACKEND</code> environment variable. There are three configuration modes available:
      </p>
      <table style={customTableStyle}>
        <thead>
          <tr>
            <th style={{ ...customThStyle, width: '30%' }}>LOG_BACKEND Mode</th>
            <th style={{ ...customThStyle, width: '70%' }}>Routing Behavior</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={customTdPropStyle}>console</td>
            <td style={customTdStyle}>Writes to standard console output only (console.log, console.warn, etc.). Best for raw terminal readability during local development.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>pino</td>
            <td style={customTdStyle}>Writes Pino-structured JSON objects to standard output only. Excludes standard console logs. Preferred for production systems.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>both</td>
            <td style={customTdStyle}>Writes to standard console output AND forwards structured JSON messages to Pino. This is the default configuration.</td>
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

      <h2 id={slugify("Production Webhook Transport")} style={h2Style}>Production Webhook Transport</h2>
      <p style={styles.textStyle}>
        In production environments, the framework supports forwarding structured JSON logs to an external telemetry aggregator or chat platform (e.g., Slack, Discord, Datadog) via the highly sensitive <code style={styles.codeStyle}>LOGGING_WEBHOOK_URL</code> environment variable.
      </p>
      <p style={styles.textStyle}>
        When <code style={styles.codeStyle}>LOGGING_WEBHOOK_URL</code> is defined and the application is running in production, the logging system automatically sets up a Pino multi-stream. Logs are written to <code style={styles.codeStyle}>stdout</code> for container log captures and concurrently batched and sent via an asynchronous HTTP POST webhook request.
      </p>
      <CodeBlock
        title="Telemetry Webhook Transport Behavior"
        code={`// Production-only webhook destination mapping
if (webhookUrl && !isDev) {
  const webhookStream = createWebhookDestination(webhookUrl);
  logger = pino(
    options,
    pino.multistream([
      { stream: process.stdout, level },
      { stream: webhookStream, level },
    ])
  );
}`}
      />
      <p style={styles.textStyle}>
        <strong>Key Characteristics of the Webhook Transport:</strong>
      </p>
      <ul style={{ ...styles.textStyle, paddingLeft: '20px', listStyleType: 'disc' }}>
        <li style={{ paddingBottom: '8px' }}>
          <strong>Asynchronous Batching:</strong> To prevent blocking request-handling threads, log writes are collected on the next event-loop tick and dispatched asynchronously using the <code style={styles.codeStyle}>setImmediate</code> API.
        </li>
        <li style={{ paddingBottom: '8px' }}>
          <strong>JSON Payload Structure:</strong> Logs are posted as a JSON array of structured log entries, retaining all typed metadata, event names, and context details:
          <CodeBlock
            title="Example Webhook POST Payload"
            code={`[
  {
    "level": "info",
    "time": "2026-06-02T03:25:54.000Z",
    "event": "AUTH_SIGN_IN",
    "msg": "User signed in",
    "userId": "usr_abc123",
    "method": "passkey"
  }
]`}
          />
        </li>
        <li style={{ paddingBottom: '8px' }}>
          <strong>Fail-Safe Design:</strong> If the remote webhook endpoint is unreachable, timed out (5-second hard limit via <code style={styles.codeStyle}>AbortSignal.timeout</code>), or responds with an error, the logger catches the exception gracefully, prints a warning to <code style={styles.codeStyle}>stdout</code>, and continues execution to avoid crashing the server.
        </li>
      </ul>
    </div>
  );
}
