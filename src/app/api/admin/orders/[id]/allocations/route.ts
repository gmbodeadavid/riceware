import { NextResponse, type NextRequest } from 'next/server';
import { rejectUnlessPermission } from '@/lib/admin-auth';
import { getRequestActor, productionErrorResponse, readJsonBody, searchParam } from '@/lib/production/api';
import {
  TraceabilityError,
  createAllocation,
  softDeleteAllocation,
  suggestFifoAllocation,
  cancelOrderAllocations,
} from '@/lib/traceability';

type RouteContext = { params: Promise<{ id: string }> };

/** GET ?orderLineId=... — suggère l'allocation FIFO pour une ligne */
export async function GET(request: NextRequest, { params }: RouteContext) {
  const rejection = rejectUnlessPermission(request, 'orders:view');
  if (rejection) return rejection;

  try {
    void (await params); // orderId not needed for FIFO suggestion
    const orderLineId = searchParam(request, 'orderLineId');
    if (!orderLineId) return NextResponse.json({ error: 'orderLineId est obligatoire.' }, { status: 400 });
    const suggestions = await suggestFifoAllocation(orderLineId);
    return NextResponse.json(suggestions);
  } catch (error) {
    if (error instanceof TraceabilityError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return productionErrorResponse(error, 'suggestion FIFO');
  }
}

/** POST — créer une allocation */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const rejectionOrders = rejectUnlessPermission(request, 'orders:write');
  if (rejectionOrders) return rejectionOrders;
  const rejectionStocks = rejectUnlessPermission(request, 'stocks:write');
  if (rejectionStocks) return rejectionStocks;

  try {
    void (await params);
    const actor = getRequestActor(request);
    const body = (await readJsonBody(request)) as Record<string, unknown>;

    const orderLineId = typeof body.orderLineId === 'string' ? body.orderLineId.trim() : '';
    const packLotId = typeof body.packLotId === 'string' ? body.packLotId.trim() : '';
    const quantityRaw = body.quantity;
    const quantity =
      typeof quantityRaw === 'number'
        ? quantityRaw
        : parseInt(String(quantityRaw), 10);

    if (!orderLineId) return NextResponse.json({ error: 'orderLineId est obligatoire.' }, { status: 400 });
    if (!packLotId) return NextResponse.json({ error: 'packLotId est obligatoire.' }, { status: 400 });
    if (!Number.isInteger(quantity) || quantity < 1) {
      return NextResponse.json({ error: 'La quantité doit être un entier positif.' }, { status: 400 });
    }

    const allocation = await createAllocation({
      orderLineId,
      packLotId,
      quantity,
      createdById: actor?.userId ?? undefined,
    });

    return NextResponse.json(allocation, { status: 201 });
  } catch (error) {
    if (error instanceof TraceabilityError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return productionErrorResponse(error, 'création allocation');
  }
}

/** DELETE — annuler toutes les allocations de la commande (lors de l'annulation) */
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const rejection = rejectUnlessPermission(request, 'orders:write');
  if (rejection) return rejection;

  try {
    const { id: orderId } = await params;
    const body = (await readJsonBody(request)) as Record<string, unknown>;
    const actor = getRequestActor(request);

    // Si allocationId fourni → soft-delete d'une seule allocation
    if (typeof body.allocationId === 'string' && body.allocationId.trim()) {
      await softDeleteAllocation(body.allocationId.trim(), actor?.userId ?? undefined);
      return NextResponse.json({ ok: true });
    }

    // Sinon → annuler toutes les allocations de la commande
    await cancelOrderAllocations(orderId, actor?.userId ?? undefined);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof TraceabilityError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return productionErrorResponse(error, 'suppression allocation(s)');
  }
}
