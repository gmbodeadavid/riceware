import type { NextRequest } from 'next/server';
import { rejectUnlessPermission } from '@/lib/admin-auth';
import { productionErrorResponse, searchParam } from '@/lib/production/api';
import { listTests } from '@/lib/production/queries';
import { csvResponse, dateStamp, excelResponse } from '@/lib/reports/csv';
import { testColumns } from '@/lib/reports/builders';

export async function GET(request: NextRequest) {
  const rejection = rejectUnlessPermission(request, 'reports:view');
  if (rejection) return rejection;

  try {
    const tests = await listTests({
      typeTest: searchParam(request, 'type'),
      result: searchParam(request, 'result'),
    });
    const format = searchParam(request, 'format') ?? 'csv';
    const stamp = dateStamp();

    if (format === 'xls') {
      return excelResponse(`riceware-tests-${stamp}.xls`, 'Tests qualité', testColumns, tests);
    }
    return csvResponse(`riceware-tests-${stamp}.csv`, testColumns, tests);
  } catch (error) {
    return productionErrorResponse(error, 'export des tests qualité');
  }
}
