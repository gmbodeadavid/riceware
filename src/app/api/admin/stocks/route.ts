import { NextResponse, type NextRequest } from 'next/server';
import { rejectUnlessPermission } from '@/lib/admin-auth';
import { getRequestActor, productionErrorResponse, readJsonBody } from '@/lib/production/api';
import { createStock } from '@/lib/production/mutations';
import { listStocks } from '@/lib/production/queries';
import { parseStockInput } from '@/lib/production/validation';

export async function GET(request: NextRequest) {
  const rejection = rejectUnlessPermission(request, 'stocks:view');
  if (rejection) return rejection;

  try {
    return NextResponse.json(await listStocks());
  } catch (error) {
    return productionErrorResponse(error, 'liste des stocks');
  }
}

export async function POST(request: NextRequest) {
  const rejection = rejectUnlessPermission(request, 'stocks:write');
  if (rejection) return rejection;

  try {
    const input = parseStockInput(await readJsonBody(request));
    return NextResponse.json(await createStock(input, getRequestActor(request)), { status: 201 });
  } catch (error) {
    return productionErrorResponse(error, 'création de stock');
  }
}
