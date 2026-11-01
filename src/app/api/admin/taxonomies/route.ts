import { NextResponse, type NextRequest } from 'next/server';
import { rejectUnlessPermission } from '@/lib/admin-auth';
import { blogErrorResponse } from '@/lib/blog/errors';
import { getArticleTaxonomies } from '@/lib/data/blog';

export async function GET(request: NextRequest) {
  const rejection = rejectUnlessPermission(request, 'content:manage');
  if (rejection) return rejection;

  try {
    return NextResponse.json(await getArticleTaxonomies());
  } catch (error) {
    return blogErrorResponse(error, 'chargement des taxonomies');
  }
}
