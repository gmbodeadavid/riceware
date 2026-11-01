import { NextResponse, type NextRequest } from 'next/server';
import { rejectUnlessPermission } from '@/lib/admin-auth';
import { getRequestActor, productionErrorResponse, readJsonBody, searchParam } from '@/lib/production/api';
import { createTest } from '@/lib/production/mutations';
import { listTests } from '@/lib/production/queries';
import { parseTestInput } from '@/lib/production/validation';

export async function GET(request: NextRequest) {
  const rejection = rejectUnlessPermission(request, 'quality:view');
  if (rejection) return rejection;

  try {
    return NextResponse.json(
      await listTests({
        typeTest: searchParam(request, 'type'),
        result: searchParam(request, 'result'),
      }),
    );
  } catch (error) {
    return productionErrorResponse(error, 'liste des tests qualité');
  }
}

export async function POST(request: NextRequest) {
  const rejection = rejectUnlessPermission(request, 'quality:write');
  if (rejection) return rejection;

  try {
    const input = parseTestInput(await readJsonBody(request));
    return NextResponse.json(await createTest(input, getRequestActor(request)), { status: 201 });
  } catch (error) {
    return productionErrorResponse(error, 'création de test qualité');
  }
}
