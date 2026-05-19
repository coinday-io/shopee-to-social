/**
 * Tiny HMAC-signed session token.
 *
 * Token format: `<username>.<base64url(HMAC-SHA256(username, secret))>`
 *
 * Uses Web Crypto (SubtleCrypto) so the same code works in the Edge runtime
 * used by Next.js middleware AND the Node runtime used by API routes.
 */

const encoder = new TextEncoder();

function base64UrlEncode(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(s: string): ArrayBuffer {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

async function getKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export async function signSessionToken(username: string, secret: string): Promise<string> {
  const key = await getKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(username));
  return `${username}.${base64UrlEncode(sig)}`;
}

export async function verifySessionToken(
  token: string | undefined | null,
  secret: string,
): Promise<string | null> {
  if (!token) return null;
  const dot = token.lastIndexOf('.');
  if (dot < 1) return null;
  const username = token.slice(0, dot);
  const sigB64 = token.slice(dot + 1);
  let sig: ArrayBuffer;
  try {
    sig = base64UrlDecode(sigB64);
  } catch {
    return null;
  }
  const key = await getKey(secret);
  const ok = await crypto.subtle.verify('HMAC', key, sig, encoder.encode(username));
  return ok ? username : null;
}

/** Constant-time string equality. */
export function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export const SESSION_COOKIE = 'session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
