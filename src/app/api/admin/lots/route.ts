import { NextResponse, type NextRequest } from 'next/server';
import { rejectUnlessPermission } from '@/lib/admin-auth';
import { getRequestActor, productionErrorResponse, readJsonBody, searchParam } from '@/lib/production/api';
import { createLot } from '@/lib/production/mutations';
import { listLots } from '@/lib/production/queries';
import { parseLotInput } from '@/lib/production/validation';

export async function GET(request: NextRequest) {
  const rejection = rejectUnlessPermission(request, 'lots:view');
  if (rejection) return rejection;

  try {
    return NextResponse.json(
      await listLots({
        search: searchParam(request, 'q'),
        rizerieId: searchParam(request, 'rizerieId'),
        status: searchParam(request, 'status'),
        from: searchParam(request, 'from'),
        to: searchParam(request, 'to'),
      }),
    );
  } catch (error) {
    return productionErrorResponse(error, 'liste des lots');
  }
}

export async function POST(request: NextRequest) {
  const rejection = rejectUnlessPermission(request, 'lots:write');
  if (rejection) return rejection;

  try {
    const input = parseLotInput(await readJsonBody(request));
    return NextResponse.json(await createLot(input, getRequestActor(request)), { status: 201 });
  } catch (error) {
    return productionErrorResponse(error, 'création de lot');
  }
}
