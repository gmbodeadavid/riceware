import { NextResponse, type NextRequest } from 'next/server';
import { rejectUnlessPermission } from '@/lib/admin-auth';
import { productionErrorResponse } from '@/lib/production/api';
import { getDashboardData } from '@/lib/production/queries';

export async function GET(request: NextRequest) {
  const rejection = rejectUnlessPermission(request, 'dashboard:view');
  if (rejection) return rejection;

  try {
    const data = await getDashboardData();
    return NextResponse.json(data);
  } catch (error) {
    return productionErrorResponse(error, 'tableau de bord');
  }
}
