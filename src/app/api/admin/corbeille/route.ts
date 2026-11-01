import { NextResponse, type NextRequest } from 'next/server';
import { rejectUnlessPermission } from '@/lib/admin-auth';
import { productionErrorResponse, readJsonBody } from '@/lib/production/api';
import { getRequestActor } from '@/lib/production/api';
import { restoreEntity, type SoftDeletableModel } from '@/lib/soft-delete';

const RESTORABLE_MODELS: SoftDeletableModel[] = [
  'rizerie',
  'lotCoques',
  'produitFini',
  'stock',
  'partner',
  'document',
  'customer',
  'order',
  // 'batchProduction' est intentionnellement absent — restauration bloquée en P1.
];

export async function POST(request: NextRequest) {
  const rejection = rejectUnlessPermission(request, 'trash:manage');
  if (rejection) return rejection;

  try {
    const body = (await readJsonBody(request)) as { model?: unknown; id?: unknown };
    const model = body.model as string;
    const id = body.id as string;

    if (!model || !id) {
      return NextResponse.json({ error: 'Champs « model » et « id » requis.' }, { status: 400 });
    }
    if (!RESTORABLE_MODELS.includes(model as SoftDeletableModel)) {
      return NextResponse.json(
        { error: `Ce type d'élément ne peut pas être restauré via cette route (model: ${model}).` },
        { status: 400 },
      );
    }

    await restoreEntity(model as SoftDeletableModel, id, getRequestActor(request));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return productionErrorResponse(error, 'restauration');
  }
}
