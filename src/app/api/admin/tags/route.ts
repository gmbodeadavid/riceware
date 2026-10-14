import { NextResponse, type NextRequest } from 'next/server';
import { rejectUnlessAdmin } from '@/lib/admin-auth';
import { blogErrorResponse, readJsonBody } from '@/lib/blog/errors';
import { revalidateBlogPages } from '@/lib/blog/revalidate';
import { findOrCreateTag } from '@/lib/data/blog';

/** Crée une étiquette : `{ "name": "Compost" }`. */
export async function POST(request: NextRequest) {
  const rejection = rejectUnlessAdmin(request);
  if (rejection) return rejection;

  try {
    const body = await readJsonBody(request);
    const tag = await findOrCreateTag((body as { name?: unknown } | null)?.name);
    revalidateBlogPages();
    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    return blogErrorResponse(error, 'création d’étiquette');
  }
}
