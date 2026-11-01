// Puppeteer requires the Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse, type NextRequest } from 'next/server';
import { rejectUnlessPermission } from '@/lib/admin-auth';
import { productionErrorResponse } from '@/lib/production/api';
import { getOrderById } from '@/lib/data/orders';
import { buildInvoiceHtml } from '@/lib/invoices/invoiceHtml';
import { htmlToPdf } from '@/lib/invoices/renderPdf';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  const rejection = rejectUnlessPermission(request, 'orders:view');
  if (rejection) return rejection;

  try {
    const { id } = await params;
    const order = await getOrderById(id);

    if (!order) {
      return NextResponse.json({ error: 'Commande introuvable.' }, { status: 404 });
    }

    if (order.status !== 'delivered') {
      return NextResponse.json(
        { error: "La facture n'est disponible que pour les commandes livrées." },
        { status: 403 },
      );
    }

    const html   = buildInvoiceHtml(order);
    const buffer = await htmlToPdf(html);
    const filename = `facture-${order.orderNumber}.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length':      String(buffer.byteLength),
        'Cache-Control':       'no-store',
      },
    });
  } catch (error) {
    return productionErrorResponse(error, 'génération facture PDF');
  }
}
