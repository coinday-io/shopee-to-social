import { NextResponse } from 'next/server';

/**
 * Wrap a route handler so any thrown error is caught and returned as JSON.
 * Without this, an uncaught throw makes Next.js respond with an empty body,
 * which breaks client-side `res.json()` parsing.
 */
export function jsonHandler<Args extends unknown[]>(
  fn: (...args: Args) => Promise<Response>,
) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown server error';
      console.error('[api]', message, err);
      return NextResponse.json(
        { error: message, code: 'INTERNAL_ERROR' },
        { status: 500 },
      );
    }
  };
}
