import { NextResponse } from 'next/server';
import { getPublicOrderByNumber } from '@/lib/data/orders';

type RouteContext = { params: Promise<{ number: string }> };

/**
 * Public endpoint — no authentication required.
 * Returns a minimal public summary for an order number,
 * so the confirmation page can display it even if localStorage was cleared.
 */
export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { number } = await params;
    const order = await getPublicOrderByNumber(decodeURIComponent(number));
    if (!order) {
      return NextResponse.json({ error: 'Commande introuvable.' }, { status: 404 });
    }
    return NextResponse.json(order);
  } catch (error) {
    console.error('Erreur récupération commande publique :', error);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
