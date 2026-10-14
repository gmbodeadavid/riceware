import bcrypt from 'bcrypt';
import { NextResponse, type NextRequest } from 'next/server';
import {
  ADMIN_SESSION_COOKIE,
  adminSessionCookieOptions,
  createAdminSessionToken,
  getAdminPasswordHash,
} from '@/lib/admin-auth';

const MAX_ATTEMPTS = 10;
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
    const isValid = await bcrypt.compare(password, getAdminPasswordHash());
    if (!isValid) {
      return NextResponse.json({ error: 'Mot de passe incorrect.' }, { status: 401 });
    }

    attemptsByClient.delete(clientKey);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_SESSION_COOKIE, createAdminSessionToken(), adminSessionCookieOptions);
    return response;
  } catch (error) {
    console.error('Connexion admin impossible :', error);
    return NextResponse.json({ error: 'Configuration serveur incomplète.' }, { status: 500 });
  }
}
