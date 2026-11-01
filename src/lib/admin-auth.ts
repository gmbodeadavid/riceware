import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { can, isAdminRole, ROLE_LABELS, type AdminRole, type Permission } from '@/lib/rbac';

export const ADMIN_SESSION_COOKIE = 'riceware_admin_session';

/** Durée de validité d’une session admin : 7 jours. */
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;

export type AdminSession = {
  userId?: string;
  name: string;
  email?: string;
  role: AdminRole;
};

type AdminTokenPayload = AdminSession & { sub?: string };

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

function getLegacyAdminName(): string {
  return process.env.ADMIN_USER?.trim() || 'Administrateur RiceWare';
}

export function createAdminSessionToken(session?: Partial<AdminSession>): string {
  const payload: AdminTokenPayload = {
    userId: session?.userId,
    name: session?.name?.trim() || getLegacyAdminName(),
    email: session?.email?.trim() || undefined,
    role: session?.role && isAdminRole(session.role) ? session.role : 'admin',
  };
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: SESSION_DURATION_SECONDS,
    subject: payload.userId,
  });
}

function readSessionToken(token: string | undefined): AdminSession | null {
  if (!token) return null;
  const secret = getJwtSecret();

  try {
    const payload = jwt.verify(token, secret);
    if (typeof payload !== 'object' || payload === null) return null;

    const value = payload as jwt.JwtPayload & Partial<AdminTokenPayload>;
    if (!isAdminRole(value.role)) return null;

    return {
      userId: value.userId ?? (typeof value.sub === 'string' ? value.sub : undefined),
      name: typeof value.name === 'string' && value.name ? value.name : ROLE_LABELS[value.role],
      email: typeof value.email === 'string' ? value.email : undefined,
      role: value.role,
    };
  } catch {
    return null;
  }
}

/** Session complète à partir d’une requête HTTP. */
export function getAdminSessionFromRequest(request: NextRequest): AdminSession | null {
  try {
    return readSessionToken(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
  } catch (error) {
    console.error('Lecture de session admin impossible :', error);
    return null;
  }
}

/** Vérifie la session admin dans un Route Handler. */
export function isAdminRequest(request: NextRequest): boolean {
  return getAdminSessionFromRequest(request) !== null;
}

/** Vérifie la session admin dans un Server Component ou un layout. */
export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  try {
    return readSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
  } catch (error) {
    console.error('Lecture de session admin impossible :', error);
    return null;
  }
}

export async function isAdminSession(): Promise<boolean> {
  return (await getAdminSession()) !== null;
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

export function forbiddenResponse(permission?: Permission) {
  return NextResponse.json(
    {
      error: permission
        ? `Votre rôle ne permet pas cette action (${permission}).`
        : 'Votre rôle ne permet pas cette action.',
    },
    { status: 403 },
  );
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

/**
 * Garde fine : authentification + permission métier.
 */
export function rejectUnlessPermission(request: NextRequest, permission: Permission): NextResponse | null {
  try {
    const session = getAdminSessionFromRequest(request);
    if (!session) return unauthorizedResponse();
    if (!can(session.role, permission)) return forbiddenResponse(permission);
    return null;
  } catch (error) {
    console.error('Vérification de permission impossible :', error);
    return NextResponse.json({ error: 'Configuration serveur incomplète.' }, { status: 500 });
  }
}

/** Garde acceptant plusieurs permissions (au moins une requise). */
export function rejectUnlessAnyPermission(request: NextRequest, permissions: Permission[]): NextResponse | null {
  try {
    const session = getAdminSessionFromRequest(request);
    if (!session) return unauthorizedResponse();
    if (!permissions.some((permission) => can(session.role, permission))) {
      return forbiddenResponse(permissions[0]);
    }
    return null;
  } catch (error) {
    console.error('Vérification de permission impossible :', error);
    return NextResponse.json({ error: 'Configuration serveur incomplète.' }, { status: 500 });
  }
}
