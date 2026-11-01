import type { NextRequest } from 'next/server';
import { rejectUnlessPermission } from '@/lib/admin-auth';
import { productionErrorResponse, searchParam } from '@/lib/production/api';
import { listStocks, listStockMovements } from '@/lib/production/queries';
import { csvResponse, dateStamp, excelResponse } from '@/lib/reports/csv';
import { stockColumns } from '@/lib/reports/builders';
import { buildInventoryPdf } from '@/lib/reports/builders';
import { pdfResponse } from '@/lib/reports/pdf';

export async function GET(request: NextRequest) {
  const rejection = rejectUnlessPermission(request, 'reports:view');
  if (rejection) return rejection;

  try {
    const [stocks, movements] = await Promise.all([listStocks(), listStockMovements(100)]);
    const format = searchParam(request, 'format') ?? 'pdf';
    const stamp = dateStamp();

    if (format === 'csv') return csvResponse(`riceware-stocks-${stamp}.csv`, stockColumns, stocks);
    if (format === 'xls') {
      return excelResponse(`riceware-stocks-${stamp}.xls`, 'Inventaire des stocks', stockColumns, stocks);
    }

    return pdfResponse(`riceware-inventaire-${stamp}.pdf`, buildInventoryPdf(stocks, movements));
  } catch (error) {
    return productionErrorResponse(error, 'export des stocks');
  }
}
