import type { NextRequest } from 'next/server';
import { rejectUnlessPermission } from '@/lib/admin-auth';
import { productionErrorResponse } from '@/lib/production/api';
import { getBatch } from '@/lib/production/queries';
import { buildBatchQualityPdf } from '@/lib/reports/builders';
import { pdfResponse } from '@/lib/reports/pdf';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  const rejection = rejectUnlessPermission(request, 'reports:view');
  if (rejection) return rejection;

  try {
    const { id } = await params;
    const batch = await getBatch(id);
    if (!batch) return new Response('Batch introuvable.', { status: 404 });

    return pdfResponse(`riceware-qualite-${batch.code}.pdf`, buildBatchQualityPdf(batch));
  } catch (error) {
    return productionErrorResponse(error, 'export du rapport qualité');
  }
}
