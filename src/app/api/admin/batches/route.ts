import { NextResponse, type NextRequest } from 'next/server';
import { rejectUnlessPermission } from '@/lib/admin-auth';
import { getRequestActor, productionErrorResponse, readJsonBody, searchParam } from '@/lib/production/api';
import { createBatch } from '@/lib/production/mutations';
import { listBatches } from '@/lib/production/queries';
import { parseBatchInput } from '@/lib/production/validation';

export async function GET(request: NextRequest) {
  const rejection = rejectUnlessPermission(request, 'production:view');
  if (rejection) return rejection;

  try {
    return NextResponse.json(
      await listBatches({
        search: searchParam(request, 'q'),
        lotId: searchParam(request, 'lotId'),
        from: searchParam(request, 'from'),
        to: searchParam(request, 'to'),
      }),
    );
  } catch (error) {
    return productionErrorResponse(error, 'liste des batches');
  }
}

export async function POST(request: NextRequest) {
  const rejection = rejectUnlessPermission(request, 'production:write');
  if (rejection) return rejection;

  try {
    const input = parseBatchInput(await readJsonBody(request));
    return NextResponse.json(await createBatch(input, getRequestActor(request)), { status: 201 });
  } catch (error) {
    return productionErrorResponse(error, 'création de batch');
  }
}
