import type { NextRequest } from 'next/server';
import { rejectUnlessPermission } from '@/lib/admin-auth';
import { productionErrorResponse } from '@/lib/production/api';
import { getDashboardData } from '@/lib/production/queries';
import { dateStamp } from '@/lib/reports/csv';
import { buildDashboardPdf } from '@/lib/reports/builders';
import { pdfResponse } from '@/lib/reports/pdf';

export async function GET(request: NextRequest) {
  const rejection = rejectUnlessPermission(request, 'reports:view');
  if (rejection) return rejection;

  try {
    const data = await getDashboardData();
    return pdfResponse(`riceware-tableau-de-bord-${dateStamp()}.pdf`, buildDashboardPdf(data));
  } catch (error) {
    return productionErrorResponse(error, 'export du tableau de bord');
  }
}
