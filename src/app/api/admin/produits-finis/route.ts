import { NextResponse, type NextRequest } from 'next/server';
import { rejectUnlessPermission } from '@/lib/admin-auth';
import { getRequestActor, productionErrorResponse, readJsonBody, searchParam } from '@/lib/production/api';
import { createProduitFini } from '@/lib/production/mutations';
import { listProduitsFinis } from '@/lib/production/queries';
import { parseProduitFiniInput } from '@/lib/production/validation';

export async function GET(request: NextRequest) {
  const rejection = rejectUnlessPermission(request, 'quality:view');
  if (rejection) return rejection;

  try {
    return NextResponse.json(
      await listProduitsFinis({
        status: searchParam(request, 'status'),
        batchId: searchParam(request, 'batchId'),
      }),
    );
  } catch (error) {
    return productionErrorResponse(error, 'liste des produits finis');
  }
}

export async function POST(request: NextRequest) {
  const rejection = rejectUnlessPermission(request, 'quality:write');
  if (rejection) return rejection;

  try {
    const input = parseProduitFiniInput(await readJsonBody(request));
    return NextResponse.json(await createProduitFini(input, getRequestActor(request)), { status: 201 });
  } catch (error) {
    return productionErrorResponse(error, 'création de produit fini');
  }
}
