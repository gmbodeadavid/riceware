import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

export const ADMIN_SESSION_COOKIE = 'riceware_admin_session';

/** Durée de validité d’une session admin : 7 jours. */
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;

type AdminSessionPayload = { role: 'admin' };

function readRequiredEnv(name: 'JWT_SECRET' | 'ADMIN_PASSWORD_HASH'): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} doit être défini dans .env (voir .env.example).`);
  }
  return value;
}

function getJwtSecret(): string {
  return readRequiredEnv('JWT_SECRET');
}

export function getAdminPasswordHash(): string {
  const hash = readRequiredEnv('ADMIN_PASSWORD_HASH');
  // Un hash bcrypt fait 60 caractères. S’il est plus court, les « $ » ont été
  // interprétés comme des variables par le chargeur .env de Next.js.
  if (!/^\$2[aby]\$\d{2}\$.{53}$/.test(hash)) {
    throw new Error('ADMIN_PASSWORD_HASH est invalide : échappez chaque « $ » en « \\$ » dans .env (npm run admin:hash).');
  }
  return hash;
}

export function createAdminSessionToken(): string {
  const payload: AdminSessionPayload = { role: 'admin' };
  return jwt.sign(payload, getJwtSecret(), { expiresIn: SESSION_DURATION_SECONDS });
}

function isValidSessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const secret = getJwtSecret();

  try {
    const payload = jwt.verify(token, secret);
    return typeof payload === 'object' && payload !== null && payload.role === 'admin';
  } catch {
    return false;
  }
}

/** Vérifie la session admin dans un Route Handler. */
export function isAdminRequest(request: NextRequest): boolean {
  return isValidSessionToken(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

/** Vérifie la session admin dans un Server Component ou un layout. */
export async function isAdminSession(): Promise<boolean> {
  const cookieStore = await cookies();
  return isValidSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}

export const adminSessionCookieOptions = {
  httpOnly: true,
  sameSite: 'strict',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: SESSION_DURATION_SECONDS,
} as const;

export function unauthorizedResponse() {
  return NextResponse.json({ error: 'Session expirée, reconnectez-vous.' }, { status: 401 });
}

/**
 * Garde des Route Handlers admin : renvoie une réponse d’erreur si la requête
 * n’est pas authentifiée, `null` sinon.
 */
export function rejectUnlessAdmin(request: NextRequest): NextResponse | null {
  try {
    return isAdminRequest(request) ? null : unauthorizedResponse();
  } catch (error) {
    console.error('Vérification de session admin impossible :', error);
    return NextResponse.json({ error: 'Configuration serveur incomplète.' }, { status: 500 });
  }
}
