import { NextResponse } from 'next/server';
import { jsonHandler } from '@/lib/api-handler';
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  signSessionToken,
  timingSafeEqualStr,
} from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const POST = jsonHandler(async (req: Request) => {
  const { username, password } = await req.json();

  const u = process.env.AUTH_USERNAME;
  const p = process.env.AUTH_PASSWORD;
  const s = process.env.AUTH_SECRET;

  if (!u || !p || !s) {
    return NextResponse.json(
      { error: 'Auth belum dikonfigurasi (AUTH_USERNAME/AUTH_PASSWORD/AUTH_SECRET)' },
      { status: 500 },
    );
  }

  // Constant-time compare to avoid timing attacks
  const okUser = typeof username === 'string' && timingSafeEqualStr(username, u);
  const okPass = typeof password === 'string' && timingSafeEqualStr(password, p);
  if (!okUser || !okPass) {
    return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 });
  }

  const token = await signSessionToken(u, s);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
  return res;
});
