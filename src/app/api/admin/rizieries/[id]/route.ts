import { NextResponse, type NextRequest } from 'next/server';
import { rejectUnlessPermission } from '@/lib/admin-auth';
import { getRequestActor, productionErrorResponse, readJsonBody } from '@/lib/production/api';
import { deleteRizerie, updateRizerie } from '@/lib/production/mutations';
import { getRizerie } from '@/lib/production/queries';
import { parseRizerieInput } from '@/lib/production/validation';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  const rejection = rejectUnlessPermission(request, 'lots:view');
  if (rejection) return rejection;

  try {
    const { id } = await params;
    const rizerie = await getRizerie(id);
    if (!rizerie) return NextResponse.json({ error: 'Rizerie introuvable.' }, { status: 404 });
    return NextResponse.json(rizerie);
  } catch (error) {
    return productionErrorResponse(error, 'lecture de rizerie');
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const rejection = rejectUnlessPermission(request, 'partners:write');
  if (rejection) return rejection;

  try {
    const { id } = await params;
    const input = parseRizerieInput(await readJsonBody(request));
    return NextResponse.json(await updateRizerie(id, input, getRequestActor(request)));
  } catch (error) {
    return productionErrorResponse(error, 'mise à jour de rizerie');
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const rejection = rejectUnlessPermission(request, 'partners:write');
  if (rejection) return rejection;

  try {
    const { id } = await params;
    await deleteRizerie(id, getRequestActor(request));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return productionErrorResponse(error, 'suppression de rizerie');
  }
}
