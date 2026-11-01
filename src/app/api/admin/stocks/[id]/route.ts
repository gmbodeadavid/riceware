import { NextResponse, type NextRequest } from 'next/server';
import { rejectUnlessPermission } from '@/lib/admin-auth';
import { getRequestActor, productionErrorResponse, readJsonBody } from '@/lib/production/api';
import { deleteStock, updateStock } from '@/lib/production/mutations';
import { parseStockInput } from '@/lib/production/validation';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const rejection = rejectUnlessPermission(request, 'stocks:write');
  if (rejection) return rejection;

  try {
    const { id } = await params;
    const data = (await readJsonBody(request)) as Record<string, unknown>;
    const parsed = parseStockInput({
      itemType: data.itemType ?? 'coques',
      productType: data.productType ?? '',
      label: data.label,
      quantity: 0,
      unit: data.unit ?? 'kg',
      minThreshold: data.minThreshold ?? 0,
      location: data.location ?? '',
    });
    return NextResponse.json(
      await updateStock(
        id,
        { label: parsed.label, minThreshold: parsed.minThreshold, location: parsed.location, unit: parsed.unit },
        getRequestActor(request),
      ),
    );
  } catch (error) {
    return productionErrorResponse(error, 'mise à jour de stock');
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const rejection = rejectUnlessPermission(request, 'stocks:write');
  if (rejection) return rejection;

  try {
    const { id } = await params;
    await deleteStock(id, getRequestActor(request));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return productionErrorResponse(error, 'suppression de stock');
  }
}
