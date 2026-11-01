import bcrypt from 'bcrypt';
import { prisma } from '@/lib/db';
import { recordAudit } from '@/lib/production/audit';
import { nextBatchCode, nextTraceabilityCode } from '@/lib/production/codes';
import {
  alertIfRejectRateHigh,
  alertIfStockLow,
  alertQualityFailure,
  createNotification,
} from '@/lib/production/notifications';
import { getSettings, settingNumber } from '@/lib/production/settings';
import { DEFAULT_SETTINGS } from '@/lib/production/settings';
// removeProductionFile : utilisé uniquement lors de suppression physique de documents (P7).
// Conservé pour les futures suppressions admin explicites.
// import { removeProductionFile } from '@/lib/production/storage';
import {
  computeRejectRate,
  productTypeLabel,
  TEST_TYPES,
  type StockItemType,
} from '@/lib/production/types';
import {
  ProductionError,
  type BatchInput,
  type DocumentInput,
  type GoalInput,
  type LotInput,
  type PartnerInput,
  type ProduitFiniInput,
  type RizerieInput,
  type StockInput,
  type StockMovementInput,
  type TestInput,
  type UserInput,
} from '@/lib/production/validation';
import type { AdminSession } from '@/lib/admin-auth';
import { Prisma } from '@prisma/client';

type Actor = Pick<AdminSession, 'userId' | 'name'>;

function actorFields(actor?: Actor) {
  return {
    userId: actor?.userId ?? null,
    actorName: actor?.name ?? 'système',
  };
}

// ─── Stocks : helpers transactionnels ──────────────────────────────────────

function stockMeta(itemType: StockItemType, productType = '') {
  switch (itemType) {
    case 'coques':
      return { label: 'Coques brutes', unit: 'kg', minThreshold: Number(DEFAULT_SETTINGS.stockCoquesMinKg) };
    case 'poudre':
      return { label: 'Poudre de coques', unit: 'kg', minThreshold: Number(DEFAULT_SETTINGS.stockPoudreMinKg) };
    case 'liant':
      return { label: 'Liant', unit: 'kg', minThreshold: Number(DEFAULT_SETTINGS.stockLiantMinKg) };
    case 'produit_fini':
      return {
        label: `Produits finis — ${productTypeLabel(productType)}`,
        unit: 'unités',
        minThreshold: 0,
      };
    default:
      return { label: itemType, unit: 'kg', minThreshold: 0 };
  }
}

async function applyStockDelta(
  tx: Prisma.TransactionClient,
  input: {
    itemType: StockItemType;
    productType?: string;
    delta: number;
    type: string;
    reference?: string | null;
    note?: string | null;
    actor?: Actor;
  },
) {
  if (Math.abs(input.delta) < 0.000001) return null;

  const productType = input.productType ?? '';
  const meta = stockMeta(input.itemType, productType);

  const stock = await tx.stock.upsert({
    where: { itemType_productType: { itemType: input.itemType, productType } },
    update: {},
    create: {
      itemType: input.itemType,
      productType,
      label: meta.label,
      unit: meta.unit,
      minThreshold: meta.minThreshold,
      quantity: 0,
    },
  });

  const resultingQuantity = Math.round((stock.quantity + input.delta) * 1000) / 1000;
  if (resultingQuantity < -0.000001) {
    throw new ProductionError(
      `Stock insuffisant pour « ${stock.label} » : ${stock.quantity} ${stock.unit} disponible(s), ${Math.abs(input.delta)} demandé(s).`,
    );
  }

  const safeQuantity = Math.max(0, resultingQuantity);
  const updated = await tx.stock.update({
    where: { id: stock.id },
    data: { quantity: safeQuantity },
  });

  await tx.stockMovement.create({
    data: {
      stockId: stock.id,
      type: input.type,
      quantity: input.delta,
      resultingQuantity: safeQuantity,
      reference: input.reference ?? null,
      note: input.note ?? null,
      createdById: input.actor?.userId ?? null,
    },
  });

  return updated;
}

// ─── Rizeries ──────────────────────────────────────────────────────────────

export async function createRizerie(input: RizerieInput, actor?: Actor) {
  const rizerie = await prisma.rizerie.create({ data: input });
  await recordAudit({
    ...actorFields(actor),
    action: 'create',
    entityType: 'rizerie',
    entityId: rizerie.id,
    details: { name: rizerie.name },
  });
  return rizerie;
}

export async function updateRizerie(id: string, input: RizerieInput, actor?: Actor) {
  const rizerie = await prisma.rizerie.update({ where: { id }, data: input });
  await recordAudit({
    ...actorFields(actor),
    action: 'update',
    entityType: 'rizerie',
    entityId: id,
    details: { name: rizerie.name },
  });
  return rizerie;
}

export async function deleteRizerie(id: string, actor?: Actor) {
  const lots = await prisma.lotCoques.count({ where: { rizerieId: id, deletedAt: null } });
  if (lots > 0) {
    throw new ProductionError('Impossible de supprimer une rizerie qui possède des lots actifs. Désactivez-la plutôt.');
  }
  const now = new Date();
  await prisma.rizerie.update({ where: { id }, data: { deletedAt: now, deletedById: actor?.userId ?? null } });
  await recordAudit({ ...actorFields(actor), action: 'soft_delete', entityType: 'rizerie', entityId: id });
}

// ─── Lots de coques ────────────────────────────────────────────────────────

export async function createLot(input: LotInput, actor?: Actor) {
  const code = await nextTraceabilityCode(input.receivedAt);

  const lot = await prisma.$transaction(async (tx) => {
    const created = await tx.lotCoques.create({
      data: {
        ...input,
        code,
        createdById: actor?.userId ?? null,
      },
      include: { rizerie: true },
    });

    if (created.status === 'accepted') {
      await applyStockDelta(tx, {
        itemType: 'coques',
        delta: created.netWeightKg,
        type: 'entree',
        reference: created.code,
        note: `Réception ${created.rizerie.name}`,
        actor,
      });
    }

    return created;
  });

  await recordAudit({
    ...actorFields(actor),
    action: 'create',
    entityType: 'lot',
    entityId: lot.id,
    details: { code: lot.code, netWeightKg: lot.netWeightKg, rizerie: lot.rizerie.name },
  });

  if (lot.status === 'accepted') {
    const stocks = await prisma.stock.findMany({ where: { itemType: 'coques', deletedAt: null } });
    await Promise.all(stocks.map((stock) => alertIfStockLow(stock)));
  }

  return lot;
}

export async function updateLot(id: string, input: LotInput, actor?: Actor) {
  const previous = await prisma.lotCoques.findUnique({ where: { id } });
  if (!previous) throw new ProductionError('Lot introuvable.', { status: 404 });

  const lot = await prisma.$transaction(async (tx) => {
    const updated = await tx.lotCoques.update({
      where: { id },
      data: input,
      include: { rizerie: true },
    });

    const previousAccepted = previous.status === 'accepted' ? previous.netWeightKg : 0;
    const updatedAccepted = updated.status === 'accepted' ? updated.netWeightKg : 0;
    const delta = updatedAccepted - previousAccepted;

    if (delta !== 0) {
      await applyStockDelta(tx, {
        itemType: 'coques',
        delta,
        type: delta > 0 ? 'entree' : 'ajustement',
        reference: updated.code,
        note: 'Correction du lot de coques',
        actor,
      });
    }

    return updated;
  });

  await recordAudit({
    ...actorFields(actor),
    action: 'update',
    entityType: 'lot',
    entityId: id,
    details: { code: lot.code },
  });
  return lot;
}

export async function deleteLot(id: string, actor?: Actor) {
  const batchCount = await prisma.batchProduction.count({ where: { lotId: id, deletedAt: null } });
  if (batchCount > 0) {
    throw new ProductionError('Impossible de supprimer un lot utilisé par des batches de production actifs.');
  }

  const lot = await prisma.lotCoques.findUnique({ where: { id } });
  if (!lot) throw new ProductionError('Lot introuvable.', { status: 404 });

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.lotCoques.update({ where: { id }, data: { deletedAt: now, deletedById: actor?.userId ?? null } });
    if (lot.status === 'accepted') {
      await applyStockDelta(tx, {
        itemType: 'coques',
        delta: -lot.netWeightKg,
        type: 'ajustement',
        reference: lot.code,
        note: 'Suppression douce du lot',
        actor,
      });
    }
  });

  await recordAudit({ ...actorFields(actor), action: 'soft_delete', entityType: 'lot', entityId: id, details: { code: lot.code } });
}

// ─── Batches ───────────────────────────────────────────────────────────────

export async function createBatch(input: BatchInput, actor?: Actor) {
  const code = await nextBatchCode(input.startedAt);
  const validPieces = Math.max(0, input.piecesProduced - input.rejects);

  const batch = await prisma.$transaction(async (tx) => {
    const created = await tx.batchProduction.create({
      data: {
        ...input,
        code,
        operatorId: actor?.userId ?? null,
      },
    });

    await applyStockDelta(tx, {
      itemType: 'poudre',
      delta: -created.powderKg,
      type: 'sortie',
      reference: created.code,
      note: 'Consommation production',
      actor,
    });
    if (created.binderKg > 0) {
      await applyStockDelta(tx, {
        itemType: 'liant',
        delta: -created.binderKg,
        type: 'sortie',
        reference: created.code,
        note: 'Consommation production',
        actor,
      });
    }
    if (validPieces > 0) {
      await applyStockDelta(tx, {
        itemType: 'produit_fini',
        productType: created.productType,
        delta: validPieces,
        type: 'entree',
        reference: created.code,
        note: 'Production validée',
        actor,
      });
    }

    return created;
  });

  const settings = await getSettings();
  const rate = computeRejectRate(batch.piecesProduced, batch.rejects);
  await alertIfRejectRateHigh({
    batchId: batch.id,
    batchCode: batch.code,
    ratePct: rate,
    thresholdPct: settingNumber(settings, 'rejectAlertPct', 10),
  });
  await recordAudit({
    ...actorFields(actor),
    action: 'create',
    entityType: 'batch',
    entityId: batch.id,
    details: { code: batch.code, piecesProduced: batch.piecesProduced, rejects: batch.rejects },
  });

  return batch;
}

export async function updateBatch(id: string, input: BatchInput, actor?: Actor) {
  const previous = await prisma.batchProduction.findUnique({ where: { id } });
  if (!previous) throw new ProductionError('Batch introuvable.', { status: 404 });

  const previousValid = Math.max(0, previous.piecesProduced - previous.rejects);
  const nextValid = Math.max(0, input.piecesProduced - input.rejects);

  const batch = await prisma.$transaction(async (tx) => {
    const updated = await tx.batchProduction.update({ where: { id }, data: input });

    const powderDelta = previous.powderKg - updated.powderKg;
    if (powderDelta !== 0) {
      await applyStockDelta(tx, {
        itemType: 'poudre',
        delta: powderDelta,
        type: powderDelta > 0 ? 'entree' : 'sortie',
        reference: updated.code,
        note: 'Correction de consommation',
        actor,
      });
    }

    const binderDelta = previous.binderKg - updated.binderKg;
    if (binderDelta !== 0) {
      await applyStockDelta(tx, {
        itemType: 'liant',
        delta: binderDelta,
        type: binderDelta > 0 ? 'entree' : 'sortie',
        reference: updated.code,
        note: 'Correction de consommation',
        actor,
      });
    }

    if (previous.productType !== updated.productType) {
      if (previousValid > 0) {
        await applyStockDelta(tx, {
          itemType: 'produit_fini',
          productType: previous.productType,
          delta: -previousValid,
          type: 'ajustement',
          reference: updated.code,
          note: 'Changement de type de produit',
          actor,
        });
      }
      if (nextValid > 0) {
        await applyStockDelta(tx, {
          itemType: 'produit_fini',
          productType: updated.productType,
          delta: nextValid,
          type: 'entree',
          reference: updated.code,
          note: 'Changement de type de produit',
          actor,
        });
      }
    } else {
      const finishedDelta = nextValid - previousValid;
      if (finishedDelta !== 0) {
        await applyStockDelta(tx, {
          itemType: 'produit_fini',
          productType: updated.productType,
          delta: finishedDelta,
          type: finishedDelta > 0 ? 'entree' : 'ajustement',
          reference: updated.code,
          note: 'Correction de production',
          actor,
        });
      }
    }

    return updated;
  });

  await recordAudit({
    ...actorFields(actor),
    action: 'update',
    entityType: 'batch',
    entityId: id,
    details: { code: batch.code },
  });
  return batch;
}

export async function deleteBatch(id: string, actor?: Actor) {
  const batch = await prisma.batchProduction.findUnique({ where: { id } });
  if (!batch) throw new ProductionError('Batch introuvable.', { status: 404 });
  const valid = Math.max(0, batch.piecesProduced - batch.rejects);
  const now = new Date();

  // D5 : le soft-delete d'un batch DOIT compenser les stocks (mouvements inverses tracés).
  // La restauration d'un batch est BLOQUÉE en P1 (voir soft-delete.ts).
  await prisma.$transaction(async (tx) => {
    await tx.batchProduction.update({ where: { id }, data: { deletedAt: now, deletedById: actor?.userId ?? null } });
    // Remettre la poudre et le liant dans le stock
    await applyStockDelta(tx, {
      itemType: 'poudre',
      delta: batch.powderKg,
      type: 'ajustement',
      reference: batch.code,
      note: 'Suppression douce du batch — restitution poudre',
      actor,
    });
    if (batch.binderKg > 0) {
      await applyStockDelta(tx, {
        itemType: 'liant',
        delta: batch.binderKg,
        type: 'ajustement',
        reference: batch.code,
        note: 'Suppression douce du batch — restitution liant',
        actor,
      });
    }
    // Déduire les produits finis du stock (ils n'existent plus)
    if (valid > 0) {
      await applyStockDelta(tx, {
        itemType: 'produit_fini',
        productType: batch.productType,
        delta: -valid,
        type: 'ajustement',
        reference: batch.code,
        note: 'Suppression douce du batch — retrait produits finis',
        actor,
      });
    }
  });

  await recordAudit({ ...actorFields(actor), action: 'soft_delete', entityType: 'batch', entityId: id, details: { code: batch.code } });
}

// ─── Produits finis ────────────────────────────────────────────────────────

export async function createProduitFini(input: ProduitFiniInput, actor?: Actor) {
  const batch = await prisma.batchProduction.findUnique({ where: { id: input.batchId } });
  if (!batch) throw new ProductionError('Batch introuvable.', { status: 404 });

  const product = await prisma.produitFini.create({
    data: {
      ...input,
      thicknessPoints:
        input.thicknessPoints == null
          ? Prisma.JsonNull
          : (input.thicknessPoints as Prisma.InputJsonValue),
    },
  });
  await recordAudit({
    ...actorFields(actor),
    action: 'create',
    entityType: 'produit_fini',
    entityId: product.id,
    details: { batch: batch.code, type: product.type },
  });
  return product;
}

export async function updateProduitFini(id: string, input: ProduitFiniInput, actor?: Actor) {
  const product = await prisma.produitFini.update({
    where: { id },
    data: {
      ...input,
      thicknessPoints:
        input.thicknessPoints == null
          ? Prisma.JsonNull
          : (input.thicknessPoints as Prisma.InputJsonValue),
    },
  });
  await recordAudit({ ...actorFields(actor), action: 'update', entityType: 'produit_fini', entityId: id });
  return product;
}

export async function deleteProduitFini(id: string, actor?: Actor) {
  const now = new Date();
  await prisma.produitFini.update({ where: { id }, data: { deletedAt: now, deletedById: actor?.userId ?? null } });
  await recordAudit({ ...actorFields(actor), action: 'soft_delete', entityType: 'produit_fini', entityId: id });
}

// ─── Tests qualité ─────────────────────────────────────────────────────────

export async function createTest(input: TestInput, actor?: Actor) {
  const test = await prisma.testQualite.create({
    data: { ...input, operatorId: actor?.userId ?? null },
    include: {
      produitFini: { include: { batch: true } },
      batch: true,
    },
  });

  if (test.result === 'echec' && test.produitFiniId) {
    await prisma.produitFini.update({ where: { id: test.produitFiniId }, data: { status: 'rejete' } }).catch(() => undefined);
  }

  if (test.result === 'echec') {
    const reference = test.produitFini?.batch.code ?? test.batch?.code ?? test.produitFiniId ?? test.batchId ?? '—';
    await alertQualityFailure({
      testId: test.id,
      testLabel: TEST_TYPES.find((type) => type.value === test.typeTest)?.label ?? test.typeTest,
      reference,
    });
  }

  await recordAudit({
    ...actorFields(actor),
    action: 'create',
    entityType: 'test',
    entityId: test.id,
    details: { typeTest: test.typeTest, result: test.result },
  });

  return test;
}

export async function deleteTest(id: string, actor?: Actor) {
  // Les tests qualité n'ont pas de deletedAt — suppression physique maintenue (pas d'impact KPI direct).
  await prisma.testQualite.delete({ where: { id } });
  await recordAudit({ ...actorFields(actor), action: 'delete', entityType: 'test', entityId: id });
}

// ─── Stocks ────────────────────────────────────────────────────────────────

export async function createStock(input: StockInput, actor?: Actor) {
  try {
    // Atomique : stock + mouvement initial dans la même transaction.
    const stock = await prisma.$transaction(async (tx) => {
      const created = await tx.stock.create({ data: input });
      if (created.quantity > 0) {
        await tx.stockMovement.create({
          data: {
            stockId: created.id,
            type: 'entree',
            quantity: created.quantity,
            resultingQuantity: created.quantity,
            reference: 'Stock initial',
            createdById: actor?.userId ?? null,
          },
        });
      }
      return created;
    });
    await recordAudit({ ...actorFields(actor), action: 'create', entityType: 'stock', entityId: stock.id });
    return stock;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'P2002') {
      throw new ProductionError('Un stock existe déjà pour ce type d’article.');
    }
    throw error;
  }
}

export async function updateStock(
  id: string,
  input: Pick<StockInput, 'label' | 'minThreshold' | 'location' | 'unit'>,
  actor?: Actor,
) {
  const stock = await prisma.stock.update({
    where: { id },
    data: {
      label: input.label,
      minThreshold: input.minThreshold,
      location: input.location,
      unit: input.unit,
    },
  });
  await recordAudit({ ...actorFields(actor), action: 'update', entityType: 'stock', entityId: id });
  return stock;
}

export async function deleteStock(id: string, actor?: Actor) {
  // D4 : soft-delete autorisé même avec mouvements historiques.
  const now = new Date();
  await prisma.stock.update({ where: { id }, data: { deletedAt: now, deletedById: actor?.userId ?? null } });
  await recordAudit({ ...actorFields(actor), action: 'soft_delete', entityType: 'stock', entityId: id });
}

export async function createStockMovement(input: StockMovementInput, actor?: Actor) {
  const stock = await prisma.stock.findUnique({ where: { id: input.stockId } });
  if (!stock) throw new ProductionError('Stock introuvable.', { status: 404 });
  if (stock.deletedAt) throw new ProductionError('Ce stock a été supprimé et ne peut plus recevoir de mouvements.', { status: 409 });

  const resulting =
    input.type === 'ajustement'
      ? input.quantity
      : input.type === 'entree'
        ? stock.quantity + input.quantity
        : stock.quantity - input.quantity;

  if (resulting < 0) {
    throw new ProductionError(
      `Mouvement impossible : ${stock.quantity} ${stock.unit} disponible(s), ${input.quantity} demandé(s).`,
    );
  }

  const movement = await prisma.$transaction(async (tx) => {
    await tx.stock.update({ where: { id: stock.id }, data: { quantity: resulting } });
    return tx.stockMovement.create({
      data: {
        stockId: stock.id,
        type: input.type,
        quantity:
          input.type === 'ajustement'
            ? resulting - stock.quantity
            : input.type === 'entree'
              ? input.quantity
              : -input.quantity,
        resultingQuantity: resulting,
        reference: input.reference,
        note: input.note,
        createdById: actor?.userId ?? null,
      },
    });
  });

  await alertIfStockLow({ ...stock, quantity: resulting });
  await recordAudit({
    ...actorFields(actor),
    action: 'stock_movement',
    entityType: 'stock',
    entityId: stock.id,
    details: { type: input.type, quantity: input.quantity, resulting },
  });
  return movement;
}

// ─── Partenaires ───────────────────────────────────────────────────────────

export async function createPartner(input: PartnerInput, actor?: Actor) {
  const partner = await prisma.partner.create({ data: input });
  await recordAudit({ ...actorFields(actor), action: 'create', entityType: 'partner', entityId: partner.id });
  return partner;
}

export async function updatePartner(id: string, input: PartnerInput, actor?: Actor) {
  const partner = await prisma.partner.update({ where: { id }, data: input });
  await recordAudit({ ...actorFields(actor), action: 'update', entityType: 'partner', entityId: id });
  return partner;
}

export async function deletePartner(id: string, actor?: Actor) {
  const now = new Date();
  await prisma.partner.update({ where: { id }, data: { deletedAt: now, deletedById: actor?.userId ?? null } });
  await recordAudit({ ...actorFields(actor), action: 'soft_delete', entityType: 'partner', entityId: id });
}

// ─── Documents ─────────────────────────────────────────────────────────────

export async function createDocument(input: DocumentInput, actor?: Actor) {
  const document = await prisma.document.create({
    data: { ...input, uploadedById: actor?.userId ?? null },
  });
  await recordAudit({ ...actorFields(actor), action: 'create', entityType: 'document', entityId: document.id });
  return document;
}

export async function deleteDocument(id: string, actor?: Actor) {
  const document = await prisma.document.findUnique({ where: { id } });
  if (!document) throw new ProductionError('Document introuvable.', { status: 404 });

  // Soft delete : le fichier physique est conservé jusqu'à suppression admin explicite.
  const now = new Date();
  await prisma.document.update({ where: { id }, data: { deletedAt: now, deletedById: actor?.userId ?? null } });
  await recordAudit({ ...actorFields(actor), action: 'soft_delete', entityType: 'document', entityId: id });
}

// ─── Utilisateurs ──────────────────────────────────────────────────────────

async function assertNotLastAdmin(target: { id: string; role: string; active: boolean }, next: { role: string; active: boolean }) {
  if (target.role !== 'admin' || !target.active) return;
  if (next.role === 'admin' && next.active) return;

  const remaining = await prisma.user.count({
    where: { role: 'admin', active: true, id: { not: target.id } },
  });
  if (remaining === 0) {
    throw new ProductionError('Impossible de désactiver ou rétrograder le dernier administrateur actif.');
  }
}

export async function createUser(input: UserInput, actor?: Actor) {
  if (!input.password) throw new ProductionError('Mot de passe obligatoire pour un nouveau compte.');
  const passwordHash = await bcrypt.hash(input.password, 12);

  try {
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        role: input.role,
        active: input.active,
        passwordHash,
      },
      select: { id: true, name: true, email: true, role: true, active: true },
    });
    await recordAudit({ ...actorFields(actor), action: 'create', entityType: 'user', entityId: user.id, details: { email: user.email, role: user.role } });
    return user;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'P2002') {
      throw new ProductionError('Un compte existe déjà avec cet email.');
    }
    throw error;
  }
}

export async function updateUser(id: string, input: UserInput, actor?: Actor) {
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) throw new ProductionError('Utilisateur introuvable.', { status: 404 });
  await assertNotLastAdmin(target, { role: input.role, active: input.active });

  const passwordHash = input.password ? await bcrypt.hash(input.password, 12) : undefined;

  try {
    const user = await prisma.user.update({
      where: { id },
      data: {
        name: input.name,
        email: input.email,
        role: input.role,
        active: input.active,
        ...(passwordHash ? { passwordHash } : {}),
      },
      select: { id: true, name: true, email: true, role: true, active: true },
    });
    await recordAudit({ ...actorFields(actor), action: 'update', entityType: 'user', entityId: id, details: { email: user.email, role: user.role } });
    return user;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'P2002') {
      throw new ProductionError('Un compte existe déjà avec cet email.');
    }
    throw error;
  }
}

export async function deleteUser(id: string, actor?: Actor) {
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) throw new ProductionError('Utilisateur introuvable.', { status: 404 });
  if (actor?.userId === id) throw new ProductionError('Vous ne pouvez pas supprimer votre propre compte.');
  if (target.role === 'admin' && target.active) {
    const remaining = await prisma.user.count({ where: { role: 'admin', active: true, id: { not: id } } });
    if (remaining === 0) throw new ProductionError('Impossible de supprimer le dernier administrateur actif.');
  }

  await prisma.user.delete({ where: { id } });
  await recordAudit({ ...actorFields(actor), action: 'delete', entityType: 'user', entityId: id });
}

// ─── Objectifs et notifications ────────────────────────────────────────────

export async function createGoal(input: GoalInput, actor?: Actor) {
  const goal = await prisma.goal.create({ data: input });
  await recordAudit({ ...actorFields(actor), action: 'create', entityType: 'goal', entityId: goal.id });
  return goal;
}

export async function updateGoal(id: string, input: GoalInput, actor?: Actor) {
  const goal = await prisma.goal.update({ where: { id }, data: input });
  await recordAudit({ ...actorFields(actor), action: 'update', entityType: 'goal', entityId: id });
  return goal;
}

export async function deleteGoal(id: string, actor?: Actor) {
  await prisma.goal.delete({ where: { id } });
  await recordAudit({ ...actorFields(actor), action: 'delete', entityType: 'goal', entityId: id });
}

export async function markNotificationRead(id: string) {
  return prisma.notification.update({ where: { id }, data: { read: true } });
}

export async function markAllNotificationsRead() {
  return prisma.notification.updateMany({ where: { read: false }, data: { read: true } });
}

export async function createTestNotification(message: string, actor?: Actor) {
  const notification = await createNotification({
    type: 'test',
    level: 'info',
    title: 'Test de notification',
    message,
    whatsapp: true,
  });
  await recordAudit({ ...actorFields(actor), action: 'create', entityType: 'notification', entityId: notification.id });
  return notification;
}
