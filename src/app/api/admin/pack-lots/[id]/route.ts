import { NextResponse, type NextRequest } from 'next/server';
import { rejectUnlessPermission } from '@/lib/admin-auth';
import { getRequestActor, productionErrorResponse, readJsonBody } from '@/lib/production/api';
import {
  TraceabilityError,
  getPackLot,
  releasePackLot,
  recallPackLot,
  softDeletePackLot,
} from '@/lib/traceability';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  const rejection = rejectUnlessPermission(request, 'production:view');
  if (rejection) return rejection;

  try {
    const { id } = await params;
    const packLot = await getPackLot(id);
    if (!packLot) return NextResponse.json({ error: 'PackLot introuvable.' }, { status: 404 });
    return NextResponse.json(packLot);
  } catch (error) {
    return productionErrorResponse(error, 'lecture PackLot');
  }
}

/** PATCH — actions : release | recall | delete */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const actor = getRequestActor(request);
    const body = (await readJsonBody(request)) as Record<string, unknown>;
    const action = typeof body.action === 'string' ? body.action : '';

    if (action === 'release') {
      const rejection = rejectUnlessPermission(request, 'quality:write');
      if (rejection) return rejection;
      await releasePackLot(id, actor?.userId ?? undefined);
      return NextResponse.json({ ok: true });
    }

    if (action === 'recall') {
      const rejection = rejectUnlessPermission(request, 'production:write');
      if (rejection) return rejection;
      const motif = typeof body.motif === 'string' ? body.motif.trim() : '';
      if (!motif) return NextResponse.json({ error: 'Le motif de rappel est obligatoire.' }, { status: 400 });
      const result = await recallPackLot(id, motif, actor?.userId ?? undefined);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Action non reconnue.' }, { status: 400 });
  } catch (error) {
    if (error instanceof TraceabilityError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return productionErrorResponse(error, 'action PackLot');
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const rejection = rejectUnlessPermission(request, 'production:write');
  if (rejection) return rejection;

  try {
    const { id } = await params;
    const actor = getRequestActor(request);
    await softDeletePackLot(id, actor?.userId ?? undefined);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof TraceabilityError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return productionErrorResponse(error, 'suppression PackLot');
  }
}
