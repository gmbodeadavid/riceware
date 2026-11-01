import { NextResponse, type NextRequest } from 'next/server';
import { rejectUnlessPermission } from '@/lib/admin-auth';
import { productionErrorResponse, readJsonBody } from '@/lib/production/api';
import { deleteProduct, getProductById, updateProduct } from '@/lib/data/products';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  const rejection = rejectUnlessPermission(request, 'catalog:manage');
  if (rejection) return rejection;

  try {
    const { id } = await params;
    const product = await getProductById(id);
    if (!product) return NextResponse.json({ error: 'Produit introuvable.' }, { status: 404 });
    return NextResponse.json(product);
  } catch (error) {
    return productionErrorResponse(error, 'lecture de produit');
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const rejection = rejectUnlessPermission(request, 'catalog:manage');
  if (rejection) return rejection;

  try {
    const { id } = await params;
    const body = await readJsonBody(request);
    const product = await updateProduct(id, body as Parameters<typeof updateProduct>[1]);
    return NextResponse.json(product);
  } catch (error) {
    return productionErrorResponse(error, 'mise à jour de produit');
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const rejection = rejectUnlessPermission(request, 'catalog:manage');
  if (rejection) return rejection;

  try {
    const { id } = await params;
    const result = await deleteProduct(id);
    if ('canArchive' in result) {
      return NextResponse.json({ error: result.error, canArchive: true }, { status: 409 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return productionErrorResponse(error, 'suppression de produit');
  }
}
