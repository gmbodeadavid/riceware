import { NextResponse } from 'next/server';
import { BLOG_SESSION_COOKIE } from '@/lib/blog-admin-auth';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(BLOG_SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return response;
}
