import { NextResponse, type NextRequest } from 'next/server';
import { rejectUnlessPermission } from '@/lib/admin-auth';
import { getRequestActor, productionErrorResponse, readJsonBody } from '@/lib/production/api';
import { deleteUser, updateUser } from '@/lib/production/mutations';
import { parseUserInput } from '@/lib/production/validation';

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const rejection = rejectUnlessPermission(request, 'users:manage');
  if (rejection) return rejection;

  try {
    const { id } = await params;
    const input = parseUserInput(await readJsonBody(request), { requirePassword: false });
    return NextResponse.json(await updateUser(id, input, getRequestActor(request)));
  } catch (error) {
    return productionErrorResponse(error, 'mise à jour d’utilisateur');
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const rejection = rejectUnlessPermission(request, 'users:manage');
  if (rejection) return rejection;

  try {
    const { id } = await params;
    await deleteUser(id, getRequestActor(request));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return productionErrorResponse(error, 'suppression d’utilisateur');
  }
}
