import type { NextRequest } from 'next/server';
import { rejectUnlessPermission } from '@/lib/admin-auth';
import { productionErrorResponse, searchParam } from '@/lib/production/api';
import { listBatches } from '@/lib/production/queries';
import { csvResponse, dateStamp, excelResponse } from '@/lib/reports/csv';
import { batchColumns } from '@/lib/reports/builders';

export async function GET(request: NextRequest) {
  const rejection = rejectUnlessPermission(request, 'reports:view');
  if (rejection) return rejection;

  try {
    const batches = await listBatches({
      search: searchParam(request, 'q'),
      lotId: searchParam(request, 'lotId'),
      from: searchParam(request, 'from'),
      to: searchParam(request, 'to'),
    });
    const format = searchParam(request, 'format') ?? 'csv';
    const stamp = dateStamp();

    if (format === 'xls') {
      return excelResponse(`riceware-batches-${stamp}.xls`, 'Batches de production', batchColumns, batches);
    }
    return csvResponse(`riceware-batches-${stamp}.csv`, batchColumns, batches);
  } catch (error) {
    return productionErrorResponse(error, 'export des batches');
  }
}
