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
