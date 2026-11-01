import { NextResponse, type NextRequest } from 'next/server';
import { rejectUnlessPermission } from '@/lib/admin-auth';
import { getRequestActor, productionErrorResponse, readJsonBody } from '@/lib/production/api';
import { deleteGoal, updateGoal } from '@/lib/production/mutations';
import { parseGoalInput } from '@/lib/production/validation';

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const rejection = rejectUnlessPermission(request, 'settings:manage');
  if (rejection) return rejection;

  try {
    const { id } = await params;
    const input = parseGoalInput(await readJsonBody(request));
    return NextResponse.json(await updateGoal(id, input, getRequestActor(request)));
  } catch (error) {
    return productionErrorResponse(error, 'mise à jour d’objectif');
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const rejection = rejectUnlessPermission(request, 'settings:manage');
  if (rejection) return rejection;

  try {
    const { id } = await params;
    await deleteGoal(id, getRequestActor(request));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return productionErrorResponse(error, 'suppression d’objectif');
  }
}
