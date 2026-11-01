export const LOT_VISUAL_QUALITIES = [
  { value: 'conforme', label: 'Conforme' },
  { value: 'humide', label: 'Humide' },
  { value: 'contamine', label: 'Contaminé' },
  { value: 'refuse', label: 'Refusé' },
] as const;

export type LotVisualQuality = (typeof LOT_VISUAL_QUALITIES)[number]['value'];

export const LOT_STATUSES = [
  { value: 'accepted', label: 'Accepté' },
  { value: 'refused', label: 'Refusé' },
] as const;

export type LotStatus = (typeof LOT_STATUSES)[number]['value'];

export const PRODUCT_TYPES = [
  { value: 'assiette', label: 'Assiette' },
  { value: 'bol', label: 'Bol' },
  { value: 'gobelet', label: 'Gobelet' },
] as const;

export type ProductType = (typeof PRODUCT_TYPES)[number]['value'];

export const PRODUCT_STATUSES = [
  { value: 'valide', label: 'Validé' },
  { value: 'rejete', label: 'Rejeté' },
] as const;

export const TEST_TYPES = [
  { value: 'charge', label: 'Test de charge' },
  { value: 'etancheite', label: 'Test d’étanchéité' },
  { value: 'visuel', label: 'Test visuel' },
] as const;

export type TestType = (typeof TEST_TYPES)[number]['value'];

export const TEST_RESULTS = [
  { value: 'succes', label: 'Succès' },
  { value: 'echec', label: 'Échec' },
] as const;

export type TestResult = (typeof TEST_RESULTS)[number]['value'];

export const STOCK_ITEM_TYPES = [
  { value: 'coques', label: 'Coques brutes', unit: 'kg' },
  { value: 'poudre', label: 'Poudre de coques', unit: 'kg' },
  { value: 'liant', label: 'Liant', unit: 'kg' },
  { value: 'intrant', label: 'Intrant (eau / additif / emballage)', unit: 'kg' }, // P4 : suivi des intrants
  { value: 'produit_fini', label: 'Produits finis', unit: 'unités' },
] as const;

export type StockItemType = (typeof STOCK_ITEM_TYPES)[number]['value'];

export const STOCK_MOVEMENT_TYPES = [
  { value: 'entree', label: 'Entrée' },
  { value: 'sortie', label: 'Sortie' },
  { value: 'rebut', label: 'Rebut' },
  { value: 'ajustement', label: 'Ajustement' },
  { value: 'transfert', label: 'Transfert' },
] as const;

export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number]['value'];

export const PARTNER_TYPES = [
  { value: 'laboratoire', label: 'Laboratoire' },
  { value: 'client', label: 'Client pilote' },
  { value: 'fournisseur', label: 'Fournisseur' },
  { value: 'institution', label: 'Institution / incubateur' },
  { value: 'autre', label: 'Autre' },
] as const;

export const DOCUMENT_CATEGORIES = [
  { value: 'certificat', label: 'Certificat' },
  { value: 'contrat', label: 'Contrat' },
  { value: 'rapport', label: 'Rapport' },
  { value: 'photo', label: 'Photo' },
  { value: 'autre', label: 'Autre' },
] as const;

export const CONTRACT_TYPES = [
  { value: 'achat', label: 'Achat' },
  { value: 'gratuit', label: 'Mise à disposition gratuite' },
] as const;

export const REJECT_CAUSES = [
  { value: 'fissure', label: 'Fissure / casse' },
  { value: 'deformation', label: 'Déformation' },
  { value: 'humidite', label: 'Humidité / séchage' },
  { value: 'pression', label: 'Pression / moulage' },
  { value: 'liant', label: 'Dosage du liant' },
  { value: 'contamination', label: 'Contamination' },
  { value: 'autre', label: 'Autre' },
] as const;

export function labelOf(
  options: readonly { value: string; label: string }[],
  value: string | null | undefined,
): string {
  return options.find((option) => option.value === value)?.label ?? value ?? '—';
}

export function productTypeLabel(value: string | null | undefined): string {
  return labelOf(PRODUCT_TYPES, value);
}

export function stockItemLabel(value: string | null | undefined): string {
  return labelOf(STOCK_ITEM_TYPES, value);
}

export function stockUnitFor(itemType: string): string {
  return STOCK_ITEM_TYPES.find((item) => item.value === itemType)?.unit ?? 'kg';
}

/** Rendement : pièces valides / pièces produites × 100. */
export function computeYield(piecesProduced: number, rejects: number): number {
  if (piecesProduced <= 0) return 0;
  const valid = Math.max(0, piecesProduced - rejects);
  return (valid / piecesProduced) * 100;
}

/** Taux de rebut : rebuts / pièces produites × 100. */
export function computeRejectRate(piecesProduced: number, rejects: number): number {
  if (piecesProduced <= 0) return 0;
  return (rejects / piecesProduced) * 100;
}

export function computeBatchCost(batch: {
  powderCostFcfa: number;
  binderCostFcfa: number;
  laborCostFcfa: number;
  energyCostFcfa: number;
}): number {
  return batch.powderCostFcfa + batch.binderCostFcfa + batch.laborCostFcfa + batch.energyCostFcfa;
}

export function computeCostPerUnit(
  batch: {
    powderCostFcfa: number;
    binderCostFcfa: number;
    laborCostFcfa: number;
    energyCostFcfa: number;
    piecesProduced: number;
    rejects: number;
  },
  fallbackPieces = 0,
): number {
  const validPieces = Math.max(0, batch.piecesProduced - batch.rejects) || fallbackPieces;
  if (validPieces <= 0) return 0;
  return computeBatchCost(batch) / validPieces;
}

/** Arrondi métier à 1 ou 2 décimales, sans notation exponentielle. */
export function round(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function toNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function toInteger(value: unknown, fallback = 0): number {
  return Math.trunc(toNumber(value, fallback));
}
