import { NextResponse, type NextRequest } from 'next/server';
import { rejectUnlessPermission } from '@/lib/admin-auth';
import { getRequestActor, productionErrorResponse, readJsonBody } from '@/lib/production/api';
import { createGoal } from '@/lib/production/mutations';
import { listGoals } from '@/lib/production/queries';
import { parseGoalInput } from '@/lib/production/validation';

export async function GET(request: NextRequest) {
  const rejection = rejectUnlessPermission(request, 'dashboard:view');
  if (rejection) return rejection;

  try {
    return NextResponse.json(await listGoals());
  } catch (error) {
    return productionErrorResponse(error, 'liste des objectifs');
  }
}

export async function POST(request: NextRequest) {
  const rejection = rejectUnlessPermission(request, 'settings:manage');
  if (rejection) return rejection;

  try {
    const input = parseGoalInput(await readJsonBody(request));
    return NextResponse.json(await createGoal(input, getRequestActor(request)), { status: 201 });
  } catch (error) {
    return productionErrorResponse(error, 'création d’objectif');
  }
}
