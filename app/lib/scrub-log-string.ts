/**
 * Credential scrubber for log strings.
 *
 * This is a last-resort string-level scrub for values that bypass Pino's
 * path-based redaction (e.g., Error.message, Error.stack, raw API response
 * bodies passed as strings).
 *
 * It does NOT replace structured Pino redaction — use `redact.paths` as the
 * primary mechanism. This scrubber handles the console path and string-typed
 * error fields that Pino cannot redact by path.
 */

/**
 * Scrubs known credential patterns from a string value.
 * Used before logging Error.message, Error.stack, or raw API response bodies.
 */
export function scrubLogString(s: string): string {
  let result = s;

  // JWT tokens: eyJ...header.eyJ...payload.signature
  result = result.replace(
    /eyJ[A-Za-z0-9\-_]+\.eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]*/g,
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
 * Applies scrubLogString to any argument that is a string or Error.
 * Objects are passed through unchanged (Pino handles object redaction via paths).
 * Numbers, booleans, null, undefined are passed through unchanged.
 *
 * @param args - Array of unknown arguments (console-style variadic call)
 * @returns A new array with sensitive strings scrubbed
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
    return arg;
  });
}
