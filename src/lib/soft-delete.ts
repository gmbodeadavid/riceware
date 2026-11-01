/**
 * src/lib/soft-delete.ts
 *
 * Helpers centralisés pour la suppression douce (soft delete) et la restauration.
 *
 * Principe : les entités soft-deletées ne sont JAMAIS supprimées physiquement ;
 * elles sont masquées de toutes les listes et ne comptent pas dans les KPI.
 * Leurs liens historiques (lots → batches → commandes) restent lisibles.
 *
 * Utilisation :
 *   await softDelete('rizerie', id, actor)
 *   await restoreEntity('rizerie', id, actor)
 */

import { prisma } from '@/lib/db';
import { recordAudit } from '@/lib/production/audit';
import type { AdminSession } from '@/lib/admin-auth';

export type Actor = Pick<AdminSession, 'userId' | 'name'>;

function actorFields(actor?: Actor) {
  return {
    userId: actor?.userId ?? null,
    actorName: actor?.name ?? 'système',
  };
}

/** Modèles qui supportent le soft delete. */
export type SoftDeletableModel =
  | 'rizerie'
  | 'lotCoques'
  | 'batchProduction'
  | 'produitFini'
  | 'stock'
  | 'partner'
  | 'document'
  | 'customer'
  | 'order';

/** Libellés français pour l'audit et l'interface. */
export const SOFT_DELETABLE_LABELS: Record<SoftDeletableModel, string> = {
  rizerie: 'Rizerie',
  lotCoques: 'Lot de coques',
  batchProduction: 'Batch de production',
  produitFini: 'Produit fini',
  stock: 'Stock',
  partner: 'Partenaire',
  document: 'Document',
  customer: 'Client',
  order: 'Commande',
};

/**
 * Marque une entité comme supprimée (deletedAt = now, deletedById = acteur).
 * Ne fait PAS les compensations de stock — celles-ci sont gérées dans mutations.ts
 * selon la logique propre à chaque modèle (ex. batch → mouvements inverses).
 */
export async function softDelete(
  model: SoftDeletableModel,
  id: string,
  actor?: Actor,
): Promise<void> {
  const now = new Date();
  const data = { deletedAt: now, deletedById: actor?.userId ?? null };

  // Prisma ne supporte pas les mises à jour dynamiques de modèle via une chaîne —
  // on utilise un switch exhaustif pour rester typé.
  switch (model) {
    case 'rizerie':
      await prisma.rizerie.update({ where: { id }, data });
      break;
    case 'lotCoques':
      await prisma.lotCoques.update({ where: { id }, data });
      break;
    case 'batchProduction':
      await prisma.batchProduction.update({ where: { id }, data });
      break;
    case 'produitFini':
      await prisma.produitFini.update({ where: { id }, data });
      break;
    case 'stock':
      await prisma.stock.update({ where: { id }, data });
      break;
    case 'partner':
      await prisma.partner.update({ where: { id }, data });
      break;
    case 'document':
      await prisma.document.update({ where: { id }, data });
      break;
    case 'customer':
      await prisma.customer.update({ where: { id }, data });
      break;
    case 'order':
      await prisma.order.update({ where: { id }, data });
      break;
  }

  await recordAudit({
    ...actorFields(actor),
    action: 'soft_delete',
    entityType: model,
    entityId: id,
  });
}

/**
 * Restaure une entité supprimée (deletedAt = null, deletedById = null).
 * En P1 : la restauration d'un batch est BLOQUÉE (les mouvements de stock
 * compensateurs ont déjà été créés ; la restauration nécessite une révision
 * manuelle — prévu en P2).
 */
export async function restoreEntity(
  model: SoftDeletableModel,
  id: string,
  actor?: Actor,
): Promise<void> {
  if (model === 'batchProduction') {
    throw new Error(
      "La restauration d'un batch est bloquée en P1 : les mouvements de stock inverses ont déjà été créés. Contactez un administrateur pour une correction manuelle.",
    );
  }

  const data = { deletedAt: null, deletedById: null };

  switch (model) {
    case 'rizerie':
      await prisma.rizerie.update({ where: { id }, data });
      break;
    case 'lotCoques':
      await prisma.lotCoques.update({ where: { id }, data });
      break;
    case 'produitFini':
      await prisma.produitFini.update({ where: { id }, data });
      break;
    case 'stock':
      await prisma.stock.update({ where: { id }, data });
      break;
    case 'partner':
      await prisma.partner.update({ where: { id }, data });
      break;
    case 'document':
      await prisma.document.update({ where: { id }, data });
      break;
    case 'customer':
      await prisma.customer.update({ where: { id }, data });
      break;
    case 'order':
      await prisma.order.update({ where: { id }, data });
      break;
  }

  await recordAudit({
    ...actorFields(actor),
    action: 'restore',
    entityType: model,
    entityId: id,
  });
}

/** Filtre standard à appliquer dans tous les list / get pour exclure les éléments supprimés. */
export const NOT_DELETED = { deletedAt: null } as const;
