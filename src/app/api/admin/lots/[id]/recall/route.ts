import { NextResponse, type NextRequest } from 'next/server';
import { rejectUnlessPermission } from '@/lib/admin-auth';
import { getRequestActor, productionErrorResponse, readJsonBody } from '@/lib/production/api';
import { TraceabilityError, recallLot } from '@/lib/traceability';

type RouteContext = { params: Promise<{ id: string }> };

/** POST — marquer un lot de coques en rappel */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const rejection = rejectUnlessPermission(request, 'production:write');
  if (rejection) return rejection;

  try {
    const { id } = await params;
    const actor = getRequestActor(request);
    const body = (await readJsonBody(request)) as Record<string, unknown>;
    const motif = typeof body.motif === 'string' ? body.motif.trim() : '';
    if (!motif) return NextResponse.json({ error: 'Le motif de rappel est obligatoire.' }, { status: 400 });
    const result = await recallLot(id, motif, actor?.userId ?? undefined);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof TraceabilityError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return productionErrorResponse(error, 'rappel lot');
  }
}
