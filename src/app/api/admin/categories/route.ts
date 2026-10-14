import { NextResponse, type NextRequest } from 'next/server';
import { rejectUnlessAdmin } from '@/lib/admin-auth';
import { blogErrorResponse, readJsonBody } from '@/lib/blog/errors';
import { revalidateBlogPages } from '@/lib/blog/revalidate';
import { findOrCreateCategory } from '@/lib/data/blog';

/** Crée une catégorie : `{ "name": "Actualités" }`. */
export async function POST(request: NextRequest) {
  const rejection = rejectUnlessAdmin(request);
  if (rejection) return rejection;

  try {
    const body = await readJsonBody(request);
    const category = await findOrCreateCategory((body as { name?: unknown } | null)?.name);
    revalidateBlogPages();
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    return blogErrorResponse(error, 'création de catégorie');
  }
}
