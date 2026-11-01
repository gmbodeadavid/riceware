import {
  CONTRACT_TYPES,
  DOCUMENT_CATEGORIES,
  LOT_STATUSES,
  LOT_VISUAL_QUALITIES,
  PARTNER_TYPES,
  PRODUCT_STATUSES,
  PRODUCT_TYPES,
  STOCK_ITEM_TYPES,
  STOCK_MOVEMENT_TYPES,
  TEST_RESULTS,
  TEST_TYPES,
  toNumber,
} from '@/lib/production/types';
import { ADMIN_ROLES, isAdminRole } from '@/lib/rbac';

export class ProductionError extends Error {
  status: number;
  issues: string[];

  constructor(message: string, options: { status?: number; issues?: string[] } = {}) {
    super(message);
    this.name = 'ProductionError';
    this.status = options.status ?? 400;
    this.issues = options.issues ?? [];
  }
}

type Body = Record<string, unknown>;

function asRecord(body: unknown): Body {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new ProductionError('Données invalides.');
  }
  return body as Body;
}

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function requiredString(body: Body, key: string, label: string, max = 500): string {
  const value = clean(body[key]);
  if (!value) throw new ProductionError(`${label} est obligatoire.`);
  if (value.length > max) throw new ProductionError(`${label} ne doit pas dépasser ${max} caractères.`);
  return value;
}

function optionalString(body: Body, key: string, max = 4000): string | null {
  const value = clean(body[key]);
  if (!value) return null;
  return value.slice(0, max);
}

function numberValue(
  body: Body,
  key: string,
  label: string,
  options: { min?: number; max?: number; required?: boolean; fallback?: number } = {},
): number {
  const raw = body[key];
  if (raw === undefined || raw === null || raw === '') {
    if (options.fallback !== undefined) return options.fallback;
    if (options.required === false) return 0;
    throw new ProductionError(`${label} est obligatoire.`);
  }
  const value = toNumber(raw, Number.NaN);
  if (!Number.isFinite(value)) throw new ProductionError(`${label} doit être un nombre.`);
  if (options.min !== undefined && value < options.min) {
    throw new ProductionError(`${label} doit être supérieur ou égal à ${options.min}.`);
  }
  if (options.max !== undefined && value > options.max) {
    throw new ProductionError(`${label} doit être inférieur ou égal à ${options.max}.`);
  }
  return value;
}

function integerValue(
  body: Body,
  key: string,
  label: string,
  options: { min?: number; max?: number; fallback?: number } = {},
): number {
  const value = numberValue(body, key, label, options);
  if (!Number.isInteger(value)) throw new ProductionError(`${label} doit être un nombre entier.`);
  return value;
}

function dateValue(body: Body, key: string, label: string, fallback?: Date): Date {
  const raw = body[key];
  if (raw === undefined || raw === null || raw === '') {
    if (fallback) return fallback;
    throw new ProductionError(`${label} est obligatoire.`);
  }
  const date = new Date(String(raw));
  if (Number.isNaN(date.getTime())) throw new ProductionError(`${label} est invalide.`);
  return date;
}

function optionalDate(body: Body, key: string): Date | null {
  const raw = body[key];
  if (raw === undefined || raw === null || raw === '') return null;
  const date = new Date(String(raw));
  if (Number.isNaN(date.getTime())) throw new ProductionError('Date invalide.');
  return date;
}

function enumValue<T extends string>(
  body: Body,
  key: string,
  label: string,
  values: readonly { value: T }[],
  fallback?: T,
): T {
  const raw = clean(body[key]);
  if (!raw && fallback) return fallback;
  if (!values.some((item) => item.value === raw)) {
    throw new ProductionError(`${label} est invalide.`);
  }
  return raw as T;
}

function optionalBoolean(body: Body, key: string): boolean | null {
  const raw = body[key];
  if (raw === undefined || raw === null || raw === '') return null;
  if (typeof raw === 'boolean') return raw;
  if (raw === 'true' || raw === '1' || raw === 1) return true;
  if (raw === 'false' || raw === '0' || raw === 0) return false;
  return null;
}

function optionalId(body: Body, key: string): string | null {
  const value = clean(body[key]);
  return value || null;
}

// ─── Rizeries ──────────────────────────────────────────────────────────────

export type RizerieInput = {
  name: string;
  location: string;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  contractType: string;
  monthlyVolumeKg: number | null;
  qualityNotes: string | null;
  notes: string | null;
  active: boolean;
};

export function parseRizerieInput(body: unknown): RizerieInput {
  const data = asRecord(body);
  const email = optionalString(data, 'contactEmail', 200);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ProductionError('Email de contact invalide.');
  }
  return {
    name: requiredString(data, 'name', 'Le nom de la rizerie', 160),
    location: requiredString(data, 'location', 'La localisation', 200),
    contactName: optionalString(data, 'contactName', 160),
    contactPhone: optionalString(data, 'contactPhone', 60),
    contactEmail: email,
    contractType: enumValue(data, 'contractType', 'Le type de contrat', CONTRACT_TYPES, 'achat'),
    monthlyVolumeKg: numberValue(data, 'monthlyVolumeKg', 'Le volume mensuel', { min: 0, required: false }) || null,
    qualityNotes: optionalString(data, 'qualityNotes'),
    notes: optionalString(data, 'notes'),
    active: optionalBoolean(data, 'active') ?? true,
  };
}

// ─── Lots de coques ────────────────────────────────────────────────────────

export type LotInput = {
  rizerieId: string;
  receivedAt: Date;
  grossWeightKg: number;
  tareWeightKg: number;
  netWeightKg: number;
  humidityPct: number;
  visualQuality: string;
  status: string;
  photoUrl: string | null;
  notes: string | null;
};

export function parseLotInput(body: unknown): LotInput {
  const data = asRecord(body);
  const gross = numberValue(data, 'grossWeightKg', 'Le poids brut', { min: 0.01 });
  const tare = numberValue(data, 'tareWeightKg', 'La tare', { min: 0, required: false });
  if (tare > gross) throw new ProductionError('La tare ne peut pas dépasser le poids brut.');
  const providedNet = numberValue(data, 'netWeightKg', 'Le poids net', { min: 0, required: false });

  const humidity = numberValue(data, 'humidityPct', 'L’humidité mesurée', { min: 0, max: 100 });
  const visualQuality = enumValue(data, 'visualQuality', 'L’état visuel', LOT_VISUAL_QUALITIES, 'conforme');
  const status = data.status
    ? enumValue(data, 'status', 'Le statut du lot', LOT_STATUSES, 'accepted')
    : visualQuality === 'refuse'
      ? 'refused'
      : 'accepted';

  return {
    rizerieId: requiredString(data, 'rizerieId', 'La rizerie', 100),
    receivedAt: dateValue(data, 'receivedAt', 'La date de réception', new Date()),
    grossWeightKg: gross,
    tareWeightKg: tare,
    netWeightKg: providedNet > 0 ? providedNet : Math.max(0, gross - tare),
    humidityPct: humidity,
    visualQuality,
    status,
    photoUrl: optionalString(data, 'photoUrl', 600),
    notes: optionalString(data, 'notes'),
  };
}

// ─── Batches de production ─────────────────────────────────────────────────

export type BatchInput = {
  lotId: string | null;
  startedAt: Date;
  productType: string;
  powderKg: number;
  binderKg: number;
  mixHumidityPct: number;
  pressingTempC: number;
  pressureMpa: number;
  cycleTimeMin: number;
  piecesProduced: number;
  rejects: number;
  rejectCause: string | null;
  observations: string | null;
  powderCostFcfa: number;
  binderCostFcfa: number;
  laborCostFcfa: number;
  energyCostFcfa: number;
};

export function parseBatchInput(body: unknown): BatchInput {
  const data = asRecord(body);
  const pieces = integerValue(data, 'piecesProduced', 'Le nombre de pièces produites', { min: 1, max: 1_000_000 });
  const rejects = integerValue(data, 'rejects', 'Le nombre de rebuts', { min: 0, max: pieces, fallback: 0 });

  return {
    lotId: optionalId(data, 'lotId'),
    startedAt: dateValue(data, 'startedAt', 'La date de début', new Date()),
    productType: enumValue(data, 'productType', 'Le type de produit fabriqué', PRODUCT_TYPES, 'assiette'),
    powderKg: numberValue(data, 'powderKg', 'La quantité de poudre', { min: 0.01 }),
    binderKg: numberValue(data, 'binderKg', 'La quantité de liant', { min: 0 }),
    mixHumidityPct: numberValue(data, 'mixHumidityPct', 'L’humidité du mélange', { min: 0, max: 100 }),
    pressingTempC: numberValue(data, 'pressingTempC', 'La température de pressage', { min: 0, max: 400 }),
    pressureMpa: numberValue(data, 'pressureMpa', 'La pression', { min: 0, max: 200 }),
    cycleTimeMin: numberValue(data, 'cycleTimeMin', 'Le temps de cycle', { min: 0.01 }),
    piecesProduced: pieces,
    rejects,
    rejectCause: rejects > 0 ? optionalString(data, 'rejectCause', 160) : null,
    observations: optionalString(data, 'observations'),
    powderCostFcfa: numberValue(data, 'powderCostFcfa', 'Le coût de la poudre', { min: 0, required: false }),
    binderCostFcfa: numberValue(data, 'binderCostFcfa', 'Le coût du liant', { min: 0, required: false }),
    laborCostFcfa: numberValue(data, 'laborCostFcfa', 'Le coût de main-d’œuvre', { min: 0, required: false }),
    energyCostFcfa: numberValue(data, 'energyCostFcfa', 'Le coût énergie', { min: 0, required: false }),
  };
}

// ─── Produits finis ────────────────────────────────────────────────────────

export type ProduitFiniInput = {
  batchId: string;
  type: string;
  weightG: number;
  thicknessMm: number;
  thicknessPoints: number[] | null;
  leakTest: boolean | null;
  loadTestKg: number | null;
  status: string;
  notes: string | null;
};

export function parseProduitFiniInput(body: unknown): ProduitFiniInput {
  const data = asRecord(body);
  const rawPoints = data.thicknessPoints;
  let thicknessPoints: number[] | null = null;

  if (Array.isArray(rawPoints) && rawPoints.length) {
    thicknessPoints = rawPoints
      .map((point) => toNumber(point, Number.NaN))
      .filter((point) => Number.isFinite(point) && point >= 0);
    if (thicknessPoints.length !== rawPoints.length) {
      throw new ProductionError('Les points d’épaisseur doivent être des nombres positifs.');
    }
  } else if (typeof rawPoints === 'string' && rawPoints.trim()) {
    thicknessPoints = rawPoints
      .split(/[,;\s]+/)
      .map((point) => toNumber(point, Number.NaN))
      .filter((point) => Number.isFinite(point) && point >= 0);
  }

  const thicknessMm =
    numberValue(data, 'thicknessMm', 'L’épaisseur moyenne', { min: 0.01, required: false }) ||
    (thicknessPoints?.length ? thicknessPoints.reduce((sum, point) => sum + point, 0) / thicknessPoints.length : 0);

  if (!thicknessMm) throw new ProductionError('L’épaisseur moyenne est obligatoire.');

  return {
    batchId: requiredString(data, 'batchId', 'Le batch', 100),
    type: enumValue(data, 'type', 'Le type de produit', PRODUCT_TYPES, 'assiette'),
    weightG: numberValue(data, 'weightG', 'Le poids', { min: 0.01 }),
    thicknessMm,
    thicknessPoints,
    leakTest: optionalBoolean(data, 'leakTest'),
    loadTestKg: numberValue(data, 'loadTestKg', 'La charge testée', { min: 0, required: false }) || null,
    status: enumValue(data, 'status', 'Le statut du produit', PRODUCT_STATUSES, 'valide'),
    notes: optionalString(data, 'notes'),
  };
}

// ─── Tests qualité ─────────────────────────────────────────────────────────

export type TestInput = {
  produitFiniId: string | null;
  batchId: string | null;
  typeTest: string;
  result: string;
  loadKg: number | null;
  durationMin: number | null;
  waterMl: number | null;
  waterTempC: number | null;
  cracks: boolean | null;
  bubbles: boolean | null;
  deformations: boolean | null;
  thicknessAvgMm: number | null;
  testedAt: Date;
  notes: string | null;
};

export function parseTestInput(body: unknown): TestInput {
  const data = asRecord(body);
  const produitFiniId = optionalId(data, 'produitFiniId');
  const batchId = optionalId(data, 'batchId');
  if (!produitFiniId && !batchId) {
    throw new ProductionError('Sélectionnez un produit fini ou un batch.');
  }

  const typeTest = enumValue(data, 'typeTest', 'Le type de test', TEST_TYPES, 'visuel');
  const result = enumValue(data, 'result', 'Le résultat', TEST_RESULTS);

  return {
    produitFiniId,
    batchId,
    typeTest,
    result,
    loadKg: numberValue(data, 'loadKg', 'La charge', { min: 0, required: false }) || null,
    durationMin: numberValue(data, 'durationMin', 'La durée', { min: 0, required: false }) || null,
    waterMl: numberValue(data, 'waterMl', 'Le volume d’eau', { min: 0, required: false }) || null,
    waterTempC: numberValue(data, 'waterTempC', 'La température de l’eau', { min: 0, required: false }) || null,
    cracks: optionalBoolean(data, 'cracks'),
    bubbles: optionalBoolean(data, 'bubbles'),
    deformations: optionalBoolean(data, 'deformations'),
    thicknessAvgMm: numberValue(data, 'thicknessAvgMm', 'L’épaisseur moyenne', { min: 0, required: false }) || null,
    testedAt: dateValue(data, 'testedAt', 'La date du test', new Date()),
    notes: optionalString(data, 'notes'),
  };
}

// ─── Stocks ────────────────────────────────────────────────────────────────

export type StockInput = {
  itemType: string;
  productType: string;
  label: string;
  quantity: number;
  unit: string;
  minThreshold: number;
  location: string | null;
};

export function parseStockInput(body: unknown): StockInput {
  const data = asRecord(body);
  const itemType = enumValue(data, 'itemType', 'Le type d’article', STOCK_ITEM_TYPES);
  const productType = itemType === 'produit_fini'
    ? enumValue(data, 'productType', 'Le type de produit fini', PRODUCT_TYPES, 'assiette')
    : '';

  return {
    itemType,
    productType,
    label: requiredString(data, 'label', 'Le libellé', 160),
    quantity: numberValue(data, 'quantity', 'La quantité', { min: 0, required: false }),
    unit: clean(data.unit) || (itemType === 'produit_fini' ? 'unités' : 'kg'),
    minThreshold: numberValue(data, 'minThreshold', 'Le seuil minimum', { min: 0, required: false }),
    location: optionalString(data, 'location', 200),
  };
}

export type StockMovementInput = {
  stockId: string;
  type: string;
  quantity: number;
  reference: string | null;
  note: string | null;
};

export function parseStockMovementInput(body: unknown): StockMovementInput {
  const data = asRecord(body);
  return {
    stockId: requiredString(data, 'stockId', 'Le stock', 100),
    type: enumValue(data, 'type', 'Le type de mouvement', STOCK_MOVEMENT_TYPES),
    quantity: numberValue(data, 'quantity', 'La quantité', { min: 0.0001 }),
    reference: optionalString(data, 'reference', 160),
    note: optionalString(data, 'note'),
  };
}

// ─── Partenaires et documents ──────────────────────────────────────────────

export type PartnerInput = {
  name: string;
  type: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  location: string | null;
  contractType: string | null;
  notes: string | null;
  active: boolean;
};

export function parsePartnerInput(body: unknown): PartnerInput {
  const data = asRecord(body);
  const email = optionalString(data, 'email', 200);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ProductionError('Email du partenaire invalide.');
  }
  return {
    name: requiredString(data, 'name', 'Le nom du partenaire', 160),
    type: enumValue(data, 'type', 'Le type de partenaire', PARTNER_TYPES, 'autre'),
    contactName: optionalString(data, 'contactName', 160),
    phone: optionalString(data, 'phone', 60),
    email,
    location: optionalString(data, 'location', 200),
    contractType: optionalString(data, 'contractType', 80),
    notes: optionalString(data, 'notes'),
    active: optionalBoolean(data, 'active') ?? true,
  };
}

export type DocumentInput = {
  name: string;
  category: string;
  url: string;
  mimeType: string | null;
  sizeBytes: number | null;
  entityType: string | null;
  entityId: string | null;
  notes: string | null;
};

export function parseDocumentInput(body: unknown): DocumentInput {
  const data = asRecord(body);
  return {
    name: requiredString(data, 'name', 'Le nom du document', 200),
    category: enumValue(data, 'category', 'La catégorie', DOCUMENT_CATEGORIES, 'autre'),
    url: requiredString(data, 'url', 'Le fichier', 600),
    mimeType: optionalString(data, 'mimeType', 120),
    sizeBytes: integerValue(data, 'sizeBytes', 'La taille', { min: 0, fallback: 0 }) || null,
    entityType: optionalString(data, 'entityType', 80),
    entityId: optionalId(data, 'entityId'),
    notes: optionalString(data, 'notes'),
  };
}

// ─── Utilisateurs, objectifs, paramètres ───────────────────────────────────

export type UserInput = {
  name: string;
  email: string;
  password?: string;
  role: string;
  active: boolean;
};

export function parseUserInput(body: unknown, options: { requirePassword: boolean }): UserInput {
  const data = asRecord(body);
  const email = requiredString(data, 'email', 'L’email', 200).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ProductionError('Email invalide.');

  const role = clean(data.role);
  if (!isAdminRole(role) || !(ADMIN_ROLES as readonly string[]).includes(role)) {
    throw new ProductionError('Rôle invalide.');
  }

  const password = clean(data.password);
  if (options.requirePassword && password.length < 8) {
    throw new ProductionError('Le mot de passe doit contenir au moins 8 caractères.');
  }
  if (password && password.length < 8) {
    throw new ProductionError('Le mot de passe doit contenir au moins 8 caractères.');
  }

  return {
    name: requiredString(data, 'name', 'Le nom', 160),
    email,
    password: password || undefined,
    role,
    active: optionalBoolean(data, 'active') ?? true,
  };
}

export type GoalInput = {
  label: string;
  description: string | null;
  metric: string;
  target: number;
  unit: string;
  startDate: Date;
  endDate: Date | null;
  status: string;
};

export function parseGoalInput(body: unknown): GoalInput {
  const data = asRecord(body);
  return {
    label: requiredString(data, 'label', 'Le libellé de l’objectif', 160),
    description: optionalString(data, 'description'),
    metric: requiredString(data, 'metric', 'La métrique', 80),
    target: numberValue(data, 'target', 'La cible', { min: 0.01 }),
    unit: clean(data.unit) || 'pièces',
    startDate: dateValue(data, 'startDate', 'La date de début', new Date()),
    endDate: optionalDate(data, 'endDate'),
    status: clean(data.status) || 'active',
  };
}

export function parseSettingsInput(body: unknown): Record<string, string> {
  const data = asRecord(body);
  const entries = Object.entries(data);
  if (!entries.length) throw new ProductionError('Aucun paramètre à enregistrer.');

  const result: Record<string, string> = {};
  for (const [key, value] of entries) {
    if (!/^[a-zA-Z0-9_.-]{1,80}$/.test(key)) throw new ProductionError(`Clé de paramètre invalide : ${key}.`);
    const stringValue = typeof value === 'number' || typeof value === 'boolean' ? String(value) : clean(value);
    if (stringValue.length > 2000) throw new ProductionError(`Valeur trop longue pour ${key}.`);
    result[key] = stringValue;
  }
  return result;
}
