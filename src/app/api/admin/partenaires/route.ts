import { NextResponse, type NextRequest } from 'next/server';
import { rejectUnlessPermission } from '@/lib/admin-auth';
import { getRequestActor, productionErrorResponse, readJsonBody, searchParam } from '@/lib/production/api';
import { createPartner } from '@/lib/production/mutations';
import { listPartners } from '@/lib/production/queries';
import { parsePartnerInput } from '@/lib/production/validation';

export async function GET(request: NextRequest) {
  const rejection = rejectUnlessPermission(request, 'partners:view');
  if (rejection) return rejection;

  try {
    return NextResponse.json(
      await listPartners({ type: searchParam(request, 'type'), search: searchParam(request, 'q') }),
    );
  } catch (error) {
    return productionErrorResponse(error, 'liste des partenaires');
  }
}

export async function POST(request: NextRequest) {
  const rejection = rejectUnlessPermission(request, 'partners:write');
  if (rejection) return rejection;

  try {
    const input = parsePartnerInput(await readJsonBody(request));
    return NextResponse.json(await createPartner(input, getRequestActor(request)), { status: 201 });
  } catch (error) {
    return productionErrorResponse(error, 'création de partenaire');
  }
}
