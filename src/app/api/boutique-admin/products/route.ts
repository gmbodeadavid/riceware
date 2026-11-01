import { NextResponse, type NextRequest } from 'next/server';
import { rejectUnlessPermission } from '@/lib/admin-auth';
import { productionErrorResponse, readJsonBody, searchParam } from '@/lib/production/api';
import { createProduct, listProducts } from '@/lib/data/products';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const rejection = rejectUnlessPermission(request, 'catalog:manage');
  if (rejection) return rejection;

  try {
    const published = searchParam(request, 'published');
    const products = await listProducts({
      category: searchParam(request, 'category'),
      status: searchParam(request, 'status'),
      search: searchParam(request, 'search'),
      isPublished:
        published === 'true' ? true : published === 'false' ? false : undefined,
    });
    return NextResponse.json(products);
  } catch (error) {
    return productionErrorResponse(error, 'liste des produits');
  }
}

export async function POST(request: NextRequest) {
  const rejection = rejectUnlessPermission(request, 'catalog:manage');
  if (rejection) return rejection;

  try {
    const body = await readJsonBody(request);
    const product = await createProduct(body as Parameters<typeof createProduct>[0]);
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    return productionErrorResponse(error, 'création de produit');
  }
}
