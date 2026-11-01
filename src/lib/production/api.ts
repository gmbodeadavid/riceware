import { NextResponse, type NextRequest } from 'next/server';
import { getAdminSessionFromRequest, type AdminSession } from '@/lib/admin-auth';
import { ProductionError } from '@/lib/production/validation';

export async function readJsonBody(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ProductionError('Corps de requête JSON invalide.');
  }
}

export function getRequestActor(request: NextRequest): AdminSession | undefined {
  return getAdminSessionFromRequest(request) ?? undefined;
}

export function productionErrorResponse(error: unknown, context: string): NextResponse {
  if (error instanceof ProductionError) {
    return NextResponse.json({ error: error.message, issues: error.issues }, { status: error.status });
  }

  if (error instanceof Error && 'code' in error) {
    const code = (error as Error & { code?: string }).code;
    if (code === 'P2025') {
      return NextResponse.json({ error: 'Élément introuvable.' }, { status: 404 });
    }
    if (code === 'P2002') {
      return NextResponse.json({ error: 'Cette valeur existe déjà (doublon).' }, { status: 409 });
    }
    if (code === 'P2003') {
      return NextResponse.json({ error: 'Suppression impossible : des données liées existent.' }, { status: 409 });
    }
  }

  console.error(`Erreur API production — ${context} :`, error);
  return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
}

export function searchParam(request: NextRequest, key: string): string | undefined {
  const value = request.nextUrl.searchParams.get(key)?.trim();
  return value || undefined;
}
