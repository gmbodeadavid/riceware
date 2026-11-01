import { NextResponse, type NextRequest } from 'next/server';
import { rejectUnlessPermission } from '@/lib/admin-auth';
import { productionErrorResponse, readJsonBody } from '@/lib/production/api';
import { createCategory, listCategories } from '@/lib/data/products';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const rejection = rejectUnlessPermission(request, 'catalog:manage');
  if (rejection) return rejection;

  try {
    return NextResponse.json(await listCategories());
  } catch (error) {
    return productionErrorResponse(error, 'liste des catégories');
  }
}

export async function POST(request: NextRequest) {
  const rejection = rejectUnlessPermission(request, 'catalog:manage');
  if (rejection) return rejection;

  try {
    const body = await readJsonBody(request);
    const data = body as { slug?: unknown; name?: unknown; sortOrder?: unknown };

    if (!data.slug || typeof data.slug !== 'string') {
      return NextResponse.json({ error: 'Le champ "slug" est requis.' }, { status: 400 });
    }
    if (!data.name || typeof data.name !== 'string') {
      return NextResponse.json({ error: 'Le champ "name" est requis.' }, { status: 400 });
    }

    const category = await createCategory({
      slug: data.slug,
      name: data.name,
      sortOrder: typeof data.sortOrder === 'number' ? data.sortOrder : undefined,
    });
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes('existe déjà')) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return productionErrorResponse(error, 'création de catégorie');
  }
}
