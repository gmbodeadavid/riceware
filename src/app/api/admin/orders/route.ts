import { NextResponse, type NextRequest } from 'next/server';
import { rejectUnlessPermission } from '@/lib/admin-auth';
import { productionErrorResponse, searchParam } from '@/lib/production/api';
import { listOrders } from '@/lib/data/orders';
import type { OrderStatus, PaymentStatus, SalesChannel } from '@/lib/ricewareModels';

export async function GET(request: NextRequest) {
  const rejection = rejectUnlessPermission(request, 'orders:view');
  if (rejection) return rejection;

  try {
    return NextResponse.json(
      await listOrders({
        status: searchParam(request, 'status') as OrderStatus | undefined,
        paymentStatus: searchParam(request, 'paymentStatus') as PaymentStatus | undefined,
        channel: searchParam(request, 'channel') as SalesChannel | undefined,
        search: searchParam(request, 'q'),
      }),
    );
  } catch (error) {
    return productionErrorResponse(error, 'liste des commandes');
  }
}
