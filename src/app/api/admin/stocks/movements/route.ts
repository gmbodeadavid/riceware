import { NextResponse, type NextRequest } from 'next/server';
import { rejectUnlessPermission } from '@/lib/admin-auth';
import { getRequestActor, productionErrorResponse, readJsonBody } from '@/lib/production/api';
import { createStockMovement } from '@/lib/production/mutations';
import { listStockMovements } from '@/lib/production/queries';
import { parseStockMovementInput } from '@/lib/production/validation';

export async function GET(request: NextRequest) {
  const rejection = rejectUnlessPermission(request, 'stocks:view');
  if (rejection) return rejection;

  try {
    return NextResponse.json(await listStockMovements());
  } catch (error) {
    return productionErrorResponse(error, 'liste des mouvements de stock');
  }
}

export async function POST(request: NextRequest) {
  const rejection = rejectUnlessPermission(request, 'stocks:write');
  if (rejection) return rejection;

  try {
    const input = parseStockMovementInput(await readJsonBody(request));
    return NextResponse.json(await createStockMovement(input, getRequestActor(request)), { status: 201 });
  } catch (error) {
    return productionErrorResponse(error, 'mouvement de stock');
  }
}
