import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_SESSION_COOKIE } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function POST(_request: NextRequest) {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return response;
}
