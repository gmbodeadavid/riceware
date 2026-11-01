/**
 * src/lib/traceability.ts
 *
 * P2 — Traçabilité : requêtes et règles métier.
 *
 * Chaîne : Rizerie → LotCoques → BatchMaterialUsage → BatchProduction
 *          → PackLot → OrderLineAllocation → OrderLine → Order → Customer
 */

import { prisma } from '@/lib/db';
import { PackLotStatus } from '@/lib/enums';

// ─── Erreur métier ──────────────────────────────────────────────────────────

export class TraceabilityError extends Error {
  status: number;
  constructor(message: string, options: { status?: number } = {}) {
    super(message);
    this.name = 'TraceabilityError';
    this.status = options.status ?? 400;
  }
}

// ─── Code auto PackLot ──────────────────────────────────────────────────────

export async function nextPackLotCode(date: Date = new Date()): Promise<string> {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const prefix = `PK-${y}${m}${d}-`;

  const last = await prisma.packLot.findFirst({
    where: { code: { startsWith: prefix } },
    orderBy: { code: 'desc' },
    select: { code: true },
  });

  const next = last ? parseInt(last.code.slice(-3), 10) + 1 : 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}

// ─── Étape 4 : Fonctions de requêtes ────────────────────────────────────────

/**
 * Stock restant d'un PackLot = quantity − Σ allocations.
 */
export async function getPackLotStock(packLotId: string): Promise<number> {
  const packLot = await prisma.packLot.findUnique({
    where: { id: packLotId },
    include: { allocations: { select: { quantity: true } } },
  });
  if (!packLot) throw new TraceabilityError('PackLot introuvable.', { status: 404 });
  const allocated = packLot.allocations.reduce((sum, a) => sum + a.quantity, 0);
  return packLot.quantity - allocated;
}

/**
 * traceBackFromOrderLine : remonte de la ligne de commande vers les rizeries.
 * Retourne les parts en kg et en % par rizerie, proportionnelles à kgUsed.
 */
export async function traceBackFromOrderLine(orderLineId: string) {
  const line = await prisma.orderLine.findUnique({
    where: { id: orderLineId },
    include: {
      order: { select: { id: true, orderNumber: true, customer: { select: { fullName: true } } } },
      allocations: {
        include: {
          packLot: {
            include: {
              batch: {
                include: {
                  usages: {
                    include: {
                      lot: {
                        include: {
                          rizerie: { select: { id: true, name: true, location: true } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!line) throw new TraceabilityError('Ligne de commande introuvable.', { status: 404 });

  // Agréger les kgUsed par rizerie
  type RizerieShare = { rizerieId: string; rizerieNom: string; rizerieLocation: string; kgUsed: number | null; estimated: boolean };
  const byRizerie = new Map<string, RizerieShare>();
  let hasEstimated = false;

  for (const alloc of line.allocations) {
    for (const usage of alloc.packLot.batch.usages) {
      const r = usage.lot.rizerie;
      const existing = byRizerie.get(r.id);
      if (usage.estimated) hasEstimated = true;

      if (existing) {
        existing.kgUsed = usage.kgUsed != null && existing.kgUsed != null
          ? existing.kgUsed + usage.kgUsed
          : null;
        if (usage.estimated) existing.estimated = true;
      } else {
        byRizerie.set(r.id, {
          rizerieId: r.id,
          rizerieNom: r.name,
          rizerieLocation: r.location,
          kgUsed: usage.kgUsed,
          estimated: usage.estimated,
        });
      }
    }
  }

  const shares = Array.from(byRizerie.values());
  const totalKg = shares.every((s) => s.kgUsed != null)
    ? shares.reduce((sum, s) => sum + (s.kgUsed ?? 0), 0)
    : null;

  return {
    orderLine: {
      id: line.id,
      packNameSnapshot: line.packNameSnapshot,
      quantity: line.quantity,
      order: line.order,
    },
    allocations: line.allocations.map((a) => ({
      id: a.id,
      packLotId: a.packLotId,
      packLotCode: a.packLot.code,
      quantity: a.quantity,
      batchCode: a.packLot.batch.code,
    })),
    riziereShares: shares.map((s) => ({
      ...s,
      pctKg: totalKg && totalKg > 0 && s.kgUsed != null ? (s.kgUsed / totalKg) * 100 : null,
    })),
    hasEstimated,
    isTracked: line.allocations.length > 0,
  };
}

/**
 * traceForwardFromLot : descend depuis un lot de coques vers les commandes clients.
 * Utilisé pour les rappels produits.
 */
export async function traceForwardFromLot(lotCoquesId: string) {
  const lot = await prisma.lotCoques.findUnique({
    where: { id: lotCoquesId },
    include: {
      rizerie: { select: { id: true, name: true, location: true } },
      usages: {
        include: {
          batch: {
            include: {
              packLots: {
                where: { deletedAt: null },
                include: {
                  pack: { select: { id: true, label: true } },
                  allocations: {
                    include: {
                      orderLine: {
                        include: {
                          order: {
                            select: {
                              id: true,
                              orderNumber: true,
                              status: true,
                              customer: { select: { id: true, fullName: true, phone: true, email: true } },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!lot) throw new TraceabilityError('Lot de coques introuvable.', { status: 404 });

  // Collecter toutes les commandes impactées (dédoublonnées)
  const affectedOrders = new Map<string, { orderId: string; orderNumber: string; status: string; customer: { id: string; fullName: string; phone: string; email: string | null } }>();

  for (const usage of lot.usages) {
    for (const packLot of usage.batch.packLots) {
      for (const alloc of packLot.allocations) {
        const o = alloc.orderLine.order;
        affectedOrders.set(o.id, { orderId: o.id, orderNumber: o.orderNumber, status: o.status, customer: o.customer });
      }
    }
  }

  return {
    lot: { id: lot.id, code: lot.code, netWeightKg: lot.netWeightKg, status: lot.status, rizerie: lot.rizerie },
    batches: lot.usages.map((u) => ({
      usage: { id: u.id, kgUsed: u.kgUsed, estimated: u.estimated },
      batch: { id: u.batch.id, code: u.batch.code },
      packLots: u.batch.packLots.map((pl) => ({
        id: pl.id,
        code: pl.code,
        status: pl.status,
        quantity: pl.quantity,
        pack: pl.pack,
        allocationsCount: pl.allocations.length,
      })),
    })),
    affectedOrders: Array.from(affectedOrders.values()),
  };
}

/**
 * getOriginByRizerie : coques incorporées et packs vendus par rizerie d'origine sur une période.
 */
export async function getOriginByRizerie(period?: { from?: Date; to?: Date }) {
  const batchWhere = period
    ? { startedAt: { gte: period.from, lte: period.to } }
    : undefined;

  const usages = await prisma.batchMaterialUsage.findMany({
    where: {
      batch: batchWhere,
    },
    include: {
      lot: { include: { rizerie: { select: { id: true, name: true } } } },
      batch: {
        include: {
          packLots: {
            where: { deletedAt: null },
            include: { allocations: { select: { quantity: true } } },
          },
        },
      },
    },
  });

  type RizerieStats = { rizerieId: string; rizerieNom: string; kgTotal: number; kgEstimated: boolean; packsSold: number };
  const stats = new Map<string, RizerieStats>();

  for (const u of usages) {
    const r = u.lot.rizerie;
    const existing = stats.get(r.id) ?? { rizerieId: r.id, rizerieNom: r.name, kgTotal: 0, kgEstimated: false, packsSold: 0 };

    existing.kgTotal += u.kgUsed ?? 0;
    if (u.estimated || u.kgUsed == null) existing.kgEstimated = true;

    for (const pl of u.batch.packLots) {
      existing.packsSold += pl.allocations.reduce((s, a) => s + a.quantity, 0);
    }

    stats.set(r.id, existing);
  }

  return Array.from(stats.values()).sort((a, b) => b.kgTotal - a.kgTotal);
}

/**
 * getTraceabilityCoverage : % de lignes de commande livrées avec allocation complète ;
 * % de batches avec consommation de coques enregistrée.
 */
export async function getTraceabilityCoverage(period?: { from?: Date; to?: Date }) {
  const dateFilter = period ? { createdAt: { gte: period.from, lte: period.to } } : undefined;

  const [deliveredLines, batchesInPeriod] = await Promise.all([
    // Lignes de commandes livrées
    prisma.orderLine.findMany({
      where: {
        order: {
          status: 'delivered',
          deletedAt: null,
          ...dateFilter,
        },
      },
      include: {
        allocations: { select: { quantity: true } },
      },
    }),
    // Batches actifs de la période
    prisma.batchProduction.findMany({
      where: {
        deletedAt: null,
        ...(period ? { startedAt: { gte: period.from, lte: period.to } } : {}),
      },
      include: { usages: { select: { id: true, kgUsed: true } } },
    }),
  ]);

  // Couverture des lignes : Σ allocations == quantity
  let linesFullyCovered = 0;
  for (const line of deliveredLines) {
    const totalAllocated = line.allocations.reduce((s, a) => s + a.quantity, 0);
    if (totalAllocated >= line.quantity) linesFullyCovered++;
  }

  // Couverture des batches : a au moins une ligne BatchMaterialUsage
  const batchesWithUsage = batchesInPeriod.filter((b) => b.usages.length > 0).length;

  return {
    lines: {
      total: deliveredLines.length,
      fullyCovered: linesFullyCovered,
      pct: deliveredLines.length > 0 ? (linesFullyCovered / deliveredLines.length) * 100 : 100,
    },
    batches: {
      total: batchesInPeriod.length,
      withUsage: batchesWithUsage,
      pct: batchesInPeriod.length > 0 ? (batchesWithUsage / batchesInPeriod.length) * 100 : 100,
    },
  };
}

// ─── Étape 5 : Règles métier (couche service) ────────────────────────────────

/**
 * Valide qu'un PackLot peut recevoir des allocations :
 * - status doit être "libre"
 * - Σ allocations existantes + quantité demandée ≤ quantity
 */
export async function assertPackLotAllocatable(packLotId: string, requestedQty: number): Promise<void> {
  const packLot = await prisma.packLot.findUnique({
    where: { id: packLotId },
    include: { allocations: { select: { quantity: true } } },
  });
  if (!packLot) throw new TraceabilityError('PackLot introuvable.', { status: 404 });
  if (packLot.deletedAt) throw new TraceabilityError('Ce PackLot a été supprimé.', { status: 409 });
  if (packLot.status !== 'libre') {
    throw new TraceabilityError(
      `Ce PackLot ne peut pas être alloué : statut « ${packLot.status} » (attendu : « libre »).`,
      { status: 409 },
    );
  }
  const allocated = packLot.allocations.reduce((s, a) => s + a.quantity, 0);
  const remaining = packLot.quantity - allocated;
  if (requestedQty > remaining) {
    throw new TraceabilityError(
      `Quantité demandée (${requestedQty}) supérieure au stock disponible du PackLot (${remaining}).`,
      { status: 409 },
    );
  }
}

/**
 * Valide que la consommation de coques d'un batch ne dépasse pas le stock du lot.
 * Vérifie la somme de toutes les usages du lot (incluant le kgUsed du nouveau batch).
 */
export async function assertLotStockSufficient(lotCoquesId: string, kgRequested: number): Promise<void> {
  const lot = await prisma.lotCoques.findUnique({
    where: { id: lotCoquesId },
    include: { usages: { select: { kgUsed: true } } },
  });
  if (!lot) throw new TraceabilityError('Lot introuvable.', { status: 404 });
  if (lot.deletedAt) throw new TraceabilityError('Ce lot a été supprimé.', { status: 409 });

  const alreadyUsed = lot.usages.reduce((s, u) => s + (u.kgUsed ?? 0), 0);
  const available = lot.netWeightKg - alreadyUsed;

  if (kgRequested > available) {
    throw new TraceabilityError(
      `Consommation demandée (${kgRequested} kg) supérieure au stock disponible du lot ${lot.code} (${available} kg restants sur ${lot.netWeightKg} kg).`,
      { status: 409 },
    );
  }
}

// ─── CRUD PackLot ────────────────────────────────────────────────────────────

export type PackLotInput = {
  batchId: string;
  packId: string;
  quantity: number;
  status?: PackLotStatus;
  packedAt?: Date;
  createdById?: string;
};

export async function createPackLot(input: PackLotInput) {
  const code = await nextPackLotCode(input.packedAt ?? new Date());
  return prisma.packLot.create({
    data: {
      code,
      batchId: input.batchId,
      packId: input.packId,
      quantity: input.quantity,
      status: input.status ?? 'quarantaine',
      packedAt: input.packedAt ?? new Date(),
      createdById: input.createdById ?? null,
    },
  });
}

export async function updatePackLotStatus(packLotId: string, status: PackLotStatus) {
  const packLot = await prisma.packLot.findUnique({ where: { id: packLotId } });
  if (!packLot) throw new TraceabilityError('PackLot introuvable.', { status: 404 });
  if (packLot.deletedAt) throw new TraceabilityError('Ce PackLot a été supprimé.', { status: 409 });
  return prisma.packLot.update({ where: { id: packLotId }, data: { status } });
}

// ─── CRUD OrderLineAllocation ────────────────────────────────────────────────

export type AllocationInput = {
  orderLineId: string;
  packLotId: string;
  quantity: number;
  createdById?: string;
};

/**
 * Crée une allocation en appliquant toutes les règles métier.
 */
export async function createAllocation(input: AllocationInput) {
  await assertPackLotAllocatable(input.packLotId, input.quantity);

  // Vérifier que la ligne n'est pas déjà entièrement allouée
  const line = await prisma.orderLine.findUnique({
    where: { id: input.orderLineId },
    include: { allocations: { select: { quantity: true } } },
  });
  if (!line) throw new TraceabilityError('Ligne de commande introuvable.', { status: 404 });

  const alreadyAllocated = line.allocations.reduce((s, a) => s + a.quantity, 0);
  if (alreadyAllocated + input.quantity > line.quantity) {
    throw new TraceabilityError(
      `Allocation (${alreadyAllocated + input.quantity}) dépasserait la quantité commandée (${line.quantity}).`,
      { status: 409 },
    );
  }

  return prisma.orderLineAllocation.create({
    data: {
      orderLineId: input.orderLineId,
      packLotId: input.packLotId,
      quantity: input.quantity,
      createdById: input.createdById ?? null,
    },
  });
}

/**
 * Crée une ligne BatchMaterialUsage en vérifiant les règles (stock du lot).
 */
export async function createBatchMaterialUsage(input: {
  batchId: string;
  lotCoquesId: string;
  kgUsed: number;
}) {
  await assertLotStockSufficient(input.lotCoquesId, input.kgUsed);

  const existing = await prisma.batchMaterialUsage.findUnique({
    where: { batchId_lotCoquesId: { batchId: input.batchId, lotCoquesId: input.lotCoquesId } },
  });
  if (existing) throw new TraceabilityError('Une utilisation de ce lot existe déjà pour ce batch.', { status: 409 });

  return prisma.batchMaterialUsage.create({
    data: {
      batchId: input.batchId,
      lotCoquesId: input.lotCoquesId,
      kgUsed: input.kgUsed,
      estimated: false,
    },
  });
}
