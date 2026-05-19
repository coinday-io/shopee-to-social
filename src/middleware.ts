import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/auth/logout'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  const secret = process.env.AUTH_SECRET;
  const user = process.env.AUTH_USERNAME;
  const pass = process.env.AUTH_PASSWORD;

  // If auth not configured (mis. local dev), allow all so the app keeps working.
  // In production set AUTH_USERNAME + AUTH_PASSWORD + AUTH_SECRET to enable gate.
  if (!secret || !user || !pass) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const verified = await verifySessionToken(token, secret);

  if (verified) {
    return NextResponse.next();
  }

  // Browser navigation → redirect to login with `from` param
  if (req.headers.get('accept')?.includes('text/html')) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?from=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  // API / fetch call → 401 JSON
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export const config = {
  // Run on every route except Next.js static assets and the favicon.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)).*)'],
};
