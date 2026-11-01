import { NextResponse, type NextRequest } from 'next/server';
import { rejectUnlessPermission } from '@/lib/admin-auth';
import { getRequestActor, productionErrorResponse, readJsonBody } from '@/lib/production/api';
import { createUser } from '@/lib/production/mutations';
import { listUsers } from '@/lib/production/queries';
import { parseUserInput } from '@/lib/production/validation';

export async function GET(request: NextRequest) {
  const rejection = rejectUnlessPermission(request, 'users:manage');
  if (rejection) return rejection;

  try {
    return NextResponse.json(await listUsers());
  } catch (error) {
    return productionErrorResponse(error, 'liste des utilisateurs');
  }
}

export async function POST(request: NextRequest) {
  const rejection = rejectUnlessPermission(request, 'users:manage');
  if (rejection) return rejection;

  try {
    const input = parseUserInput(await readJsonBody(request), { requirePassword: true });
    return NextResponse.json(await createUser(input, getRequestActor(request)), { status: 201 });
  } catch (error) {
    return productionErrorResponse(error, 'création d’utilisateur');
  }
}
