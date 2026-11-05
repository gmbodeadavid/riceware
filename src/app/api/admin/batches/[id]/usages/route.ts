import { NextResponse, type NextRequest } from 'next/server';
import { rejectUnlessPermission } from '@/lib/admin-auth';
import { getRequestActor, productionErrorResponse, readJsonBody } from '@/lib/production/api';
import { TraceabilityError, createBatchMaterialUsage, softDeleteBatchMaterialUsage } from '@/lib/traceability';

type RouteContext = { params: Promise<{ id: string }> };

/** POST — ajouter un usage de lot à un batch */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const rejection = rejectUnlessPermission(request, 'production:write');
  if (rejection) return rejection;

  try {
    const { id: batchId } = await params;
    const body = (await readJsonBody(request)) as Record<string, unknown>;

    const lotCoquesId = typeof body.lotCoquesId === 'string' ? body.lotCoquesId.trim() : '';
    if (!lotCoquesId) return NextResponse.json({ error: 'lotCoquesId est obligatoire.' }, { status: 400 });

    const kgUsedRaw = body.kgUsed;
    const kgUsed =
      kgUsedRaw === null || kgUsedRaw === undefined || kgUsedRaw === ''
        ? null
        : typeof kgUsedRaw === 'number'
          ? kgUsedRaw
          : parseFloat(String(kgUsedRaw));

    if (kgUsed !== null && (isNaN(kgUsed) || kgUsed <= 0)) {
      return NextResponse.json({ error: 'kgUsed doit être un nombre positif ou null.' }, { status: 400 });
    }

    const motifEstimation = typeof body.motifEstimation === 'string' ? body.motifEstimation.trim() : undefined;

    const usage = await createBatchMaterialUsage({
      batchId,
      lotCoquesId,
      kgUsed: kgUsed ?? 0,
      motifEstimation,
    });

    return NextResponse.json(usage, { status: 201 });
  } catch (error) {
    if (error instanceof TraceabilityError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return productionErrorResponse(error, 'ajout usage de lot');
  }
}

/** DELETE /:usageId — supprimer un usage de lot */
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const rejection = rejectUnlessPermission(request, 'production:write');
  if (rejection) return rejection;

  try {
    const { id } = await params; // ici id = batchId; usageId dans le body
    const body = (await readJsonBody(request)) as Record<string, unknown>;
    const usageId = typeof body.usageId === 'string' ? body.usageId.trim() : '';
    if (!usageId) return NextResponse.json({ error: 'usageId est obligatoire.' }, { status: 400 });
    const actor = getRequestActor(request);
    void id; // batchId is not needed for soft-delete
    await softDeleteBatchMaterialUsage(usageId, actor?.userId ?? undefined);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof TraceabilityError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return productionErrorResponse(error, 'suppression usage de lot');
  }
}
