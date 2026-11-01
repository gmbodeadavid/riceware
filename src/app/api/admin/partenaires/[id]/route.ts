import { NextResponse, type NextRequest } from 'next/server';
import { rejectUnlessPermission } from '@/lib/admin-auth';
import { getRequestActor, productionErrorResponse, readJsonBody } from '@/lib/production/api';
import { deletePartner, updatePartner } from '@/lib/production/mutations';
import { parsePartnerInput } from '@/lib/production/validation';

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const rejection = rejectUnlessPermission(request, 'partners:write');
  if (rejection) return rejection;

  try {
    const { id } = await params;
    const input = parsePartnerInput(await readJsonBody(request));
    return NextResponse.json(await updatePartner(id, input, getRequestActor(request)));
  } catch (error) {
    return productionErrorResponse(error, 'mise à jour de partenaire');
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const rejection = rejectUnlessPermission(request, 'partners:write');
  if (rejection) return rejection;

  try {
    const { id } = await params;
    await deletePartner(id, getRequestActor(request));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return productionErrorResponse(error, 'suppression de partenaire');
  }
}
