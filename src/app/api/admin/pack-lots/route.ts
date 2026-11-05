import { NextResponse, type NextRequest } from 'next/server';
import { rejectUnlessPermission } from '@/lib/admin-auth';
import { getRequestActor, productionErrorResponse, readJsonBody, searchParam } from '@/lib/production/api';
import { TraceabilityError, createPackLotWithStock, listPackLots } from '@/lib/traceability';

export async function GET(request: NextRequest) {
  const rejection = rejectUnlessPermission(request, 'production:view');
  if (rejection) return rejection;

  try {
    const rows = await listPackLots({
      packId: searchParam(request, 'packId'),
      batchId: searchParam(request, 'batchId'),
      rizerieId: searchParam(request, 'rizerieId'),
      status: searchParam(request, 'status'),
    });
    return NextResponse.json(rows);
  } catch (error) {
    return productionErrorResponse(error, 'liste des PackLots');
  }
}

export async function POST(request: NextRequest) {
  const rejection = rejectUnlessPermission(request, 'production:write');
  if (rejection) return rejection;

  try {
    const actor = getRequestActor(request);
    const body = (await readJsonBody(request)) as Record<string, unknown>;

    const batchId = typeof body.batchId === 'string' ? body.batchId.trim() : '';
    const packId = typeof body.packId === 'string' ? body.packId.trim() : '';
    const quantity = typeof body.quantity === 'number' ? body.quantity : parseInt(String(body.quantity), 10);

    if (!batchId) return NextResponse.json({ error: 'batchId est obligatoire.' }, { status: 400 });
    if (!packId) return NextResponse.json({ error: 'packId est obligatoire.' }, { status: 400 });
    if (!Number.isInteger(quantity) || quantity < 1) {
      return NextResponse.json({ error: 'La quantité doit être un entier positif.' }, { status: 400 });
    }

    const packedAt = body.packedAt ? new Date(String(body.packedAt)) : new Date();

    const packLot = await createPackLotWithStock(
      { batchId, packId, quantity, packedAt, createdById: actor?.userId ?? undefined },
      actor?.userId ?? undefined,
    );

    return NextResponse.json(packLot, { status: 201 });
  } catch (error) {
    if (error instanceof TraceabilityError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return productionErrorResponse(error, 'création de PackLot');
  }
}
