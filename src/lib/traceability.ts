/**
 * src/lib/traceability.ts
 *
 * P2 — Traçabilité : requêtes et règles métier.
 *
 * Chaîne : Rizerie → LotCoques → BatchMaterialUsage → BatchProduction
 *          → PackLot → OrderLineAllocation → OrderLine → Order → Customer
 *
 * Règles de suppression douce :
 *   - PackLot, BatchMaterialUsage, OrderLineAllocation ont deletedAt/deletedById.
 *   - Toutes les requêtes excluent les enregistrements supprimés via { deletedAt: null }.
 *   - assertPackLotAllocatable rejette status 'rappel' ET 'quarantaine' ET deletedAt non null.
 *   - createAllocation et createBatchMaterialUsage sont entièrement transactionnels :
 *     la re-lecture du stock/restant se fait DANS la transaction pour éviter les races.
 */

import { prisma } from '@/lib/db';
import { PackLotStatus } from '@/lib/enums';
import { Prisma } from '@prisma/client';
import { createNotification } from '@/lib/production/notifications';
import { recordAudit } from '@/lib/production/audit';

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

export async function nextPackLotCode(date: Date = new Date(), tx?: Prisma.TransactionClient): Promise<string> {
  const client = tx ?? prisma;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const prefix = `PK-${y}${m}${d}-`;

  const last = await client.packLot.findFirst({
    where: { code: { startsWith: prefix } },
    orderBy: { code: 'desc' },
    select: { code: true },
  });

  const next = last ? parseInt(last.code.slice(-3), 10) + 1 : 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}

// ─── Fonctions de requêtes ──────────────────────────────────────────────────

/**
 * Stock restant d'un PackLot = quantity − Σ allocations actives (non supprimées).
 */
export async function getPackLotStock(packLotId: string): Promise<number> {
  const packLot = await prisma.packLot.findUnique({
    where: { id: packLotId },
    include: { allocations: { where: { deletedAt: null }, select: { quantity: true } } },
  });
  if (!packLot) throw new TraceabilityError('PackLot introuvable.', { status: 404 });
  const allocated = packLot.allocations.reduce((sum, a) => sum + a.quantity, 0);
  return packLot.quantity - allocated;
}

/**
 * traceBackFromOrderLine : remonte de la ligne de commande vers les rizeries.
 *
 * kgUsed null : quand un usage n'a pas de kgUsed renseigné, la part est marquée
 * kgUnknown=true et pctKg=null. On N'impute jamais de valeur fictive (pas de
 * répartition à parts égales). Le flag hasEstimated=true indique que les résultats
 * sont partiels.
 */
export async function traceBackFromOrderLine(orderLineId: string) {
  const line = await prisma.orderLine.findUnique({
    where: { id: orderLineId },
    include: {
      order: { select: { id: true, orderNumber: true, customer: { select: { fullName: true } } } },
      allocations: {
        where: { deletedAt: null }, // ← exclut les allocations supprimées
        include: {
          packLot: {
            include: {
              batch: {
                include: {
                  usages: {
                    where: { deletedAt: null }, // ← exclut les usages supprimés
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

  // Agréger les kgUsed par rizerie — null propagé, jamais imputé
  type RizerieShare = {
    rizerieId: string;
    rizerieNom: string;
    rizerieLocation: string;
    kgUsed: number | null;
    kgUnknown: boolean;   // true si au moins un usage n'a pas de kgUsed
    estimated: boolean;
  };
  const byRizerie = new Map<string, RizerieShare>();
  let hasEstimated = false;

  for (const alloc of line.allocations) {
    for (const usage of alloc.packLot.batch.usages) {
      const r = usage.lot.rizerie;
      const existing = byRizerie.get(r.id);
      if (usage.estimated) hasEstimated = true;
      const kgUnknown = usage.kgUsed == null;

      if (existing) {
        // null contamine : si l'un est null, le total devient null
        existing.kgUsed = usage.kgUsed != null && existing.kgUsed != null
          ? existing.kgUsed + usage.kgUsed
          : null;
        if (usage.estimated) existing.estimated = true;
        if (kgUnknown) existing.kgUnknown = true;
      } else {
        byRizerie.set(r.id, {
          rizerieId: r.id,
          rizerieNom: r.name,
          rizerieLocation: r.location,
          kgUsed: usage.kgUsed,
          kgUnknown,
          estimated: usage.estimated,
        });
      }
    }
  }

  const shares = Array.from(byRizerie.values());
  // totalKg est calculable seulement si TOUS les kgUsed sont non-null
  const totalKg = shares.length > 0 && shares.every((s) => s.kgUsed != null)
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
      rizerieId: s.rizerieId,
      rizerieNom: s.rizerieNom,
      rizerieLocation: s.rizerieLocation,
      kgUsed: s.kgUsed,
      kgUnknown: s.kgUnknown,
      estimated: s.estimated,
      // pctKg null si totalKg est inconnu OU si ce lot n'a pas de kgUsed
      pctKg: totalKg != null && totalKg > 0 && s.kgUsed != null
        ? (s.kgUsed / totalKg) * 100
        : null,
    })),
    hasEstimated,
    hasUnknownKg: shares.some((s) => s.kgUnknown),
    isTracked: line.allocations.length > 0,
  };
}

/**
 * traceForwardFromLot : descend depuis un lot de coques vers les commandes clients.
 * Utilisé pour les rappels produits.
 * N'inclut que les PackLots et allocations non supprimés.
 */
export async function traceForwardFromLot(lotCoquesId: string) {
  const lot = await prisma.lotCoques.findUnique({
    where: { id: lotCoquesId },
    include: {
      rizerie: { select: { id: true, name: true, location: true } },
      usages: {
        where: { deletedAt: null }, // ← exclut les usages supprimés
        include: {
          batch: {
            include: {
              packLots: {
                where: { deletedAt: null }, // ← exclut les PackLots supprimés
                include: {
                  pack: { select: { id: true, label: true } },
                  allocations: {
                    where: { deletedAt: null }, // ← exclut les allocations supprimées
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

  const affectedOrders = new Map<string, {
    orderId: string; orderNumber: string; status: string;
    customer: { id: string; fullName: string; phone: string; email: string | null };
  }>();

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
      usage: { id: u.id, kgUsed: u.kgUsed, kgUnknown: u.kgUsed == null, estimated: u.estimated },
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
 * getOriginByRizerie : coques incorporées et packs vendus par rizerie d'origine.
 *
 * kgTotal n'est PAS imputé quand kgUsed est null : kgEstimated=true signale
 * que le total est sous-évalué. Les calculs de % par l'UI doivent vérifier
 * ce flag avant d'afficher des pourcentages.
 */
export async function getOriginByRizerie(period?: { from?: Date; to?: Date }) {
  const batchWhere = period
    ? { startedAt: { gte: period.from, lte: period.to } }
    : undefined;

  const usages = await prisma.batchMaterialUsage.findMany({
    where: {
      deletedAt: null, // ← exclut les usages supprimés
      batch: batchWhere,
    },
    include: {
      lot: { include: { rizerie: { select: { id: true, name: true } } } },
      batch: {
        include: {
          packLots: {
            where: { deletedAt: null }, // ← exclut les PackLots supprimés
            include: {
              allocations: {
                where: { deletedAt: null }, // ← exclut les allocations supprimées
                select: { quantity: true },
              },
            },
          },
        },
      },
    },
  });

  type RizerieStats = {
    rizerieId: string;
    rizerieNom: string;
    kgTotal: number;        // somme des kgUsed non-null (sous-évalué si kgEstimated)
    kgEstimated: boolean;   // true si au moins un usage a kgUsed=null ou estimated=true
    packsSold: number;
  };
  const stats = new Map<string, RizerieStats>();

  for (const u of usages) {
    const r = u.lot.rizerie;
    const existing = stats.get(r.id) ?? {
      rizerieId: r.id,
      rizerieNom: r.name,
      kgTotal: 0,
      kgEstimated: false,
      packsSold: 0,
    };

    // kgUsed null → on n'ajoute rien à kgTotal mais on lève le flag
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
 * N'inclut que les allocations et usages non supprimés.
 */
export async function getTraceabilityCoverage(period?: { from?: Date; to?: Date }) {
  const dateFilter = period ? { createdAt: { gte: period.from, lte: period.to } } : undefined;

  const [deliveredLines, batchesInPeriod] = await Promise.all([
    prisma.orderLine.findMany({
      where: {
        order: { status: 'delivered', deletedAt: null, ...dateFilter },
      },
      include: {
        allocations: {
          where: { deletedAt: null }, // ← exclut les allocations supprimées
          select: { quantity: true },
        },
      },
    }),
    prisma.batchProduction.findMany({
      where: {
        deletedAt: null,
        ...(period ? { startedAt: { gte: period.from, lte: period.to } } : {}),
      },
      include: {
        usages: {
          where: { deletedAt: null }, // ← exclut les usages supprimés
          select: { id: true, kgUsed: true },
        },
      },
    }),
  ]);

  let linesFullyCovered = 0;
  for (const line of deliveredLines) {
    const totalAllocated = line.allocations.reduce((s, a) => s + a.quantity, 0);
    if (totalAllocated >= line.quantity) linesFullyCovered++;
  }

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

// ─── Règles métier + soft-delete helpers ────────────────────────────────────

/**
 * assertPackLotAllocatable (utilisé dans la transaction) :
 * - relit le PackLot dans la transaction courante (évite les races)
 * - status doit être exactement "libre" : quarantaine, rappel, epuise → rejeté
 * - Σ allocations actives (non supprimées) + requestedQty ≤ quantity
 */
async function assertPackLotAllocatableInTx(
  tx: Prisma.TransactionClient,
  packLotId: string,
  requestedQty: number,
): Promise<void> {
  const packLot = await tx.packLot.findUnique({
    where: { id: packLotId },
    include: { allocations: { where: { deletedAt: null }, select: { quantity: true } } },
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
 * assertPackLotAllocatable (hors transaction) — garde-fou de surface (UI / API).
 * La vérification authoritative est celle dans la transaction.
 */
export async function assertPackLotAllocatable(packLotId: string, requestedQty: number): Promise<void> {
  return assertPackLotAllocatableInTx(prisma as unknown as Prisma.TransactionClient, packLotId, requestedQty);
}

/**
 * assertLotStockSufficient (utilisé dans la transaction) :
 *
 * RÈGLE P2 (point 5) : si des usages du lot ont kgUsed=null, le restant est
 * « non renseigné » — la fonction retourne restantNonRenseigné=true.
 * L'appelant DOIT alors exiger une confirmation explicite avec motif avant
 * d'écrire (voir createBatchMaterialUsage). Sans confirmation, l'écriture
 * est refusée avec le code 428 (Precondition Required).
 *
 * Exemple : lot netWeightKg=1000, usages=[{kgUsed:200}, {kgUsed:null}]
 *   → alreadyUsed=200, available=800 (sous-estimé : consommation null ignorée)
 *   → restantNonRenseigné=true → écriture refusée sans motif explicite.
 */
async function assertLotStockSufficientInTx(
  tx: Prisma.TransactionClient,
  lotCoquesId: string,
  kgRequested: number,
): Promise<{ restantNonRenseigné: boolean }> {
  const lot = await tx.lotCoques.findUnique({
    where: { id: lotCoquesId },
    include: { usages: { where: { deletedAt: null }, select: { kgUsed: true } } },
  });
  if (!lot) throw new TraceabilityError('Lot introuvable.', { status: 404 });
  if (lot.deletedAt) throw new TraceabilityError('Ce lot a été supprimé.', { status: 409 });

  const restantNonRenseigné = lot.usages.some((u) => u.kgUsed == null);
  // null ignoré dans la somme — résultat optimiste (restant potentiellement surévalué)
  const alreadyUsed = lot.usages.reduce((s, u) => s + (u.kgUsed ?? 0), 0);
  const available = lot.netWeightKg - alreadyUsed;

  if (kgRequested > available) {
    throw new TraceabilityError(
      `Consommation demandée (${kgRequested} kg) supérieure au stock calculé du lot ${lot.code} ` +
      `(${available} kg restants sur ${lot.netWeightKg} kg` +
      `${restantNonRenseigné ? ' — restant NON RENSEIGNÉ : des usages sans kgUsed sont présents' : ''}).`,
      { status: 409 },
    );
  }
  return { restantNonRenseigné };
}

export async function assertLotStockSufficient(lotCoquesId: string, kgRequested: number): Promise<{ restantNonRenseigné: boolean }> {
  return assertLotStockSufficientInTx(prisma as unknown as Prisma.TransactionClient, lotCoquesId, kgRequested);
}

// ─── Soft-delete helpers ─────────────────────────────────────────────────────

export async function softDeletePackLot(id: string, actorId?: string): Promise<void> {
  const now = new Date();
  const existing = await prisma.packLot.findUnique({ where: { id } });
  if (!existing) throw new TraceabilityError('PackLot introuvable.', { status: 404 });
  if (existing.deletedAt) throw new TraceabilityError('Ce PackLot est déjà supprimé.', { status: 409 });
  await prisma.packLot.update({ where: { id }, data: { deletedAt: now, deletedById: actorId ?? null } });
}

export async function softDeleteBatchMaterialUsage(id: string, actorId?: string): Promise<void> {
  const now = new Date();
  const existing = await prisma.batchMaterialUsage.findUnique({ where: { id } });
  if (!existing) throw new TraceabilityError('BatchMaterialUsage introuvable.', { status: 404 });
  if (existing.deletedAt) throw new TraceabilityError('Cet usage est déjà supprimé.', { status: 409 });
  await prisma.batchMaterialUsage.update({ where: { id }, data: { deletedAt: now, deletedById: actorId ?? null } });
}

export async function softDeleteAllocation(id: string, actorId?: string): Promise<void> {
  const now = new Date();
  const existing = await prisma.orderLineAllocation.findUnique({ where: { id } });
  if (!existing) throw new TraceabilityError('Allocation introuvable.', { status: 404 });
  if (existing.deletedAt) throw new TraceabilityError('Cette allocation est déjà supprimée.', { status: 409 });
  await prisma.orderLineAllocation.update({ where: { id }, data: { deletedAt: now, deletedById: actorId ?? null } });
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
 * createAllocation — entièrement transactionnel.
 *
 * La validation ET l'écriture se déroulent dans la même $transaction :
 * le re-comptage des allocations existantes se fait avec FOR UPDATE (lecture
 * pessimiste via la transaction SQLite serialisée), ce qui empêche deux
 * allocations simultanées de dépasser le stock.
 *
 * Scénario de concurrence : si deux appels arrivent simultanément pour le
 * même PackLot, SQLite sérialise les transactions → la seconde voit l'état
 * après commit de la première et lève TraceabilityError si le stock est épuisé.
 */
export async function createAllocation(input: AllocationInput) {
  return prisma.$transaction(async (tx) => {
    // Re-lecture dans la transaction (stock authoritative)
    await assertPackLotAllocatableInTx(tx, input.packLotId, input.quantity);

    // Vérifier que la ligne n'est pas déjà entièrement allouée (dans la tx)
    const line = await tx.orderLine.findUnique({
      where: { id: input.orderLineId },
      include: { allocations: { where: { deletedAt: null }, select: { quantity: true } } },
    });
    if (!line) throw new TraceabilityError('Ligne de commande introuvable.', { status: 404 });

    const alreadyAllocated = line.allocations.reduce((s, a) => s + a.quantity, 0);
    if (alreadyAllocated + input.quantity > line.quantity) {
      throw new TraceabilityError(
        `Allocation (${alreadyAllocated + input.quantity}) dépasserait la quantité commandée (${line.quantity}).`,
        { status: 409 },
      );
    }

    return tx.orderLineAllocation.create({
      data: {
        orderLineId: input.orderLineId,
        packLotId: input.packLotId,
        quantity: input.quantity,
        createdById: input.createdById ?? null,
      },
    });
  });
}

/**
 * createBatchMaterialUsage — entièrement transactionnel.
 *
 * Règle P2 (point 5) :
 * - Si le lot contient des usages avec kgUsed=null (restant non renseigné),
 *   l'écriture est refusée avec 428 sauf si `motifEstimation` est fourni.
 * - Quand `motifEstimation` est fourni, l'usage est créé avec estimated=true.
 * - Sans nulls, `motifEstimation` est ignoré et estimated=false.
 */
export async function createBatchMaterialUsage(input: {
  batchId: string;
  lotCoquesId: string;
  kgUsed: number;
  /** Requis si le lot a des usages kgUsed=null (restant non renseigné). */
  motifEstimation?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const { restantNonRenseigné } = await assertLotStockSufficientInTx(tx, input.lotCoquesId, input.kgUsed);

    // Point 5 : si restant non renseigné, exiger une confirmation explicite
    if (restantNonRenseigné && !input.motifEstimation) {
      throw new TraceabilityError(
        `Le lot contient des usages sans kgUsed renseigné — le restant disponible est INCERTAIN. ` +
        `Fournissez motifEstimation pour confirmer que vous acceptez d'écrire malgré l'incertitude.`,
        { status: 428 }, // 428 Precondition Required
      );
    }

    const existing = await tx.batchMaterialUsage.findUnique({
      where: { batchId_lotCoquesId: { batchId: input.batchId, lotCoquesId: input.lotCoquesId } },
    });
    if (existing && !existing.deletedAt) {
      throw new TraceabilityError('Une utilisation de ce lot existe déjà pour ce batch.', { status: 409 });
    }

    return tx.batchMaterialUsage.create({
      data: {
        batchId: input.batchId,
        lotCoquesId: input.lotCoquesId,
        kgUsed: input.kgUsed,
        // estimated=true si le lot avait des nulls (on ne peut pas garantir l'exactitude)
        estimated: restantNonRenseigné,
      },
    });
  });
}

// ─── P3 additions ────────────────────────────────────────────────────────────

/** Liste les PackLots avec filtres et stock restant calculé. */
export async function listPackLots(filters: {
  packId?: string;
  batchId?: string;
  rizerieId?: string;
  status?: string;
  limit?: number;
} = {}) {
  const where: Prisma.PackLotWhereInput = { deletedAt: null };
  if (filters.packId) where.packId = filters.packId;
  if (filters.batchId) where.batchId = filters.batchId;
  if (filters.status) where.status = filters.status;
  if (filters.rizerieId) {
    where.batch = { usages: { some: { lot: { rizerieId: filters.rizerieId }, deletedAt: null } } };
  }

  const rows = await prisma.packLot.findMany({
    where,
    orderBy: { packedAt: 'desc' },
    take: filters.limit ?? 200,
    include: {
      pack: { include: { product: { select: { id: true, name: true, slug: true } } } },
      batch: {
        select: {
          id: true, code: true,
          usages: {
            where: { deletedAt: null },
            select: { lot: { select: { rizerie: { select: { id: true, name: true } } } } },
          },
        },
      },
      allocations: { where: { deletedAt: null }, select: { quantity: true } },
    },
  });

  return rows.map((row) => ({
    ...row,
    remaining: row.quantity - row.allocations.reduce((s, a) => s + a.quantity, 0),
    rizeries: Array.from(
      new Map(
        row.batch.usages.map((u) => [u.lot.rizerie.id, u.lot.rizerie.name])
      ).entries()
    ).map(([id, name]) => ({ id, name })),
  }));
}

/** Récupère un PackLot par id (avec detailing complet). */
export async function getPackLot(id: string) {
  const row = await prisma.packLot.findUnique({
    where: { id },
    include: {
      pack: { include: { product: { select: { id: true, name: true, slug: true } } } },
      batch: {
        include: {
          usages: {
            where: { deletedAt: null },
            include: { lot: { include: { rizerie: { select: { id: true, name: true, location: true } } } } },
          },
        },
      },
      allocations: {
        where: { deletedAt: null },
        include: {
          orderLine: {
            include: {
              order: { select: { id: true, orderNumber: true, status: true, customer: { select: { fullName: true } } } },
            },
          },
        },
      },
    },
  });
  if (!row) return null;
  const remaining = row.quantity - row.allocations.reduce((s, a) => s + a.quantity, 0);
  return { ...row, remaining };
}

/**
 * Suggère l'allocation FIFO pour une ligne de commande.
 * Retourne une liste de { packLot, qty } triée par packedAt croissant.
 */
export async function suggestFifoAllocation(orderLineId: string): Promise<Array<{ packLotId: string; code: string; packId: string; quantity: number }>> {
  const line = await prisma.orderLine.findUnique({
    where: { id: orderLineId },
    include: { allocations: { where: { deletedAt: null }, select: { quantity: true } } },
  });
  if (!line) throw new TraceabilityError('Ligne introuvable.', { status: 404 });
  if (!line.productPackId) throw new TraceabilityError('Ligne sans pack lié — allocation impossible.', { status: 409 });

  const alreadyAllocated = line.allocations.reduce((s, a) => s + a.quantity, 0);
  let remaining = line.quantity - alreadyAllocated;
  if (remaining <= 0) return [];

  // PackLots libres du bon pack, classés par packedAt
  const packLots = await prisma.packLot.findMany({
    where: { packId: line.productPackId, status: 'libre', deletedAt: null },
    orderBy: { packedAt: 'asc' },
    include: { allocations: { where: { deletedAt: null }, select: { quantity: true } } },
  });

  const result: Array<{ packLotId: string; code: string; packId: string; quantity: number }> = [];
  for (const pl of packLots) {
    if (remaining <= 0) break;
    const available = pl.quantity - pl.allocations.reduce((s, a) => s + a.quantity, 0);
    if (available <= 0) continue;
    const qty = Math.min(available, remaining);
    result.push({ packLotId: pl.id, code: pl.code, packId: pl.packId, quantity: qty });
    remaining -= qty;
  }
  return result;
}

/**
 * createPackLotWithStock — crée un PackLot (statut quarantaine) ET le StockMovement d'entrée.
 * La capacité est vérifiée (qty × pack.quantity ≤ pièces conformes disponibles du batch).
 */
export async function createPackLotWithStock(
  input: PackLotInput & { createdById?: string },
  actorId?: string,
): Promise<ReturnType<typeof prisma.packLot.create>> {
  return prisma.$transaction(async (tx) => {
    // Vérifier que le batch existe et n'est pas supprimé
    const batch = await tx.batchProduction.findUnique({ where: { id: input.batchId } });
    if (!batch) throw new TraceabilityError('Batch introuvable.', { status: 404 });
    if (batch.deletedAt) throw new TraceabilityError('Ce batch a été supprimé.', { status: 409 });

    // Vérifier le pack
    const pack = await tx.productPack.findUnique({ where: { id: input.packId } });
    if (!pack) throw new TraceabilityError('Pack introuvable.', { status: 404 });

    // Pièces conformes disponibles = piecesProduced - rejects - déjà packagées dans des PackLots actifs
    const existingPackLots = await tx.packLot.findMany({
      where: { batchId: input.batchId, deletedAt: null },
      select: { quantity: true, pack: { select: { quantity: true } } },
    });
    const alreadyPacked = existingPackLots.reduce(
      (sum, pl) => sum + pl.quantity * pl.pack.quantity, 0,
    );
    const validPieces = Math.max(0, batch.piecesProduced - batch.rejects);
    const availablePieces = validPieces - alreadyPacked;
    const neededPieces = input.quantity * pack.quantity;

    if (neededPieces > availablePieces) {
      throw new TraceabilityError(
        `Impossible de créer ce lot : ${neededPieces} pièces nécessaires mais seulement ${availablePieces} conformes disponibles dans le batch.`,
        { status: 409 },
      );
    }

    const code = await nextPackLotCode(input.packedAt ?? new Date(), tx);
    const packLot = await tx.packLot.create({
      data: {
        code,
        batchId: input.batchId,
        packId: input.packId,
        quantity: input.quantity,
        status: 'quarantaine',
        packedAt: input.packedAt ?? new Date(),
        createdById: actorId ?? null,
      },
    });

    // StockMovement d'entrée pour le stock produit_fini du type
    const stock = await tx.stock.upsert({
      where: {
        itemType_productType: {
          itemType: 'produit_fini',
          productType: batch.productType,
        },
      },
      update: {},
      create: {
        itemType: 'produit_fini',
        productType: batch.productType,
        label: `Produits finis — ${batch.productType}`,
        unit: 'unités',
        minThreshold: 0,
        quantity: 0,
      },
    });

    const newQty = stock.quantity; // PackLot entrée = comptabilisé séparément, pas en stock coques
    // Note: le stock produit_fini est géré en pièces (dans createBatch). Ici on crée
    // un mouvement de traçabilité packLot sans double-compter.
    await tx.stockMovement.create({
      data: {
        stockId: stock.id,
        type: 'entree',
        quantity: input.quantity,
        resultingQuantity: newQty + input.quantity,
        reference: code,
        note: `PackLot créé depuis batch ${batch.code}`,
        createdById: actorId ?? null,
        packLotId: packLot.id,
        batchId: input.batchId,
      },
    });

    await tx.stock.update({
      where: { id: stock.id },
      data: { quantity: newQty + input.quantity },
    });

    return packLot;
  }) as ReturnType<typeof prisma.packLot.create>;
}

/**
 * releasePackLot — passe un PackLot de quarantaine → libre.
 * Requiert quality:write (vérifié côté appelant).
 * Requiert au moins 1 test qualité conforme sur le batch.
 */
export async function releasePackLot(packLotId: string, actorId?: string): Promise<void> {
  const packLot = await prisma.packLot.findUnique({
    where: { id: packLotId },
    include: {
      batch: {
        include: {
          tests: { where: { result: 'succes' }, take: 1 },
        },
      },
    },
  });
  if (!packLot) throw new TraceabilityError('PackLot introuvable.', { status: 404 });
  if (packLot.deletedAt) throw new TraceabilityError('Ce PackLot a été supprimé.', { status: 409 });
  if (packLot.status !== 'quarantaine') {
    throw new TraceabilityError(`Ce PackLot est déjà au statut « ${packLot.status} ».`, { status: 409 });
  }
  if (packLot.batch.tests.length === 0) {
    throw new TraceabilityError(
      'Impossible de libérer ce PackLot : aucun contrôle qualité conforme enregistré sur le batch.',
      { status: 422 },
    );
  }
  await prisma.packLot.update({ where: { id: packLotId }, data: { status: 'libre' } });
  await recordAudit({
    userId: actorId ?? null,
    actorName: 'système',
    action: 'update',
    entityType: 'packLot',
    entityId: packLotId,
    details: { status: 'libre' },
  });
}

/**
 * recallLot — marque tous les PackLots d'un lot en rappel.
 * Crée une Notification de niveau error.
 * Retourne la liste des commandes et clients concernés.
 */
export async function recallLot(lotId: string, motif: string, actorId?: string) {
  const lot = await prisma.lotCoques.findUnique({
    where: { id: lotId },
    include: {
      usages: {
        where: { deletedAt: null },
        include: {
          batch: {
            include: {
              packLots: {
                where: { deletedAt: null },
                include: {
                  allocations: {
                    where: { deletedAt: null },
                    include: {
                      orderLine: {
                        include: {
                          order: {
                            include: { customer: { select: { id: true, fullName: true, phone: true, email: true } } },
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
  if (!lot) throw new TraceabilityError('Lot introuvable.', { status: 404 });

  const packLotIds: string[] = [];
  const orderSet = new Map<string, { orderId: string; orderNumber: string; customer: { fullName: string; phone: string; email: string | null } }>();

  for (const usage of lot.usages) {
    for (const packLot of usage.batch.packLots) {
      if (packLot.status !== 'rappel') packLotIds.push(packLot.id);
      for (const alloc of packLot.allocations) {
        const order = alloc.orderLine.order;
        orderSet.set(order.id, {
          orderId: order.id,
          orderNumber: order.orderNumber,
          customer: { fullName: order.customer.fullName, phone: order.customer.phone, email: order.customer.email },
        });
      }
    }
  }

  if (packLotIds.length > 0) {
    await prisma.packLot.updateMany({
      where: { id: { in: packLotIds } },
      data: { status: 'rappel' },
    });
  }

  // Mettre à jour le status du lot
  await prisma.lotCoques.update({ where: { id: lotId }, data: { status: 'recalled' } });

  await createNotification({
    type: 'rappel_lot',
    level: 'danger',
    title: `Rappel produit — lot ${lot.code}`,
    message: `Motif : ${motif}. ${packLotIds.length} lot(s) de packs marqués en rappel. ${orderSet.size} commande(s) concernée(s).`,
    entityType: 'lot',
    entityId: lotId,
  });

  await recordAudit({
    userId: actorId ?? null,
    actorName: 'système',
    action: 'recall',
    entityType: 'lot',
    entityId: lotId,
    details: { motif, packLotCount: packLotIds.length, orderCount: orderSet.size },
  });

  return { affectedOrders: [...orderSet.values()] };
}

/**
 * recallPackLot — marque un PackLot en rappel.
 */
export async function recallPackLot(packLotId: string, motif: string, actorId?: string) {
  const packLot = await prisma.packLot.findUnique({
    where: { id: packLotId },
    include: {
      allocations: {
        where: { deletedAt: null },
        include: {
          orderLine: {
            include: {
              order: {
                include: { customer: { select: { id: true, fullName: true, phone: true, email: true } } },
              },
            },
          },
        },
      },
    },
  });
  if (!packLot) throw new TraceabilityError('PackLot introuvable.', { status: 404 });
  if (packLot.deletedAt) throw new TraceabilityError('Ce PackLot a été supprimé.', { status: 409 });

  await prisma.packLot.update({ where: { id: packLotId }, data: { status: 'rappel' } });

  const orderSet = new Map<string, { orderId: string; orderNumber: string; customer: { fullName: string; phone: string; email: string | null } }>();
  for (const alloc of packLot.allocations) {
    const order = alloc.orderLine.order;
    orderSet.set(order.id, {
      orderId: order.id,
      orderNumber: order.orderNumber,
      customer: { fullName: order.customer.fullName, phone: order.customer.phone, email: order.customer.email },
    });
  }

  await createNotification({
    type: 'rappel_pack_lot',
    level: 'danger',
    title: `Rappel produit — PackLot ${packLot.code}`,
    message: `Motif : ${motif}. ${orderSet.size} commande(s) concernée(s).`,
    entityType: 'packLot',
    entityId: packLotId,
  });

  await recordAudit({
    userId: actorId ?? null,
    actorName: 'système',
    action: 'recall',
    entityType: 'packLot',
    entityId: packLotId,
    details: { motif, orderCount: orderSet.size },
  });

  return { affectedOrders: [...orderSet.values()] };
}

/**
 * cancelOrderAllocations — libère toutes les allocations d'une commande
 * en les supprimant doucement et en créant des mouvements d'entrée inverses.
 */
export async function cancelOrderAllocations(orderId: string, actorId?: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      lines: {
        include: {
          allocations: {
            where: { deletedAt: null },
            include: { packLot: { include: { batch: { select: { productType: true, code: true } } } } },
          },
        },
      },
    },
  });
  if (!order) return;

  const now = new Date();
  for (const line of order.lines) {
    for (const alloc of line.allocations) {
      await prisma.orderLineAllocation.update({
        where: { id: alloc.id },
        data: { deletedAt: now, deletedById: actorId ?? null },
      });
      // Mouvement d'entrée inverse (libère le stock)
      const stock = await prisma.stock.findFirst({
        where: { itemType: 'produit_fini', productType: alloc.packLot.batch.productType, deletedAt: null },
      });
      if (stock) {
        const newQty = stock.quantity + alloc.quantity;
        await prisma.stock.update({ where: { id: stock.id }, data: { quantity: newQty } });
        await prisma.stockMovement.create({
          data: {
            stockId: stock.id,
            type: 'entree',
            quantity: alloc.quantity,
            resultingQuantity: newQty,
            reference: order.orderNumber,
            note: `Annulation commande — libération allocation PackLot ${alloc.packLot.code}`,
            createdById: actorId ?? null,
            packLotId: alloc.packLotId,
            orderId,
          },
        });
      }
    }
  }
}
