/**
 * Higher-order function wrapper for API route handlers.
 *
 * Wraps a Next.js API route handler to:
 * - Generate a unique request ID per request
 * - Set `requestContext` so `logEvent`/`audit` auto-merge `requestId`
 * - Log the incoming request (method, path, request ID)
 * - Log the response status and duration
 * - Catch and log any errors
 *
 * The second handler argument is `logEvent` (already requestId-bound via
 * `getRequestBindings`), so callers can either use it or call the module-level
 * `logEvent` — both carry the same `requestId`.
 *
 * Usage:
 *   import { withLogger } from './with-logger';
 *
 *   export const POST = withLogger(async (request, logger) => {
 *     logger.info(LOG_EVENTS.API_REQUEST, 'Processing request');
 *     return NextResponse.json({ ok: true });
 *   });
 */

import { NextRequest, NextResponse } from 'next/server';
import { type TypedLogger } from './logger';
import { logEvent } from '../logto-kit/logic/log';
import { LOG_EVENTS } from './log-events';
import { scrubLogString } from './scrub-log-string';
import { requestContext } from './request-context';

/**
 * Type for an API route handler function.
 * Receives the request and a child logger with the request ID bound.
 */
export type ApiHandler = (
  request: NextRequest,
  logger: TypedLogger
) => Promise<NextResponse>;

/**
 * Wraps an API route handler with structured logging and request context.
 *
 * @param handler - The API route handler to wrap
 * @returns A wrapped handler that logs request/response lifecycle
 */
export function withLogger(handler: ApiHandler) {
  return async function loggedHandler(request: NextRequest): Promise<NextResponse> {
    const requestId = crypto.randomUUID();
    const startTime = performance.now();
    const method = request.method;
    const path = request.nextUrl.pathname;

    // Create a child logger with the request ID bound (for callers that use
    // the injected logger argument). The module-level `logEvent` also picks
    // up the requestId via getRequestBindings() inside requestContext.run.
    const requestLogger = logEvent.child({
      requestId,
      method,
      path,
    });

    return requestContext.run({ requestId }, async () => {
      // Log incoming request
      requestLogger.info(LOG_EVENTS.API_REQUEST, `${method} ${path} started`, { method, path });

      try {
        // Call the original handler with the request and child logger
        const response = await handler(request, requestLogger);

        // Log response
        const duration = Math.round(performance.now() - startTime);
        requestLogger.info(LOG_EVENTS.API_REQUEST, `${method} ${path} completed`, {
          status: response.status,
          duration,
        });

        return response;
      } catch (error) {
        // NEXT_REDIRECT is a control-flow pseudo-error that Next.js uses to perform
        // server-side redirects (via redirect()). It is not a real error and should
        // not be logged as API_ERROR — doing so creates noise on every sign-in.
        const isNextRedirect =
          error instanceof Error &&
          (error.message === 'NEXT_REDIRECT' ||
            (error as { digest?: string }).digest?.startsWith('NEXT_REDIRECT'));

        if (!isNextRedirect) {
          const duration = Math.round(performance.now() - startTime);
          const message = error instanceof Error ? error.message : String(error);

          // Log error — scrub the message and omit the stack to prevent credential leaks
          requestLogger.error(LOG_EVENTS.API_ERROR, `${method} ${path} failed`, {
            error: scrubLogString(message),
            duration,
          });
        }

        // Re-throw so Next.js can handle it
        throw error;
      }
    });
  };
}
