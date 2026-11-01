import type { NextRequest } from 'next/server';
import { rejectUnlessPermission } from '@/lib/admin-auth';
import { productionErrorResponse, searchParam } from '@/lib/production/api';
import { listLots } from '@/lib/production/queries';
import { csvResponse, dateStamp, excelResponse } from '@/lib/reports/csv';
import { lotColumns } from '@/lib/reports/builders';

export async function GET(request: NextRequest) {
  const rejection = rejectUnlessPermission(request, 'reports:view');
  if (rejection) return rejection;

  try {
    const lots = await listLots({
      search: searchParam(request, 'q'),
      rizerieId: searchParam(request, 'rizerieId'),
      status: searchParam(request, 'status'),
      from: searchParam(request, 'from'),
      to: searchParam(request, 'to'),
    });
    const format = searchParam(request, 'format') ?? 'csv';
    const stamp = dateStamp();

    if (format === 'xls') {
      return excelResponse(`riceware-lots-${stamp}.xls`, 'Lots de coques', lotColumns, lots);
    }
    return csvResponse(`riceware-lots-${stamp}.csv`, lotColumns, lots);
  } catch (error) {
    return productionErrorResponse(error, 'export des lots');
  }
}
