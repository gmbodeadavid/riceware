import { NextResponse, type NextRequest } from 'next/server';
import { createCheckoutOrder } from '@/lib/data/orders';
import type { CheckoutPayload } from '@/lib/data/orders';

/**
 * Public endpoint — no authentication required.
 * Creates an order from a customer checkout payload.
 * Rate limiting / CAPTCHA can be added at the edge (middleware) later.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corps de requête JSON invalide.' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Corps de requête invalide.' }, { status: 400 });
  }

  const payload = body as Partial<CheckoutPayload>;

  // Minimal guard — full validation is done inside createCheckoutOrder
  if (!payload.customer || typeof payload.customer !== 'object') {
    return NextResponse.json({ error: 'Les informations client sont manquantes.' }, { status: 400 });
  }

  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    return NextResponse.json({ error: 'Le panier est vide.' }, { status: 400 });
  }

  try {
    const order = await createCheckoutOrder({
      customer: {
        fullName: String(payload.customer.fullName ?? ''),
        phone: String(payload.customer.phone ?? ''),
        email: payload.customer.email ? String(payload.customer.email) : undefined,
        city: String(payload.customer.city ?? 'Abidjan'),
        district: payload.customer.district ? String(payload.customer.district) : undefined,
        addressDetails: String(payload.customer.addressDetails ?? ''),
        deliveryInstructions: payload.customer.deliveryInstructions
          ? String(payload.customer.deliveryInstructions)
          : undefined,
        channel: 'site',
      },
      paymentPlan: payload.paymentPlan ? String(payload.paymentPlan) : undefined,
      deliveryOption: payload.deliveryOption ? String(payload.deliveryOption) : undefined,
      paymentMethod: payload.paymentMethod ? String(payload.paymentMethod) : undefined,
      items: payload.items.map((item) => ({
        productPackId: String((item as Record<string, unknown>).productPackId ?? ''),
        quantity: Math.min(99, Math.max(1, Number((item as Record<string, unknown>).quantity ?? 1))),
      })),
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      const isClientError =
        error.message.includes('vide') ||
        error.message.includes('obligatoire') ||
        error.message.includes('disponible');
      if (isClientError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    console.error('Erreur création de commande publique :', error);
    return NextResponse.json({ error: 'Erreur serveur. Veuillez réessayer.' }, { status: 500 });
  }
}
