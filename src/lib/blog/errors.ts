import { NextResponse } from 'next/server';

/** Données envoyées par l’admin invalides : renvoyées en 400 avec la liste des problèmes. */
export class BlogInputError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(issues.join(' '));
    this.name = 'BlogInputError';
    this.issues = issues;
  }
}

export class BlogNotFoundError extends Error {
  constructor(message = 'Article introuvable.') {
    super(message);
    this.name = 'BlogNotFoundError';
  }
}

export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new BlogInputError(['Requête invalide : JSON attendu.']);
  }
}

export function blogErrorResponse(error: unknown, action: string) {
  if (error instanceof BlogInputError) {
    return NextResponse.json({ error: error.message, issues: error.issues }, { status: 400 });
  }

  if (error instanceof BlogNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  console.error(`Blog admin – ${action} :`, error);
  return NextResponse.json({ error: 'Erreur serveur, réessayez.' }, { status: 500 });
}
