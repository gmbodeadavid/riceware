import { NextResponse, type NextRequest } from 'next/server';
import { rejectUnlessPermission } from '@/lib/admin-auth';
import { productionErrorResponse } from '@/lib/production/api';
import { markAllNotificationsRead, markNotificationRead } from '@/lib/production/mutations';
import { listNotifications } from '@/lib/production/queries';
import { getRequestActor } from '@/lib/production/api';
import { createTestNotification } from '@/lib/production/mutations';
import { readJsonBody } from '@/lib/production/api';

export async function GET(request: NextRequest) {
  const rejection = rejectUnlessPermission(request, 'dashboard:view');
  if (rejection) return rejection;

  try {
    return NextResponse.json(
      await listNotifications({ unreadOnly: request.nextUrl.searchParams.get('unread') === '1' }),
    );
  } catch (error) {
    return productionErrorResponse(error, 'liste des notifications');
  }
}

export async function PATCH(request: NextRequest) {
  const rejection = rejectUnlessPermission(request, 'dashboard:view');
  if (rejection) return rejection;

  try {
    const body = (await readJsonBody(request)) as { id?: string; all?: boolean; test?: string };
    if (body.test) {
      return NextResponse.json(await createTestNotification(body.test, getRequestActor(request)));
    }
    if (body.all) {
      await markAllNotificationsRead();
      return NextResponse.json({ ok: true });
    }
    if (!body.id) {
      return NextResponse.json({ error: 'Identifiant de notification requis.' }, { status: 400 });
    }
    return NextResponse.json(await markNotificationRead(body.id));
  } catch (error) {
    return productionErrorResponse(error, 'mise à jour des notifications');
  }
}
