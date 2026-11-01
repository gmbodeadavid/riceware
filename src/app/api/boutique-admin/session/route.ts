import { NextResponse, type NextRequest } from 'next/server';
import { getAdminSessionFromRequest } from '@/lib/admin-auth';
import { can, ROLE_LABELS, ROLE_PERMISSIONS } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = getAdminSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  const permissions = ROLE_PERMISSIONS[session.role] ?? [];

  return NextResponse.json({
    name: session.name,
    email: session.email,
    role: session.role,
    roleLabel: ROLE_LABELS[session.role],
    permissions,
    canManageCatalog: can(session.role, 'catalog:manage'),
    canViewOrders: can(session.role, 'orders:view'),
  });
}
