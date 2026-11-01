import { NextResponse, type NextRequest } from 'next/server';
import { rejectUnlessPermission } from '@/lib/admin-auth';
import { getRequestActor, productionErrorResponse, readJsonBody, searchParam } from '@/lib/production/api';
import { createRizerie } from '@/lib/production/mutations';
import { listRizeries } from '@/lib/production/queries';
import { parseRizerieInput } from '@/lib/production/validation';

export async function GET(request: NextRequest) {
  const rejection = rejectUnlessPermission(request, 'lots:view');
  if (rejection) return rejection;

  try {
    return NextResponse.json(await listRizeries({ search: searchParam(request, 'q') }));
  } catch (error) {
    return productionErrorResponse(error, 'liste des rizeries');
  }
}

export async function POST(request: NextRequest) {
  const rejection = rejectUnlessPermission(request, 'partners:write');
  if (rejection) return rejection;

  try {
    const input = parseRizerieInput(await readJsonBody(request));
    return NextResponse.json(await createRizerie(input, getRequestActor(request)), { status: 201 });
  } catch (error) {
    return productionErrorResponse(error, 'création de rizerie');
  }
}
