import { NextResponse, type NextRequest } from 'next/server';
import { rejectUnlessPermission } from '@/lib/admin-auth';
import { productionErrorResponse, readJsonBody } from '@/lib/production/api';
import {
  deleteOrderRecord,
  updateOrderStatusRecord,
  updatePaymentStatusRecord,
} from '@/lib/data/orders';
import type { OrderStatus, PaymentStatus } from '@/lib/ricewareModels';

type RouteContext = { params: Promise<{ id: string }> };

const ORDER_STATUSES: OrderStatus[] = [
  'draft',
  'received',
  'pending_confirmation',
  'confirmed',
  'preparing',
  'shipped',
  'delivered',
  'cancelled',
];

const PAYMENT_STATUSES: PaymentStatus[] = ['pending', 'paid', 'failed', 'refunded'];

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const rejection = rejectUnlessPermission(request, 'orders:write');
  if (rejection) return rejection;

  try {
    const { id } = await params;
    const body = (await readJsonBody(request)) as { status?: unknown; paymentStatus?: unknown };

    if (typeof body.status === 'string') {
      if (!ORDER_STATUSES.includes(body.status as OrderStatus)) {
        return NextResponse.json({ error: 'Statut de commande invalide.' }, { status: 400 });
      }
      return NextResponse.json(await updateOrderStatusRecord(id, body.status as OrderStatus));
    }

    if (typeof body.paymentStatus === 'string') {
      if (!PAYMENT_STATUSES.includes(body.paymentStatus as PaymentStatus)) {
        return NextResponse.json({ error: 'Statut de paiement invalide.' }, { status: 400 });
      }
      return NextResponse.json(await updatePaymentStatusRecord(id, body.paymentStatus as PaymentStatus));
    }

    return NextResponse.json({ error: 'Aucun statut fourni.' }, { status: 400 });
  } catch (error) {
    return productionErrorResponse(error, 'mise à jour de commande');
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const rejection = rejectUnlessPermission(request, 'orders:write');
  if (rejection) return rejection;

  try {
    const { id } = await params;
    await deleteOrderRecord(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return productionErrorResponse(error, 'suppression de commande');
  }
}
