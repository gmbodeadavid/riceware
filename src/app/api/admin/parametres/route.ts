import { NextResponse, type NextRequest } from 'next/server';
import { rejectUnlessPermission } from '@/lib/admin-auth';
import { productionErrorResponse, readJsonBody } from '@/lib/production/api';
import { getSettings, saveSettings } from '@/lib/production/settings';
import { parseSettingsInput } from '@/lib/production/validation';
import { recordAudit } from '@/lib/production/audit';
import { getAdminSessionFromRequest } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  const rejection = rejectUnlessPermission(request, 'settings:manage');
  if (rejection) return rejection;

  try {
    return NextResponse.json(await getSettings());
  } catch (error) {
    return productionErrorResponse(error, 'lecture des paramètres');
  }
}

export async function PUT(request: NextRequest) {
  const rejection = rejectUnlessPermission(request, 'settings:manage');
  if (rejection) return rejection;

  try {
    const values = parseSettingsInput(await readJsonBody(request));
    const settings = await saveSettings(values);
    const session = getAdminSessionFromRequest(request);
    await recordAudit({
      userId: session?.userId ?? null,
      actorName: session?.name ?? 'système',
      action: 'update',
      entityType: 'settings',
      details: values,
    });
    return NextResponse.json(settings);
  } catch (error) {
    return productionErrorResponse(error, 'enregistrement des paramètres');
  }
}
