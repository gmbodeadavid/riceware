import { NextResponse, type NextRequest } from 'next/server';
import { rejectUnlessPermission } from '@/lib/admin-auth';
import { getRequestActor, productionErrorResponse, readJsonBody, searchParam } from '@/lib/production/api';
import { createDocument } from '@/lib/production/mutations';
import { listDocuments } from '@/lib/production/queries';
import { parseDocumentInput } from '@/lib/production/validation';

export async function GET(request: NextRequest) {
  const rejection = rejectUnlessPermission(request, 'documents:view');
  if (rejection) return rejection;

  try {
    return NextResponse.json(await listDocuments({ category: searchParam(request, 'category') }));
  } catch (error) {
    return productionErrorResponse(error, 'liste des documents');
  }
}

export async function POST(request: NextRequest) {
  const rejection = rejectUnlessPermission(request, 'documents:write');
  if (rejection) return rejection;

  try {
    const input = parseDocumentInput(await readJsonBody(request));
    return NextResponse.json(await createDocument(input, getRequestActor(request)), { status: 201 });
  } catch (error) {
    return productionErrorResponse(error, 'création de document');
  }
}
