import jwt from 'jsonwebtoken';
import { NextResponse, type NextRequest } from 'next/server';

export const BLOG_SESSION_COOKIE = 'blog_admin_session';

/** Durée de validité d'une session blog admin : 24 h. */
const SESSION_DURATION_SECONDS = 60 * 60 * 24;

type BlogSessionPayload = { blogAdmin: true };

// ─── Env helpers ─────────────────────────────────────────────────────────────

function getBlogAdminSecret(): string {
  const secret = process.env.BLOG_ADMIN_SECRET;
  if (!secret) {
    throw new Error('BLOG_ADMIN_SECRET doit être défini dans .env (voir .env.example).');
  }
  return secret;
}

export function getBlogAdminPassword(): string {
  const pwd = process.env.BLOG_ADMIN_PASSWORD;
  if (!pwd) {
    throw new Error('BLOG_ADMIN_PASSWORD doit être défini dans .env (voir .env.example).');
  }
  return pwd;
}

// ─── Token ───────────────────────────────────────────────────────────────────

export function createBlogSessionToken(): string {
  const payload: BlogSessionPayload = { blogAdmin: true };
  return jwt.sign(payload, getBlogAdminSecret(), {
    expiresIn: SESSION_DURATION_SECONDS,
  });
}

function readBlogSessionToken(token: string | undefined): true | null {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, getBlogAdminSecret());
    if (typeof payload === 'object' && payload !== null && (payload as BlogSessionPayload).blogAdmin === true) {
      return true;
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Session access ───────────────────────────────────────────────────────────

/** Vérifie la session depuis une NextRequest (Route Handler). */
export function getBlogSessionFromRequest(request: NextRequest): true | null {
  try {
    return readBlogSessionToken(request.cookies.get(BLOG_SESSION_COOKIE)?.value);
  } catch {
    return null;
  }
}

// ─── Cookie options ───────────────────────────────────────────────────────────

export const blogSessionCookieOptions = {
  httpOnly: true,
  sameSite: 'strict',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: SESSION_DURATION_SECONDS,
} as const;

// ─── Guards ───────────────────────────────────────────────────────────────────

/**
 * Garde Route Handler : retourne une NextResponse 401 si la session est absente,
 * sinon retourne `null` (la requête peut continuer).
 */
export function requireBlogSession(request: NextRequest): NextResponse | null {
  try {
    const session = getBlogSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Session expirée, reconnectez-vous.' }, { status: 401 });
    }
    return null;
  } catch (error) {
    console.error('Vérification de session blog admin impossible :', error);
    return NextResponse.json({ error: 'Configuration serveur incomplète.' }, { status: 500 });
  }
}
