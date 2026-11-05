import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getLotByCode } from '@/lib/production/queries';
import { computeRejectRate, computeYield, labelOf, LOT_STATUSES, LOT_VISUAL_QUALITIES, PRODUCT_TYPES } from '@/lib/production/types';
import { PACK_LOT_STATUSES } from '@/lib/enums';

type RouteContext = { params: Promise<{ code: string }> };

/** Fiche publique de traçabilité consultable via un code lot ou un code PackLot. */
export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { code } = await params;
    const decoded = decodeURIComponent(code);

    // Essayer d'abord un code PackLot (PK-AAAAMMJJ-NNN)
    if (decoded.startsWith('PK-')) {
      return handlePackLotCode(decoded);
    }

    // Sinon essayer un lot de coques
    const lot = await getLotByCode(decoded);
    if (lot) return handleLotCode(lot);

    // Code inconnu — message neutre sans fuite d'information
    return NextResponse.json({ error: 'Code introuvable.' }, { status: 404 });
  } catch (error) {
    console.error('API traçabilité publique :', error);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

async function handleLotCode(lot: Awaited<ReturnType<typeof getLotByCode>>) {
  if (!lot) return NextResponse.json({ error: 'Code introuvable.' }, { status: 404 });

  return NextResponse.json({
    type: 'lot',
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
}

async function handlePackLotCode(code: string) {
  const packLot = await prisma.packLot.findUnique({
    where: { code },
    include: {
      pack: {
        include: {
          product: { select: { name: true, category: true } },
        },
      },
      batch: {
        include: {
          tests: {
            where: { result: 'succes' },
            select: { typeTest: true, testedAt: true, result: true },
            take: 1,
          },
          usages: {
            where: { deletedAt: null },
            include: {
              lot: {
                include: {
                  rizerie: { select: { name: true, location: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!packLot || packLot.deletedAt) {
    return NextResponse.json({ error: 'Code introuvable.' }, { status: 404 });
  }

  // Calculer les parts par rizerie (basé sur kgUsed)
  const totalKg = packLot.batch.usages.reduce((s, u) => s + (u.kgUsed ?? 0), 0);
  const rizeries = packLot.batch.usages.map((u) => ({
    name: u.lot.rizerie.name,
    location: u.lot.rizerie.location,
    lotCode: u.lot.code,
    pctKg: totalKg > 0 && u.kgUsed != null ? Math.round((u.kgUsed / totalKg) * 100) : null,
    kgUnknown: u.kgUsed == null,
  }));

  const qualityOk = packLot.batch.tests.length > 0;

  // Réponse publique — JAMAIS de clients, prix de revient, contacts
  return NextResponse.json({
    type: 'packLot',
    code: packLot.code,
    product: {
      name: packLot.pack.product.name,
      category: packLot.pack.product.category,
      pack: packLot.pack.label,
      packQuantity: packLot.pack.quantity,
    },
    packedAt: packLot.packedAt,
    status: packLot.status,
    statusLabel: labelOf(PACK_LOT_STATUSES, packLot.status as 'quarantaine' | 'libre' | 'rappel' | 'epuise'),
    batch: {
      code: packLot.batch.code,
      startedAt: packLot.batch.startedAt,
    },
    origins: rizeries,
    qualityControl: {
      passed: qualityOk,
      label: qualityOk ? 'Contrôle qualité conforme' : 'Contrôle qualité non enregistré',
    },
  });
}
