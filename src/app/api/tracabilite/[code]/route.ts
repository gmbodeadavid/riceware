import { NextResponse } from 'next/server';
import { getLotByCode } from '@/lib/production/queries';
import { computeRejectRate, computeYield, labelOf, LOT_STATUSES, LOT_VISUAL_QUALITIES, PRODUCT_TYPES } from '@/lib/production/types';

type RouteContext = { params: Promise<{ code: string }> };

/** Fiche publique de traçabilité consultable via l’ID unique du lot. */
export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { code } = await params;
    const lot = await getLotByCode(decodeURIComponent(code));
    if (!lot) return NextResponse.json({ error: 'Lot introuvable.' }, { status: 404 });

    return NextResponse.json({
      code: lot.code,
      receivedAt: lot.receivedAt,
      origin: {
        name: lot.rizerie.name,
        location: lot.rizerie.location,
        contractType: lot.rizerie.contractType,
      },
      weights: {
        grossKg: lot.grossWeightKg,
        tareKg: lot.tareWeightKg,
        netKg: lot.netWeightKg,
      },
      humidityPct: lot.humidityPct,
      visualQuality: lot.visualQuality,
      visualQualityLabel: labelOf(LOT_VISUAL_QUALITIES, lot.visualQuality),
      status: lot.status,
      statusLabel: labelOf(LOT_STATUSES, lot.status),
      batches: lot.batches.map((batch) => ({
        code: batch.code,
        startedAt: batch.startedAt,
        piecesProduced: batch.piecesProduced,
        rejects: batch.rejects,
        yieldPct: computeYield(batch.piecesProduced, batch.rejects),
        rejectRatePct: computeRejectRate(batch.piecesProduced, batch.rejects),
        productTypes: [...new Set(batch.products.map((product) => labelOf(PRODUCT_TYPES, product.type)))],
      })),
    });
  } catch (error) {
    console.error('API traçabilité publique :', error);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
