/**
 * Higher-order function wrapper for API route handlers.
 *
 * Wraps a Next.js API route handler to:
 * - Generate a unique request ID per request
 * - Log the incoming request (method, path, request ID)
 * - Log the response status and duration
 * - Catch and log any errors
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
import { createLogger, type TypedLogger } from './logger';
import { LOG_EVENTS } from './log-events';

/**
 * Type for an API route handler function.
 * Receives the request and a child logger with the request ID bound.
 */
export type ApiHandler = (
  request: NextRequest,
  logger: TypedLogger
) => Promise<NextResponse>;

/**
 * Wraps an API route handler with structured logging.
 *
 * @param handler - The API route handler to wrap
 * @returns A wrapped handler that logs request/response lifecycle
 */
export function withLogger(handler: ApiHandler) {
  return async function loggedHandler(request: NextRequest): Promise<NextResponse> {
    const requestId = crypto.randomUUID();
    const startTime = performance.now();

    // Create a child logger with the request ID bound
    const requestLogger = createLogger().child({
      requestId,
      method: request.method,
      path: request.nextUrl.pathname,
    });

    // Log incoming request
    requestLogger.info(LOG_EVENTS.API_REQUEST, `${request.method} ${request.nextUrl.pathname}`);

    try {
      // Call the original handler with the request and child logger
      const response = await handler(request, requestLogger);

      // Log response
      const duration = Math.round(performance.now() - startTime);
      requestLogger.info(LOG_EVENTS.API_REQUEST, `${request.method} ${request.nextUrl.pathname} completed`, {
        status: response.status,
        duration,
      });

      return response;
    } catch (error) {
      const duration = Math.round(performance.now() - startTime);
      const message = error instanceof Error ? error.message : String(error);

      // Log error
      requestLogger.error(LOG_EVENTS.API_ERROR, `${request.method} ${request.nextUrl.pathname} failed`, {
        error: message,
        duration,
      });

      // Re-throw so Next.js can handle it
      throw error;
    }
  };
}
