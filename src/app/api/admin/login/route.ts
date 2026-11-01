import bcrypt from 'bcrypt';
import { NextResponse, type NextRequest } from 'next/server';
import {
  ADMIN_SESSION_COOKIE,
  adminSessionCookieOptions,
  createAdminSessionToken,
  getAdminPasswordHash,
} from '@/lib/admin-auth';
import { prisma } from '@/lib/db';
import { isAdminRole } from '@/lib/rbac';

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

async function logLogin(userId: string | undefined, name: string, success: boolean) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId ?? null,
        actorName: name,
        action: success ? 'login' : 'login_failed',
        entityType: 'session',
        details: { success },
      },
    });
  } catch (error) {
    console.error('Journal de connexion indisponible :', error);
  }
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
  let email: unknown;
  try {
    ({ motDePasse: password, email } = await request.json());
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  }

  if (typeof password !== 'string' || !password) {
    return NextResponse.json({ error: 'Mot de passe requis.' }, { status: 400 });
  }

  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  try {
    if (normalizedEmail) {
      const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      const isValid = user?.active ? await bcrypt.compare(password, user.passwordHash) : false;

      if (!user || !isValid || !isAdminRole(user.role)) {
        await logLogin(user?.id, normalizedEmail, false);
        return NextResponse.json({ error: 'Identifiants incorrects.' }, { status: 401 });
      }

      await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
      await logLogin(user.id, user.name, true);
      attemptsByClient.delete(clientKey);

      const response = NextResponse.json({
        ok: true,
        user: { name: user.name, email: user.email, role: user.role },
      });
      response.cookies.set(
        ADMIN_SESSION_COOKIE,
        createAdminSessionToken({
          userId: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }),
        adminSessionCookieOptions,
      );
      return response;
    }

    const isValid = await bcrypt.compare(password, getAdminPasswordHash());
    if (!isValid) {
      await logLogin(undefined, 'admin historique', false);
      return NextResponse.json({ error: 'Mot de passe incorrect.' }, { status: 401 });
    }

    attemptsByClient.delete(clientKey);
    await logLogin(undefined, process.env.ADMIN_USER || 'admin historique', true);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_SESSION_COOKIE, createAdminSessionToken(), adminSessionCookieOptions);
    return response;
  } catch (error) {
    console.error('Connexion admin impossible :', error);
    return NextResponse.json({ error: 'Configuration serveur incomplète.' }, { status: 500 });
  }
}
