import type { ExportColumn } from '@/lib/reports/csv';
import type { SimplePdfInput } from '@/lib/reports/pdf';
import type { DashboardData } from '@/lib/production/queries';
import { formatCurrency, formatDate, formatDateTime, formatNumber, formatPercent } from '@/lib/format';
import {
  computeBatchCost,
  computeCostPerUnit,
  computeRejectRate,
  computeYield,
  labelOf,
  LOT_STATUSES,
  LOT_VISUAL_QUALITIES,
  PARTNER_TYPES,
  PRODUCT_TYPES,
  STOCK_ITEM_TYPES,
  TEST_RESULTS,
  TEST_TYPES,
} from '@/lib/production/types';

type LotRow = {
  code: string;
  receivedAt: Date | string;
  rizerie: { name: string; location?: string };
  grossWeightKg: number;
  tareWeightKg: number;
  netWeightKg: number;
  humidityPct: number;
  visualQuality: string;
  status: string;
  _count?: { batches: number };
  notes?: string | null;
};

type BatchRow = {
  code: string;
  startedAt: Date | string;
  productType: string;
  powderKg: number;
  binderKg: number;
  mixHumidityPct: number;
  pressingTempC: number;
  pressureMpa: number;
  cycleTimeMin: number;
  piecesProduced: number;
  rejects: number;
  rejectCause?: string | null;
  observations?: string | null;
  powderCostFcfa: number;
  binderCostFcfa: number;
  laborCostFcfa: number;
  energyCostFcfa: number;
  lot?: { code: string } | null;
  operator?: { name: string } | null;
};

type StockRow = {
  itemType: string;
  productType?: string;
  label: string;
  quantity: number;
  unit: string;
  minThreshold: number;
  location?: string | null;
  updatedAt: Date | string;
};

type TestRow = {
  testedAt: Date | string;
  typeTest: string;
  result: string;
  loadKg?: number | null;
  durationMin?: number | null;
  waterMl?: number | null;
  waterTempC?: number | null;
  cracks?: boolean | null;
  bubbles?: boolean | null;
  deformations?: boolean | null;
  thicknessAvgMm?: number | null;
  notes?: string | null;
  operator?: { name: string } | null;
  produitFini?: { type: string; batch?: { code: string } } | null;
  batch?: { code: string } | null;
};

type ProductRow = {
  type: string;
  weightG: number;
  thicknessMm: number;
  leakTest?: boolean | null;
  loadTestKg?: number | null;
  status: string;
  createdAt: Date | string;
  batch?: { code: string };
};

export const lotColumns: ExportColumn<LotRow>[] = [
  { key: 'code', label: 'ID unique', value: (row) => row.code },
  { key: 'date', label: 'Date de réception', value: (row) => formatDateTime(row.receivedAt) },
  { key: 'rizerie', label: 'Rizerie', value: (row) => row.rizerie.name },
  { key: 'localisation', label: 'Localisation', value: (row) => row.rizerie.location ?? '' },
  { key: 'gross', label: 'Poids brut (kg)', value: (row) => row.grossWeightKg },
  { key: 'tare', label: 'Tare (kg)', value: (row) => row.tareWeightKg },
  { key: 'net', label: 'Poids net (kg)', value: (row) => row.netWeightKg },
  { key: 'humidity', label: 'Humidité (%)', value: (row) => row.humidityPct },
  { key: 'visual', label: 'État visuel', value: (row) => labelOf(LOT_VISUAL_QUALITIES, row.visualQuality) },
  { key: 'status', label: 'Statut', value: (row) => labelOf(LOT_STATUSES, row.status) },
  { key: 'batches', label: 'Batches', value: (row) => row._count?.batches ?? 0 },
  { key: 'notes', label: 'Observations', value: (row) => row.notes ?? '' },
];

export const batchColumns: ExportColumn<BatchRow>[] = [
  { key: 'code', label: 'Code batch', value: (row) => row.code },
  { key: 'date', label: 'Date', value: (row) => formatDateTime(row.startedAt) },
  { key: 'lot', label: 'Lot de coques', value: (row) => row.lot?.code ?? '—' },
  { key: 'type', label: 'Produit', value: (row) => labelOf(PRODUCT_TYPES, row.productType) },
  { key: 'powder', label: 'Poudre (kg)', value: (row) => row.powderKg },
  { key: 'binder', label: 'Liant (kg)', value: (row) => row.binderKg },
  { key: 'mixHumidity', label: 'Humidité mélange (%)', value: (row) => row.mixHumidityPct },
  { key: 'temp', label: 'Température (°C)', value: (row) => row.pressingTempC },
  { key: 'pressure', label: 'Pression (MPa)', value: (row) => row.pressureMpa },
  { key: 'cycle', label: 'Cycle (min)', value: (row) => row.cycleTimeMin },
  { key: 'pieces', label: 'Pièces produites', value: (row) => row.piecesProduced },
  { key: 'rejects', label: 'Rebuts', value: (row) => row.rejects },
  { key: 'yield', label: 'Rendement (%)', value: (row) => computeYield(row.piecesProduced, row.rejects).toFixed(1) },
  { key: 'rejectRate', label: 'Taux de rebut (%)', value: (row) => computeRejectRate(row.piecesProduced, row.rejects).toFixed(1) },
  { key: 'cause', label: 'Cause rebut', value: (row) => row.rejectCause ?? '' },
  { key: 'cost', label: 'Coût batch (FCFA)', value: (row) => computeBatchCost(row).toFixed(0) },
  { key: 'unitCost', label: 'Coût / pièce (FCFA)', value: (row) => computeCostPerUnit(row).toFixed(0) },
  { key: 'operator', label: 'Opérateur', value: (row) => row.operator?.name ?? '' },
  { key: 'observations', label: 'Observations', value: (row) => row.observations ?? '' },
];

export const stockColumns: ExportColumn<StockRow>[] = [
  { key: 'type', label: 'Type', value: (row) => labelOf(STOCK_ITEM_TYPES, row.itemType) },
  { key: 'product', label: 'Produit', value: (row) => (row.productType ? labelOf(PRODUCT_TYPES, row.productType) : '') },
  { key: 'label', label: 'Libellé', value: (row) => row.label },
  { key: 'quantity', label: 'Quantité', value: (row) => row.quantity },
  { key: 'unit', label: 'Unité', value: (row) => row.unit },
  { key: 'threshold', label: 'Seuil minimum', value: (row) => row.minThreshold },
  { key: 'location', label: 'Emplacement', value: (row) => row.location ?? '' },
  { key: 'alerts', label: 'Alerte', value: (row) => (row.minThreshold > 0 && row.quantity <= row.minThreshold ? 'Oui' : 'Non') },
  { key: 'updated', label: 'Dernière mise à jour', value: (row) => formatDateTime(row.updatedAt) },
];

export const testColumns: ExportColumn<TestRow>[] = [
  { key: 'date', label: 'Date', value: (row) => formatDateTime(row.testedAt) },
  { key: 'type', label: 'Type de test', value: (row) => labelOf(TEST_TYPES, row.typeTest) },
  { key: 'result', label: 'Résultat', value: (row) => labelOf(TEST_RESULTS, row.result) },
  { key: 'batch', label: 'Batch', value: (row) => row.produitFini?.batch?.code ?? row.batch?.code ?? '' },
  { key: 'product', label: 'Produit', value: (row) => (row.produitFini ? labelOf(PRODUCT_TYPES, row.produitFini.type) : 'Batch entier') },
  { key: 'load', label: 'Charge (kg)', value: (row) => row.loadKg ?? '' },
  { key: 'duration', label: 'Durée (min)', value: (row) => row.durationMin ?? '' },
  { key: 'water', label: 'Eau (mL)', value: (row) => row.waterMl ?? '' },
  { key: 'waterTemp', label: 'Température eau (°C)', value: (row) => row.waterTempC ?? '' },
  { key: 'thickness', label: 'Épaisseur moyenne (mm)', value: (row) => row.thicknessAvgMm ?? '' },
  { key: 'cracks', label: 'Fissures', value: (row) => (row.cracks == null ? '' : row.cracks ? 'Oui' : 'Non') },
  { key: 'bubbles', label: 'Bulles', value: (row) => (row.bubbles == null ? '' : row.bubbles ? 'Oui' : 'Non') },
  { key: 'deformations', label: 'Déformations', value: (row) => (row.deformations == null ? '' : row.deformations ? 'Oui' : 'Non') },
  { key: 'operator', label: 'Opérateur', value: (row) => row.operator?.name ?? '' },
  { key: 'notes', label: 'Notes', value: (row) => row.notes ?? '' },
];

export const productColumns: ExportColumn<ProductRow>[] = [
  { key: 'batch', label: 'Batch', value: (row) => row.batch?.code ?? '' },
  { key: 'type', label: 'Type', value: (row) => labelOf(PRODUCT_TYPES, row.type) },
  { key: 'weight', label: 'Poids (g)', value: (row) => row.weightG },
  { key: 'thickness', label: 'Épaisseur (mm)', value: (row) => row.thicknessMm },
  { key: 'leak', label: 'Étanchéité', value: (row) => (row.leakTest == null ? '' : row.leakTest ? 'OK' : 'Échec') },
  { key: 'load', label: 'Charge (kg)', value: (row) => row.loadTestKg ?? '' },
  { key: 'status', label: 'Statut', value: (row) => (row.status === 'valide' ? 'Validé' : 'Rejeté') },
  { key: 'created', label: 'Créé le', value: (row) => formatDate(row.createdAt) },
];

export const partnerColumns: ExportColumn<{
  name: string;
  type: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  location?: string | null;
  contractType?: string | null;
  active: boolean;
}>[] = [
  { key: 'name', label: 'Nom', value: (row) => row.name },
  { key: 'type', label: 'Type', value: (row) => labelOf(PARTNER_TYPES, row.type) },
  { key: 'contact', label: 'Contact', value: (row) => row.contactName ?? '' },
  { key: 'phone', label: 'Téléphone', value: (row) => row.phone ?? '' },
  { key: 'email', label: 'Email', value: (row) => row.email ?? '' },
  { key: 'location', label: 'Localisation', value: (row) => row.location ?? '' },
  { key: 'contract', label: 'Contrat', value: (row) => row.contractType ?? '' },
  { key: 'active', label: 'Actif', value: (row) => (row.active ? 'Oui' : 'Non') },
];

export const orderColumns: ExportColumn<{
  orderNumber: string;
  createdAt: Date | string;
  customerName?: string;
  channel: string;
  status: string;
  paymentStatus: string;
  total: { amount: number; currency: string };
}>[] = [
  { key: 'number', label: 'Commande', value: (row) => row.orderNumber },
  { key: 'date', label: 'Date', value: (row) => formatDateTime(row.createdAt) },
  { key: 'customer', label: 'Client', value: (row) => row.customerName ?? '' },
  { key: 'channel', label: 'Canal', value: (row) => row.channel },
  { key: 'status', label: 'Statut', value: (row) => row.status },
  { key: 'payment', label: 'Paiement', value: (row) => row.paymentStatus },
  { key: 'total', label: 'Total', value: (row) => row.total.amount },
  { key: 'currency', label: 'Devise', value: (row) => row.total.currency },
];

// ─── Rapports PDF ──────────────────────────────────────────────────────────

export function buildBatchQualityPdf(
  batch: BatchRow & {
    products: ProductRow[];
    tests: TestRow[];
    lot?: { code: string } | null;
  },
): SimplePdfInput {
  return {
    title: `Rapport qualité — ${batch.code}`,
    subtitle: 'Contrôle qualité du batch de production RiceWare CI.',
    meta: [
      `Date de production : ${formatDateTime(batch.startedAt)}`,
      `Lot de coques : ${batch.lot?.code ?? 'non rattaché'}`,
      `Produit : ${labelOf(PRODUCT_TYPES, batch.productType)}`,
      `Opérateur : ${batch.operator?.name ?? 'non renseigné'}`,
      `Rendement : ${formatPercent(computeYield(batch.piecesProduced, batch.rejects))} — Rebut : ${formatPercent(computeRejectRate(batch.piecesProduced, batch.rejects))}`,
      `Coût du batch : ${formatCurrency(computeBatchCost(batch))} — Coût / pièce valide : ${formatCurrency(computeCostPerUnit(batch))}`,
    ],
    sections: [
      {
        title: 'Paramètres de production',
        lines: [
          `Poudre de coques : ${formatNumber(batch.powderKg, 'kg')} — Liant : ${formatNumber(batch.binderKg, 'kg')} — Humidité du mélange : ${formatPercent(batch.mixHumidityPct)}.`,
          `Température de pressage : ${formatNumber(batch.pressingTempC, '°C')} — Pression : ${formatNumber(batch.pressureMpa, 'MPa')} — Temps de cycle : ${formatNumber(batch.cycleTimeMin, 'min')}.`,
          `Pièces produites : ${batch.piecesProduced} — Rebuts : ${batch.rejects}${batch.rejectCause ? ` — Cause principale : ${batch.rejectCause}` : ''}.`,
          batch.observations ? `Observations : ${batch.observations}` : 'Aucune observation de production.',
        ],
      },
    ],
    tables: [
      {
        title: 'Produits finis contrôlés',
        columns: [
          { label: 'Type', width: 70 },
          { label: 'Poids (g)', width: 55 },
          { label: 'Épaisseur (mm)', width: 75 },
          { label: 'Étanchéité', width: 65 },
          { label: 'Charge (kg)', width: 65 },
          { label: 'Statut', width: 60 },
          { label: 'Créé le', width: 80 },
        ],
        rows: batch.products.map((product) => [
          labelOf(PRODUCT_TYPES, product.type),
          product.weightG,
          product.thicknessMm,
          product.leakTest == null ? '—' : product.leakTest ? 'OK' : 'Échec',
          product.loadTestKg ?? '—',
          product.status === 'valide' ? 'Validé' : 'Rejeté',
          formatDate(product.createdAt),
        ]),
      },
      {
        title: 'Tests qualité',
        columns: [
          { label: 'Date', width: 75 },
          { label: 'Type', width: 70 },
          { label: 'Résultat', width: 55 },
          { label: 'Charge', width: 45 },
          { label: 'Eau', width: 45 },
          { label: 'Épaisseur', width: 55 },
          { label: 'Défauts', width: 90 },
        ],
        rows: batch.tests.map((test) => [
          formatDate(test.testedAt),
          labelOf(TEST_TYPES, test.typeTest),
          labelOf(TEST_RESULTS, test.result),
          test.loadKg ?? '—',
          test.waterMl ? `${test.waterMl} mL` : '—',
          test.thicknessAvgMm ?? '—',
          [
            test.cracks ? 'fissures' : '',
            test.bubbles ? 'bulles' : '',
            test.deformations ? 'déformations' : '',
          ]
            .filter(Boolean)
            .join(', ') || 'aucun',
        ]),
      },
    ],
    footer: 'Les paramètres techniques sont des relevés de production. Ils ne valent pas certification externe.',
  };
}

export function buildInventoryPdf(stocks: StockRow[], movements: Array<{
  createdAt: Date | string;
  stock: { label: string; unit: string };
  type: string;
  quantity: number;
  resultingQuantity: number;
  reference?: string | null;
  createdBy?: { name: string } | null;
}>): SimplePdfInput {
  const lowStocks = stocks.filter((stock) => stock.minThreshold > 0 && stock.quantity <= stock.minThreshold);

  return {
    title: 'Inventaire des stocks',
    subtitle: 'État des matières premières, intrants et produits finis.',
    meta: [
      `Date d’édition : ${formatDateTime(new Date())}`,
      `Références suivies : ${stocks.length} — Alertes de seuil : ${lowStocks.length}`,
    ],
    sections: [
      {
        title: 'Synthèse',
        lines: [
          lowStocks.length
            ? `Stocks sous seuil : ${lowStocks.map((stock) => `${stock.label} (${formatNumber(stock.quantity, stock.unit)})`).join(', ')}.`
            : 'Aucun stock sous le seuil minimum.',
        ],
      },
    ],
    tables: [
      {
        title: 'Inventaire',
        columns: [
          { label: 'Type', width: 85 },
          { label: 'Libellé', width: 140 },
          { label: 'Quantité', width: 60 },
          { label: 'Unité', width: 40 },
          { label: 'Seuil', width: 45 },
          { label: 'Emplacement', width: 80 },
          { label: 'Alerte', width: 45 },
        ],
        rows: stocks.map((stock) => [
          labelOf(STOCK_ITEM_TYPES, stock.itemType),
          stock.label,
          stock.quantity,
          stock.unit,
          stock.minThreshold,
          stock.location ?? '—',
          stock.minThreshold > 0 && stock.quantity <= stock.minThreshold ? 'OUI' : '—',
        ]),
      },
      {
        title: 'Derniers mouvements',
        columns: [
          { label: 'Date', width: 80 },
          { label: 'Stock', width: 130 },
          { label: 'Type', width: 60 },
          { label: 'Mouvement', width: 60 },
          { label: 'Solde', width: 60 },
          { label: 'Référence', width: 90 },
        ],
        rows: movements.slice(0, 30).map((movement) => [
          formatDateTime(movement.createdAt),
          movement.stock.label,
          movement.type,
          `${movement.quantity > 0 ? '+' : ''}${formatNumber(movement.quantity, movement.stock.unit)}`,
          formatNumber(movement.resultingQuantity, movement.stock.unit),
          movement.reference ?? '—',
        ]),
      },
    ],
    footer: 'Document interne RiceWare CI — à conserver avec les pièces justificatives.',
  };
}

export function buildDashboardPdf(data: DashboardData): SimplePdfInput {
  const kpis = data.kpis;
  return {
    title: 'Tableau de bord RiceWare CI',
    subtitle: 'Indicateurs de production, qualité, stocks et impact Greenpreneur.',
    meta: [
      `Édité le ${formatDateTime(new Date())}`,
      `Période analysée : mois en cours et six derniers mois`,
      `Production du mois : ${kpis.monthPieces} pièces — Rendement : ${formatPercent(kpis.yieldRate)} — Rebut : ${formatPercent(kpis.rejectRate)}`,
      `Coût moyen par pièce : ${formatCurrency(kpis.costPerUnit)} — Chiffre d’affaires encaissé : ${formatCurrency(kpis.revenue)}`,
    ],
    sections: [
      {
        title: 'Objectif Greenpreneur',
        lines: [
          `Cible : ${formatNumber(kpis.greenpreneurTarget, 'pièces')} — Production cumulée suivie : ${formatNumber(kpis.totalPiecesForGoal, 'pièces')} — Avancement : ${formatPercent(kpis.greenpreneurProgress)}.`,
        ],
      },
      {
        title: 'Qualité et stocks',
        lines: [
          `Tests qualité : ${kpis.testsPassed} succès, ${kpis.testsFailed} échec(s), taux de réussite ${formatPercent(kpis.testPassRate)}.`,
          `Stocks sous seuil : ${kpis.lowStockCount}. Rizeries actives : ${kpis.activeRizeries}. Partenaires actifs : ${kpis.activePartners}.`,
        ],
      },
    ],
    tables: [
      {
        title: 'Production par semaine',
        columns: [
          { label: 'Semaine' },
          { label: 'Pièces produites' },
          { label: 'Pièces valides' },
          { label: 'Rebuts' },
          { label: 'Coût / pièce' },
        ],
        rows: data.weekly.map((week) => [
          week.label,
          week.pieces,
          week.valid,
          week.rejects,
          formatCurrency(week.costPerUnit),
        ]),
      },
      {
        title: 'Répartition des rebuts',
        columns: [{ label: 'Cause' }, { label: 'Pièces rebutées' }],
        rows: data.rejectCauses.length
          ? data.rejectCauses.map((cause) => [cause.label, cause.quantity])
          : [['Aucun rebut enregistré sur la période', 0]],
      },
    ],
    footer: 'Les données proviennent des saisies opérationnelles. Elles doivent être rapprochées des inventaires physiques.',
  };
}
