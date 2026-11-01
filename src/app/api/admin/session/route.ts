import { NextResponse, type NextRequest } from 'next/server';
import { getAdminSessionFromRequest } from '@/lib/admin-auth';
import { ROLE_LABELS, ROLE_PERMISSIONS } from '@/lib/rbac';

export async function GET(request: NextRequest) {
  const session = getAdminSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Session expirée, reconnectez-vous.' }, { status: 401 });
  }

  return NextResponse.json({
    ...session,
    roleLabel: ROLE_LABELS[session.role],
    permissions: ROLE_PERMISSIONS[session.role],
  });
}
