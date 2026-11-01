import { NextResponse, type NextRequest } from 'next/server';
import { rejectUnlessPermission } from '@/lib/admin-auth';
import { getRequestActor, productionErrorResponse, readJsonBody } from '@/lib/production/api';
import { deleteBatch, updateBatch } from '@/lib/production/mutations';
import { getBatch } from '@/lib/production/queries';
import { parseBatchInput } from '@/lib/production/validation';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  const rejection = rejectUnlessPermission(request, 'production:view');
  if (rejection) return rejection;

  try {
    const { id } = await params;
    const batch = await getBatch(id);
    if (!batch) return NextResponse.json({ error: 'Batch introuvable.' }, { status: 404 });
    return NextResponse.json(batch);
  } catch (error) {
    return productionErrorResponse(error, 'lecture de batch');
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const rejection = rejectUnlessPermission(request, 'production:write');
  if (rejection) return rejection;

  try {
    const { id } = await params;
    const input = parseBatchInput(await readJsonBody(request));
    return NextResponse.json(await updateBatch(id, input, getRequestActor(request)));
  } catch (error) {
    return productionErrorResponse(error, 'mise à jour de batch');
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const rejection = rejectUnlessPermission(request, 'production:write');
  if (rejection) return rejection;

  try {
    const { id } = await params;
    await deleteBatch(id, getRequestActor(request));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return productionErrorResponse(error, 'suppression de batch');
  }
}
