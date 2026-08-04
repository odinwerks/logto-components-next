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
 * - `redactSensitive` — recursively redacts sensitive keys in plain objects
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
  /^(token|password|secret|key|authorization|apiKey|api_key|accessToken|refreshToken|idToken|m2mToken|access_token|refresh_token|id_token|client_secret|code|state)$/i;

/**
 * Recursively redacts sensitive keys in an object before serialization.
 * Returns a new object with matching keys replaced by '[REDACTED]'; the input
 * is never mutated.
 *
 * Only recurses into plain objects (prototype is `Object.prototype` or `null`)
 * and arrays. Exotic objects (Date, Map, Set, RegExp, class instances, etc.)
 * are returned as-is so their runtime semantics are preserved — `Object.entries`
 * would otherwise mangle them (e.g. a Date has no own enumerable props and
 * would collapse to `{}`).
 *
 * @param obj - value to redact (objects, arrays, primitives all accepted)
 * @returns a redacted copy for plain objects/arrays; primitives and exotic
 *          objects pass through unchanged
 */
export function redactSensitive(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(redactSensitive);
  if (typeof obj === 'object') {
    const proto = Object.getPrototypeOf(obj);
    // Only recurse into plain objects; pass exotic objects through unchanged
    // to preserve their runtime state (Date, Map, Set, class instances, ...).
    if (proto !== null && proto !== Object.prototype) {
      return obj;
    }
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.test(key)) {
        result[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        result[key] = redactSensitive(value);
      } else {
        result[key] = value;
      }
    }
    return result;
  }
  return obj;
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
  if (s.length > 10000) {
    s = s.substring(0, 10000);
  }
  let result = s;

  // JWT tokens: eyJ...header.eyJ...payload.signature
  // Bounded quantifiers {1,200} prevent polynomial backtracking — a single
  // JWT base64url segment is at most ~200 chars (JWT max 4KB per RFC 7519).
  result = result.replace(
    /eyJ[A-Za-z0-9_-]{1,8192}\.eyJ[A-Za-z0-9_-]{1,8192}(?:\.[A-Za-z0-9_-]{1,8192})?/g,
    '[JWT_REDACTED]',
  );

  // Bearer token in Authorization header values or inline strings
  result = result.replace(
    /Bearer\s+[A-Za-z0-9\-_=.]+/gi,
    'Bearer [REDACTED]',
  );

  // Authorization header line (matches to end of line or end of string)
  result = result.replace(
    /Authorization:\s*[^\n\r]{8,}/gi,
    'Authorization: [REDACTED]',
  );

  // access_token=<value> (URL param or JSON field)
  result = result.replace(
    /access[_-]?token["'\s]*[:=]["'\s]*[A-Za-z0-9\-_=.%+]+/gi,
    'access_token=[REDACTED]',
  );

  // refresh_token=<value>
  result = result.replace(
    /refresh[_-]?token["'\s]*[:=]["'\s]*[A-Za-z0-9\-_=.%+]+/gi,
    'refresh_token=[REDACTED]',
  );

  // id_token=<value>
  result = result.replace(
    /id[_-]?token["'\s]*[:=]["'\s]*[A-Za-z0-9\-_=.%+]+/gi,
    'id_token=[REDACTED]',
  );

  // code=<value> (OAuth authorization code — only redact if reasonably long to avoid matching e.g. "code=200")
  result = result.replace(
    /\bcode=([A-Za-z0-9\-_=.%+]{8,})/g,
    'code=[REDACTED]',
  );

  // client_secret=<value> (OAuth form-encoded bodies or JSON)
  result = result.replace(
    /client[_-]?secret["'\s]*[:=]["'\s]*[A-Za-z0-9\-_=.%+]+/gi,
    'client_secret=[REDACTED]',
  );

  // password=<value> (form-encoded or JSON — minimum 4 chars to avoid "password=OK")
  result = result.replace(
    /password["'\s]*[:=]["'\s]*[^\s&"',;]{4,}/gi,
    'password=[REDACTED]',
  );

  return result;
}

/**
 * Scrubs console-style variadic arguments before they reach the console path.
 *
 * - `string` args → `scrubLogString` (regex scrub of credential patterns)
 * - `Error` args → a new Error with scrubbed message/stack (original untouched)
 * - plain-object args → `redactSensitive` (sensitive keys replaced with
 *   '[REDACTED]'); returns a NEW object so the original is never mutated and
 *   Node's `util.inspect` cannot print unredacted credential fields
 * - arrays, numbers, booleans, null, undefined, and exotic objects (Date, Map,
 *   Set, class instances, ...) pass through unchanged
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
    // Plain objects (and objects with null prototype) are redacted recursively.
    // redactSensitive passes exotic objects (Date, Map, Set, ...) through
    // unchanged, so they keep their runtime semantics.
    if (arg !== null && typeof arg === 'object') {
      return redactSensitive(arg);
    }
    return arg;
  });
}
