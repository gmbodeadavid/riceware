/**
 * src/lib/enums.ts
 *
 * Registre central des valeurs enumérées de l'application RiceWare CI.
 * Chaque entrée possède : value (clé technique), label (français), et optionnellement
 * badge (couleur Tailwind pour le composant <Badge>).
 *
 * Règles :
 * - Toujours importer depuis ce fichier plutôt que de redéfinir localement.
 * - Les enums Prisma/SQLite ne sont pas utilisés (String validés en TypeScript).
 * - Les formulaires, validations serveur et exports consomment ce registre.
 *
 * TODO P5 : décider si Product.category (string libre) doit être remplacé par
 *           ProductCategory (modèle Prisma) ou par PRODUCT_CATEGORIES ci-dessous.
 *           Usages actuels : boutique.ts (union TS), data/products.ts (DB), data/mappers.ts.
 */

// ─── Commandes ─────────────────────────────────────────────────────────────

export const ORDER_STATUSES = [
  { value: 'draft',                label: 'Brouillon',           badge: 'default' },
  { value: 'received',             label: 'Reçue',               badge: 'default' },
  { value: 'pending_confirmation', label: 'En attente de confirmation', badge: 'warning' },
  { value: 'confirmed',            label: 'Confirmée',           badge: 'paddy' },
  { value: 'preparing',            label: 'En préparation',      badge: 'warning' },
  { value: 'shipped',              label: 'Expédiée',            badge: 'paddy' },
  { value: 'delivered',            label: 'Livrée',              badge: 'success' },
  { value: 'cancelled',            label: 'Annulée',             badge: 'danger' },
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number]['value'];

export const PAYMENT_STATUSES = [
  { value: 'pending',  label: 'En attente',  badge: 'warning' },
  { value: 'paid',     label: 'Payée',       badge: 'success' },
  { value: 'failed',   label: 'Échouée',     badge: 'danger' },
  { value: 'refunded', label: 'Remboursée',  badge: 'default' },
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]['value'];

// ─── Canal de vente ────────────────────────────────────────────────────────

/**
 * Order.channel en base de données (String, sans contrainte).
 * Source de vérité unique — supprime le doublon entre cart.ts et ricewareModels.ts.
 */
export const ORDER_CHANNELS = [
  { value: 'site',        label: 'Boutique en ligne' },
  { value: 'whatsapp',    label: 'WhatsApp' },
  { value: 'phone',       label: 'Téléphone' },
  { value: 'direct_sale', label: 'Vente directe' },
  { value: 'partner',     label: 'Partenaire' },
] as const;

export type SalesChannel = (typeof ORDER_CHANNELS)[number]['value'];

// ─── Notifications ─────────────────────────────────────────────────────────

export const NOTIFICATION_LEVELS = [
  { value: 'info',    label: 'Information', badge: 'default' },
  { value: 'warning', label: 'Avertissement', badge: 'warning' },
  { value: 'error',   label: 'Erreur',       badge: 'danger' },
] as const;

export type NotificationLevel = (typeof NOTIFICATION_LEVELS)[number]['value'];

// ─── Objectifs ──────────────────────────────────────────────────────────────

export const GOAL_STATUSES = [
  { value: 'active',   label: 'Actif',   badge: 'success' },
  { value: 'paused',   label: 'En pause', badge: 'warning' },
  { value: 'achieved', label: 'Atteint', badge: 'paddy' },
  { value: 'cancelled', label: 'Annulé', badge: 'danger' },
] as const;

export type GoalStatus = (typeof GOAL_STATUSES)[number]['value'];

// ─── Ré-exports depuis types.ts (production) ──────────────────────────────
// Les enums de production restent dans src/lib/production/types.ts pour la cohésion
// du module production, mais sont ré-exportés ici pour la cohérence des imports.

export {
  LOT_VISUAL_QUALITIES,
  LOT_STATUSES,
  PRODUCT_TYPES,
  PRODUCT_STATUSES,
  TEST_TYPES,
  TEST_RESULTS,
  STOCK_ITEM_TYPES,
  STOCK_MOVEMENT_TYPES,
  PARTNER_TYPES,
  DOCUMENT_CATEGORIES,
  CONTRACT_TYPES,
  REJECT_CAUSES,
  labelOf,
} from '@/lib/production/types';

export type {
  LotVisualQuality,
  LotStatus,
  ProductType,
  TestType,
  TestResult,
  StockItemType,
  StockMovementType,
} from '@/lib/production/types';
