import { NextResponse, type NextRequest } from 'next/server';
import { rejectUnlessPermission } from '@/lib/admin-auth';
import { getRequestActor, productionErrorResponse, readJsonBody } from '@/lib/production/api';
import { deleteProduitFini, updateProduitFini } from '@/lib/production/mutations';
import { parseProduitFiniInput } from '@/lib/production/validation';

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const rejection = rejectUnlessPermission(request, 'quality:write');
  if (rejection) return rejection;

  try {
    const { id } = await params;
    const input = parseProduitFiniInput(await readJsonBody(request));
    return NextResponse.json(await updateProduitFini(id, input, getRequestActor(request)));
  } catch (error) {
    return productionErrorResponse(error, 'mise à jour de produit fini');
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const rejection = rejectUnlessPermission(request, 'quality:write');
  if (rejection) return rejection;

  try {
    const { id } = await params;
    await deleteProduitFini(id, getRequestActor(request));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return productionErrorResponse(error, 'suppression de produit fini');
  }
}
