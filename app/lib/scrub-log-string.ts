/**
 * Credential scrubber for log strings and objects.
 *
 * This is a last-resort scrub for values that bypass Pino's path-based
 * redaction (e.g., Error.message, Error.stack, raw API response bodies passed
 * as strings, and plain objects emitted via the console log path).
 *
 * It does NOT replace structured Pino redaction — use `redact.paths` as the
 * primary mechanism. This module handles the console path and string-typed
 * error fields that Pino cannot redact by path.
 *
 * Exports:
 * - `scrubLogString` — regex-based scrub for credential patterns in strings
 * - `scrubArgs` — scrubs string/Error args and redacts plain-object args (for
 *   the console path where Node's util.inspect would otherwise print sensitive
 *   fields verbatim)
 * - `redactSensitive` — recursively redacts sensitive keys in serializable objects
 *   (also imported by logger.ts for the webhook transport path)
 * - `SENSITIVE_KEYS` — regex identifying sensitive key names (camelCase +
 *   snake_case OAuth/OIDC variants)
 */

// ============================================================================
// Sensitive Key Redaction (shared with logger.ts)
// ============================================================================

/**
 * Regex identifying sensitive object key names. Matches both camelCase and
 * snake_case OAuth/OIDC variants. Case-insensitive (`/i`).
 *
 * Used by `redactSensitive` for object-level redaction. Kept here (the scrub
 * leaf module) so both `scrubArgs` and `logger.ts` share one definition
 * without creating a circular import.
 */
export const SENSITIVE_KEYS =
  /^(token|password|secret|key|authorization|api[_-]?key|access[_-]?token|refresh[_-]?token|id[_-]?token|m2m[_-]?token|client[_-]?secret|code|state|cred|credentials?|token[_-]?value|verification(?:[_-]?record)?[_-]?id|stack|error)$/i;

const SENSITIVE_NORMALIZED_KEYS = new Set([
  'token',
  'password',
  'secret',
  'key',
  'authorization',
  'apikey',
  'accesstoken',
  'refreshtoken',
  'idtoken',
  'm2mtoken',
  'clientsecret',
  'code',
  'state',
  'cred',
  'credential',
  'credentials',
  'tokenvalue',
  'verificationid',
  'verificationrecordid',
  'stack',
  'error',
]);

function normalizeKey(key: string): string {
  return key.replace(/[^A-Za-z0-9]/g, '').toLowerCase();
}

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS.test(key) || SENSITIVE_NORMALIZED_KEYS.has(normalizeKey(key));
}

function truncateCodePoints(value: string, maximum: number): string {
  let codePoints = 0;
  let end = 0;
  for (const codePoint of value) {
    if (codePoints === maximum) return value.slice(0, end);
    end += codePoint.length;
    codePoints++;
  }
  return value;
}

/**
 * Recursively redacts sensitive keys in an object before serialization.
 * Returns a new object with matching keys replaced by '[REDACTED]'; the input
 * is never mutated.
 *
 * Traverses own enumerable properties on plain objects and class instances,
 * and redacts the result of custom `toJSON` methods. This mirrors the paths a
 * JSON logger can serialize while preventing class/custom-serialization
 * bypasses. Built-ins with no enumerable state (for example Date, Map, Set,
 * and RegExp) remain intact.
 *
 * @param obj - value to redact (objects, arrays, primitives all accepted)
 * @returns a redacted serialization-safe copy; primitives and built-ins with
 *          no enumerable state pass through unchanged
 */
export function redactSensitive(obj: unknown): unknown {
  const seen = new WeakMap<object, unknown>();

  const visit = (value: unknown): unknown => {
    if (typeof value === 'string') return scrubLogString(value);
    if (value === null || value === undefined || typeof value !== 'object') return value;

    if (seen.has(value)) return seen.get(value);

    if (Array.isArray(value)) {
      const result: unknown[] = [];
      seen.set(value, result);
      for (const item of value) result.push(visit(item));
      return result;
    }

    let toJSON: unknown;
    try {
      toJSON = Reflect.get(value, 'toJSON');
    } catch {
      // A hostile getter must not make best-effort logging crash. Fall back to
      // own-enumerable traversal, which replaces throwing values below.
    }

    // Preserve an ordinary Date as a Date. An overridden Date serializer is
    // still treated as custom serialization and scrubbed below.
    if (value instanceof Date && toJSON === Date.prototype.toJSON) return value;

    if (typeof toJSON === 'function') {
      const placeholder: Record<string, unknown> = {};
      seen.set(value, placeholder);
      try {
        const serialized = Reflect.apply(toJSON, value, []);
        if (serialized !== value) {
          const redacted = visit(serialized);
          seen.set(value, redacted);
          return redacted;
        }
      } catch {
        // If custom serialization fails, redact own enumerable properties
        // rather than returning the original object unsanitized.
      }
      seen.delete(value);
    }

    const keys = Object.keys(value);
    if (keys.length === 0) return value;

    const proto = Object.getPrototypeOf(value);
    const result = Object.create(proto === null ? null : Object.prototype) as Record<string, unknown>;
    seen.set(value, result);
    for (const key of keys) {
      let child: unknown;
      try {
        child = Reflect.get(value, key);
      } catch {
        child = '[UNSERIALIZABLE]';
      }
      Object.defineProperty(result, key, {
        configurable: true,
        enumerable: true,
        writable: true,
        value: isSensitiveKey(key)
          ? '[REDACTED]'
          : normalizeKey(key) === 'msg' && typeof child === 'string'
            ? scrubLogString(child)
            : visit(child),
      });
    }
    return result;
  };

  return visit(obj);
}

// ============================================================================
// String Scrubbing
// ============================================================================

/**
 * Scrubs known credential patterns from a string value.
 * Used before logging Error.message, Error.stack, or raw API response bodies.
 */
export function scrubLogString(s: string): string {
  // Guard against polynomial ReDoS: if the string is excessively long, truncate
  // it before running regex. This is a log scrubber — an input >10k chars is
  // almost certainly not a real log line that needs regex-level scrubbing.
  s = truncateCodePoints(s, 10000);
  let result = s;

  // JWT tokens: eyJ...header.eyJ...payload.signature
  // Bounded quantifiers {1,200} prevent polynomial backtracking — a single
  // JWT base64url segment is at most ~200 chars (JWT max 4KB per RFC 7519).
  result = result.replace(
    /eyJ[A-Za-z0-9_-]{1,8192}\.eyJ[A-Za-z0-9_-]{1,8192}(?:\.[A-Za-z0-9_-]{1,8192})?/g,
    '[JWT_REDACTED]',
  );

  // Bearer token in Authorization header values or inline strings. RFC 6750
  // also permits `~`, `+`, `/`, and `%`; a `%` counts as a value character only
  // when it starts a valid URL-encoded octet (`%` + 2 hex digits) so printf
  // placeholders such as `Bearer %s` are not mistaken for credentials. A
  // boundary is required to avoid scrubbing a valid-looking prefix while
  // leaving a suffix visible.
  result = result.replace(
    /Bearer[ \t]+(?:[A-Za-z0-9._~+\/-]|%[0-9A-Fa-f]{2})+=*(?=$|[^%A-Za-z0-9._~+\/-=])/gi,
    'Bearer [REDACTED]',
  );

  // Authorization header line (matches to end of line or end of string)
  result = result.replace(
    /Authorization:\s*[^\n\r]{8,}/gi,
    'Authorization: [REDACTED]',
  );

  // access_token=<value> (URL param or JSON field)
  result = result.replace(
    /access[_-]?token["'\s]*[:=]["'\s]*(?:[A-Za-z0-9._~+\/-]|%[0-9A-Fa-f]{2})+={0,}(?![A-Za-z0-9._~+\/-=%])/gi,
    'access_token=[REDACTED]',
  );

  // refresh_token=<value>
  result = result.replace(
    /refresh[_-]?token["'\s]*[:=]["'\s]*(?:[A-Za-z0-9._~+\/-]|%[0-9A-Fa-f]{2})+={0,}(?![A-Za-z0-9._~+\/-=%])/gi,
    'refresh_token=[REDACTED]',
  );

  // id_token=<value>
  result = result.replace(
    /id[_-]?token["'\s]*[:=]["'\s]*(?:[A-Za-z0-9._~+\/-]|%[0-9A-Fa-f]{2})+={0,}(?![A-Za-z0-9._~+\/-=%])/gi,
    'id_token=[REDACTED]',
  );

  // code=<value> (OAuth authorization code — only redact if reasonably long to
  // avoid matching e.g. "code=200"; a percent-encoded octet counts as one
  // repetition but represents three characters, so mixed values are accepted
  // from 7 repetitions to keep the ~8 real-character floor)
  result = result.replace(
    /\bcode=((?:[A-Za-z0-9._~+\/-]{8,}|(?:[A-Za-z0-9._~+\/-]|%[0-9A-Fa-f]{2}){7,})={0,})(?![A-Za-z0-9._~+\/-=%])/g,
    'code=[REDACTED]',
  );

  // client_secret=<value> (OAuth form-encoded bodies or JSON)
  result = result.replace(
    /client[_-]?secret["'\s]*[:=]["'\s]*(?:[A-Za-z0-9._~+\/-]|%[0-9A-Fa-f]{2})+={0,}(?![A-Za-z0-9._~+\/-=%])/gi,
    'client_secret=[REDACTED]',
  );

  // password=<value> (form-encoded or JSON — minimum 4 chars to avoid "password=OK")
  result = result.replace(
    /password["'\s]*[:=]["'\s]*[^\s&"',;]{4,}/gi,
    'password=[REDACTED]',
  );

  // Prevent attacker-controlled values from creating forged adjacent records
  // after console output or webhook JSON is decoded by a receiver.
  result = result.replace(/(?:\r\n|[\n\r\u0085\u2028\u2029])/gu, ' ');

  // Keep every log message bounded without splitting UTF-16 surrogate pairs.
  return truncateCodePoints(result, 200);
}

/**
 * Scrubs console-style variadic arguments before they reach the console path.
 *
 * - `string` args → `scrubLogString` (regex scrub of credential patterns)
 * - `Error` args → a new Error with scrubbed message/stack (original untouched)
 * - object args → `redactSensitive` (sensitive keys replaced with
 *   '[REDACTED]'); traversable objects are copied so the original is never
 *   mutated and serialization cannot print unredacted credential fields
 * - arrays are traversed; numbers, booleans, null, undefined, and built-ins
 *   without enumerable serialization state pass through unchanged
 *
 * Without the object branch, the console path (active when
 * `LOG_BACKEND=both`/`console`, which is the default) would emit sensitive
 * object fields verbatim because `console.log` serializes objects via
 * `util.inspect`, bypassing Pino's path-based redaction (BUG-008).
 *
 * @param args - Array of unknown arguments (console-style variadic call)
 * @returns A new array with sensitive strings and objects scrubbed
 */
export function scrubArgs(args: unknown[]): unknown[] {
  return args.map((arg) => {
    if (typeof arg === 'string') {
      return scrubLogString(arg);
    }
    if (arg instanceof Error) {
      const scrubbed = new Error(scrubLogString(arg.message));
      scrubbed.name = arg.name;
      // Scrub the stack trace too if present
      if (arg.stack) {
        scrubbed.stack = scrubLogString(arg.stack);
      }
      return scrubbed;
    }
    // Objects are redacted recursively across own enumerable and custom
    // serialization paths; inert built-ins retain their runtime semantics.
    if (arg !== null && typeof arg === 'object') {
      return redactSensitive(arg);
    }
    return arg;
  });
}
