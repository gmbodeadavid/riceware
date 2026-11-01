import type { NextRequest } from 'next/server';
import { rejectUnlessPermission } from '@/lib/admin-auth';
import { productionErrorResponse, searchParam } from '@/lib/production/api';
import { listOrders } from '@/lib/data/orders';
import { csvResponse, dateStamp, excelResponse } from '@/lib/reports/csv';
import { orderColumns } from '@/lib/reports/builders';

export async function GET(request: NextRequest) {
  const rejection = rejectUnlessPermission(request, 'reports:view');
  if (rejection) return rejection;

  try {
    const { orders } = await listOrders({ search: searchParam(request, 'q') });
    const format = searchParam(request, 'format') ?? 'csv';
    const stamp = dateStamp();

    if (format === 'xls') {
      return excelResponse(`riceware-commandes-${stamp}.xls`, 'Commandes', orderColumns, orders);
    }
    return csvResponse(`riceware-commandes-${stamp}.csv`, orderColumns, orders);
  } catch (error) {
    return productionErrorResponse(error, 'export des commandes');
  }
}
