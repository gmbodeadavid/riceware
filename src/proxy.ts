import { NextResponse, type NextRequest } from 'next/server';

const SESSION_COOKIE = 'riceware_admin_session';

/**
 * Garde de premier niveau : redirige les visites non authentifiées vers la
 * page de connexion. La vérification cryptographique de la session reste
 * faite côté serveur (pages et Route Handlers) pour ne jamais faire confiance
 * au seul cookie.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname === '/admin/login') {
    return NextResponse.next();
  }

  if (!request.cookies.get(SESSION_COOKIE)?.value) {
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('suite', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/admin/:path*',
};
