import { NextResponse, type NextRequest } from 'next/server';
import { rejectUnlessPermission } from '@/lib/admin-auth';
import { getRequestActor, productionErrorResponse, readJsonBody } from '@/lib/production/api';
import { deleteLot, updateLot } from '@/lib/production/mutations';
import { getLot } from '@/lib/production/queries';
import { parseLotInput } from '@/lib/production/validation';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  const rejection = rejectUnlessPermission(request, 'lots:view');
  if (rejection) return rejection;

  try {
    const { id } = await params;
    const lot = await getLot(id);
    if (!lot) return NextResponse.json({ error: 'Lot introuvable.' }, { status: 404 });
    return NextResponse.json(lot);
  } catch (error) {
    return productionErrorResponse(error, 'lecture de lot');
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const rejection = rejectUnlessPermission(request, 'lots:write');
  if (rejection) return rejection;

  try {
    const { id } = await params;
    const input = parseLotInput(await readJsonBody(request));
    return NextResponse.json(await updateLot(id, input, getRequestActor(request)));
  } catch (error) {
    return productionErrorResponse(error, 'mise à jour de lot');
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const rejection = rejectUnlessPermission(request, 'lots:write');
  if (rejection) return rejection;

  try {
    const { id } = await params;
    await deleteLot(id, getRequestActor(request));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return productionErrorResponse(error, 'suppression de lot');
  }
}
