import { NextResponse, type NextRequest } from 'next/server';
import {
  BLOG_SESSION_COOKIE,
  blogSessionCookieOptions,
  createBlogSessionToken,
  getBlogAdminPassword,
} from '@/lib/blog-admin-auth';

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const attemptsByClient = new Map<string, { count: number; resetAt: number }>();

function getClientKey(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || request.headers.get('x-real-ip') || 'local';
}

function consumeAttempt(clientKey: string): boolean {
  const now = Date.now();
  const record = attemptsByClient.get(clientKey);

  if (!record || now > record.resetAt) {
    attemptsByClient.set(clientKey, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  if (record.count >= MAX_ATTEMPTS) return false;
  record.count += 1;
  return true;
}

export async function POST(request: NextRequest) {
  const clientKey = getClientKey(request);

  if (!consumeAttempt(clientKey)) {
    return NextResponse.json(
      { error: 'Trop de tentatives, réessayez dans 15 minutes.' },
      { status: 429 },
    );
  }

  let password: unknown;
  try {
    ({ motDePasse: password } = await request.json());
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  }

  if (typeof password !== 'string' || !password) {
    return NextResponse.json({ error: 'Mot de passe requis.' }, { status: 400 });
  }

  try {
    const adminPassword = getBlogAdminPassword();

    // Comparaison à temps constant pour éviter les attaques timing
    const { timingSafeEqual } = await import('crypto');
    const a = Buffer.from(password);
    const b = Buffer.from(adminPassword);
    const match =
      a.length === b.length &&
      timingSafeEqual(a, b);

    if (!match) {
      return NextResponse.json({ error: 'Mot de passe incorrect.' }, { status: 401 });
    }

    attemptsByClient.delete(clientKey);

    const response = NextResponse.json({ ok: true });
    response.cookies.set(BLOG_SESSION_COOKIE, createBlogSessionToken(), blogSessionCookieOptions);
    return response;
  } catch (error) {
    console.error('Connexion blog admin impossible :', error);
    return NextResponse.json({ error: 'Configuration serveur incomplète.' }, { status: 500 });
  }
}
