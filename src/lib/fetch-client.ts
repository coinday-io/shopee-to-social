/**
 * Safe fetch wrapper that never crashes on empty/non-JSON responses.
 *
 * Returns parsed JSON on 2xx, or throws an Error with a useful message
 * built from status + body (whatever shape the server returned).
 */
export async function fetchJson<T = unknown>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(input, init);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Network error';
    throw new Error(`Network error: ${msg}`);
  }

  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      // Non-JSON response; keep raw text in body for error reporting
      body = { _raw: text };
    }
  }

  if (!res.ok) {
    const message =
      (body && typeof body === 'object' && 'error' in body && typeof (body as Record<string, unknown>).error === 'string'
        ? ((body as Record<string, unknown>).error as string)
        : null) ||
      (body && typeof body === 'object' && '_raw' in body
        ? `Server returned ${res.status} ${res.statusText}: ${((body as Record<string, unknown>)._raw as string).slice(0, 200)}`
        : null) ||
      (text === ''
        ? `Server returned ${res.status} ${res.statusText} (empty body). Cek log Vercel — function mungkin timeout atau crash.`
        : `Server returned ${res.status} ${res.statusText}`);
    throw new Error(message);
  }

  if (body === null) {
    throw new Error('Server kirim response kosong (200 OK tapi body kosong).');
  }
  return body as T;
}
