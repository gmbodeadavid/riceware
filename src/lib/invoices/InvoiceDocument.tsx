import React from 'react';
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from '@react-pdf/renderer';
import type { MappedOrder } from '@/lib/data/mappers';

// ─── Palette RiceWare CI ──────────────────────────────────────────────────────
const C = {
  paddy:     '#2f6b43',
  paddyDeep: '#1f4d30',
  paddySoft: '#71a57d',
  ink:       '#1c2a20',
  inkMuted:  '#5a6456',
  ground:    '#f4f1e4',
  line:      '#ddd6bf',
  white:     '#ffffff',
  paidBg:    '#dcf5e4',
  paidText:  '#1f4d30',
};

// ─── StyleSheet ───────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: C.ink,
    backgroundColor: C.white,
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 44,
  },

  // ── En-tête ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: C.paddy,
    borderBottomStyle: 'solid',
  },
  brandName: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: C.paddy,
    letterSpacing: 0.4,
  },
  brandSub: {
    fontSize: 8,
    color: C.inkMuted,
    marginTop: 3,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  invoiceTitle: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: C.ink,
    letterSpacing: 1,
  },
  invoiceNumber: {
    fontSize: 8,
    color: C.inkMuted,
    marginTop: 2,
  },
  badgePaid: {
    marginTop: 6,
    backgroundColor: C.paidBg,
    borderRadius: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  badgePaidText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: C.paidText,
    letterSpacing: 0.6,
  },
  badgePending: {
    marginTop: 6,
    backgroundColor: '#fef3c7',
    borderRadius: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  badgePendingText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#92400e',
    letterSpacing: 0.6,
  },

  // ── Blocs info (3 colonnes) ────────────────────────────────────────────────
  infoRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  infoBlock: {
    flex: 1,
    backgroundColor: C.ground,
    borderRadius: 6,
    padding: 10,
  },
  infoBlockTitle: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: C.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    marginBottom: 7,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    borderBottomStyle: 'solid',
    paddingBottom: 4,
  },
  infoLine: {
    fontSize: 8.5,
    color: C.ink,
    marginBottom: 2,
    lineHeight: 1.4,
  },
  infoLineBold: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: C.ink,
    marginBottom: 2,
    lineHeight: 1.4,
  },
  infoLineMuted: {
    fontSize: 8,
    color: C.inkMuted,
    marginBottom: 2,
    lineHeight: 1.4,
  },

  // ── Tableau ────────────────────────────────────────────────────────────────
  tableTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: C.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    marginBottom: 6,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: C.paddy,
    borderRadius: 3,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 1,
  },
  tableHeaderText: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: C.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    borderBottomStyle: 'solid',
  },
  tableRowAlt: {
    backgroundColor: C.ground,
  },
  colDes: { flex: 1 },
  colQty: { width: 36, textAlign: 'right' },
  colPU:  { width: 80, textAlign: 'right' },
  colTot: { width: 80, textAlign: 'right' },

  cellNormal: { fontSize: 9, color: C.ink },
  cellSub:    { fontSize: 7.5, color: C.inkMuted, marginTop: 2 },
  cellRight:  { fontSize: 9, color: C.inkMuted, textAlign: 'right' },
  cellBold:   { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.ink, textAlign: 'right' },

  // ── Totaux ─────────────────────────────────────────────────────────────────
  totalsWrapper: {
    marginTop: 4,
    marginLeft: 'auto',
    width: 230,
    marginBottom: 20,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    borderBottomStyle: 'solid',
  },
  totalLabel: { fontSize: 8.5, color: C.inkMuted },
  totalValue: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: C.ink },
  totalFinalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: C.paddy,
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 5,
  },
  totalFinalLabel: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.white, letterSpacing: 0.3 },
  totalFinalValue: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.white },

  // ── Montant en lettres ─────────────────────────────────────────────────────
  amountWords: {
    borderTopWidth: 1,
    borderTopColor: C.line,
    borderTopStyle: 'solid',
    paddingTop: 10,
    marginBottom: 20,
  },
  amountWordsLabel: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: C.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  amountWordsText: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: C.ink,
    lineHeight: 1.5,
  },

  // ── Timeline suivi ─────────────────────────────────────────────────────────
  timelineTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: C.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    marginBottom: 8,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  timelineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: C.paddy,
    marginTop: 1,
    marginRight: 8,
    flexShrink: 0,
  },
  timelineDotMuted: {
    backgroundColor: C.line,
  },
  timelineContent: { flex: 1 },
  timelineLabel: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: C.ink },
  timelineDate:  { fontSize: 8, color: C.inkMuted, marginTop: 1 },

  // ── Merci ──────────────────────────────────────────────────────────────────
  thanksBox: {
    marginTop: 16,
    marginBottom: 8,
    borderTopWidth: 1,
    borderTopColor: C.line,
    borderTopStyle: 'solid',
    paddingTop: 10,
    alignItems: 'center',
  },
  thanksText: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: C.paddySoft,
    textAlign: 'center',
  },
  thanksNote: {
    fontSize: 7.5,
    color: C.inkMuted,
    textAlign: 'center',
    marginTop: 3,
  },

  // ── Pied de page ──────────────────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 44,
    right: 44,
    borderTopWidth: 1,
    borderTopColor: C.line,
    borderTopStyle: 'solid',
    paddingTop: 8,
  },
  footerLine1: {
    fontSize: 7.5,
    color: C.inkMuted,
    textAlign: 'center',
  },
  footerLine2: {
    fontSize: 7,
    color: C.line,
    textAlign: 'center',
    marginTop: 2,
  },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtAmt(amount: number): string {
  if (amount === 0) return 'Inclus';
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(iso));
}

const ONES = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
  'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
const TENS = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];

function belowHundred(n: number): string {
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  if (t === 7) return o === 1 ? 'soixante et onze' : `soixante-${ONES[10 + o]}`;
  if (t === 9) return `quatre-vingt-${ONES[o]}`;
  if (o === 0) return t === 8 ? 'quatre-vingts' : TENS[t];
  if (o === 1 && t !== 8) return `${TENS[t]} et un`;
  return `${TENS[t]}-${ONES[o]}`;
}

function belowThousand(n: number): string {
  if (n < 100) return belowHundred(n);
  const h = Math.floor(n / 100);
  const r = n % 100;
  const prefix = h === 1 ? 'cent' : `${ONES[h]} cent${r === 0 ? 's' : ''}`;
  return r === 0 ? prefix : `${prefix} ${belowHundred(r)}`;
}

/** Convertit un montant entier en FCFA en lettres (jusqu'à 999 999 999). */
export function amountToWords(amount: number): string {
  const n = Math.round(amount);
  if (n === 0) return 'zéro franc CFA';

  const millions   = Math.floor(n / 1_000_000);
  const thousands  = Math.floor((n % 1_000_000) / 1_000);
  const remainder  = n % 1_000;

  const parts: string[] = [];

  if (millions > 0) {
    parts.push(millions === 1 ? 'un million' : `${belowThousand(millions)} millions`);
  }
  if (thousands > 0) {
    parts.push(thousands === 1 ? 'mille' : `${belowThousand(thousands)} mille`);
  }
  if (remainder > 0) {
    parts.push(belowThousand(remainder));
  }

  const base = parts.join(' ');
  // Capitalise first letter
  const capitalized = base.charAt(0).toUpperCase() + base.slice(1);
  const plural = n > 1 ? 's' : '';
  return `${capitalized} franc${plural} CFA`;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  wave: 'Wave', orange_money: 'Orange Money',
  mtn_momo: 'MTN MoMo', moov_money: 'Moov Money', djamo: 'Djamo',
};
const PAYMENT_PLAN_LABELS: Record<string, string> = {
  comptant: 'Paiement comptant', flex: 'Paiement FLEX',
};
const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'En attente', paid: 'Payée', failed: 'Échouée', refunded: 'Remboursée',
};

// ─── Composant ────────────────────────────────────────────────────────────────
export function InvoiceDocument({ order }: { order: MappedOrder }) {
  const generatedAt = new Date();

  const invoiceEmail  = process.env.INVOICE_EMAIL  ?? '';
  const invoicePhone  = process.env.INVOICE_PHONE  ?? '';
  const invoiceRccm   = process.env.INVOICE_RCCM   ?? '';

  const addressLine1 = [order.deliveryAddress?.details, order.deliveryAddress?.district]
    .filter(Boolean).join(', ');
  const addressLine2 = order.deliveryAddress?.city ?? '';

  const isPaid = order.paymentStatus === 'paid';
  const paymentLabel = PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus;
  const planLabel    = order.paymentPlan
    ? (PAYMENT_PLAN_LABELS[order.paymentPlan] ?? order.paymentPlan)
    : null;
  const moyenLabel   = order.preferredPaymentMethod
    ? (PAYMENT_METHOD_LABELS[order.preferredPaymentMethod] ?? order.preferredPaymentMethod)
    : null;

  const totalAmount = order.total.amount;
  const wordsLine   = `${amountToWords(totalAmount)}, toutes taxes comprises.`;

  // Nettoyage du tiret cadratin dans les snapshots existants
  const cleanSnap = (s: string) => s.replace(/\s*—\s*/g, ' · ');

  // Décompose "Produit · Pack label" → [nom, label] pour affichage 2 lignes
  function splitPackName(snapshot: string): [string, string | null] {
    const clean = cleanSnap(snapshot);
    const idx = clean.indexOf(' · ');
    if (idx === -1) return [clean, null];
    return [clean.slice(0, idx), clean.slice(idx + 3)];
  }

  return (
    <Document
      title={`Facture ${order.orderNumber}`}
      author="RiceWare CI"
      subject="Facture de commande"
    >
      <Page size="A4" style={s.page}>

        {/* ══════════════════════ EN-TÊTE ══════════════════════ */}
        <View style={s.header}>
          <View>
            <Text style={s.brandName}>RiceWare CI</Text>
            <Text style={s.brandSub}>Abidjan, Côte d&apos;Ivoire</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.invoiceTitle}>FACTURE</Text>
            <Text style={s.invoiceNumber}>N° {order.orderNumber}</Text>
            <View style={isPaid ? s.badgePaid : s.badgePending}>
              <Text style={isPaid ? s.badgePaidText : s.badgePendingText}>
                {paymentLabel.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* ══════════════════════ 3 BLOCS INFO ══════════════════════ */}
        <View style={s.infoRow}>

          {/* FACTURÉ À */}
          <View style={s.infoBlock}>
            <Text style={s.infoBlockTitle}>Facturé à</Text>
            <Text style={s.infoLineBold}>{order.customerName ?? '—'}</Text>
            {order.customerPhone ? (
              <Text style={s.infoLine}>{order.customerPhone}</Text>
            ) : null}
            {addressLine1 ? <Text style={s.infoLine}>{addressLine1}</Text> : null}
            {addressLine2 ? <Text style={s.infoLine}>{addressLine2}</Text> : null}
          </View>

          {/* COMMANDE */}
          <View style={s.infoBlock}>
            <Text style={s.infoBlockTitle}>Commande</Text>
            <Text style={s.infoLineMuted}>Référence</Text>
            <Text style={s.infoLineBold}>{order.orderNumber}</Text>
            <Text style={[s.infoLineMuted, { marginTop: 5 }]}>
              Commande du {fmtDate(order.createdAt)}
            </Text>
            {order.deliveredAt ? (
              <Text style={s.infoLineMuted}>
                Livrée le {fmtDate(order.deliveredAt)}
              </Text>
            ) : null}
          </View>

          {/* PAIEMENT */}
          <View style={s.infoBlock}>
            <Text style={s.infoBlockTitle}>Paiement</Text>
            {planLabel ? <Text style={s.infoLine}>{planLabel}</Text> : null}
            {moyenLabel ? (
              <Text style={s.infoLineMuted}>Moyen : {moyenLabel}</Text>
            ) : null}
            <Text style={[s.infoLineMuted, { marginTop: 5 }]}>
              Émise le {fmtDate(generatedAt.toISOString())}
            </Text>
            <Text style={s.infoLineMuted}>
              Statut : {paymentLabel.toLowerCase()}
            </Text>
          </View>
        </View>

        {/* ══════════════════════ TABLEAU ══════════════════════ */}
        <Text style={s.tableTitle}>Détail de la commande</Text>

        {/* En-tête tableau */}
        <View style={s.tableHeader}>
          <Text style={[s.tableHeaderText, s.colDes]}>Désignation</Text>
          <Text style={[s.tableHeaderText, s.colQty]}>Qté</Text>
          <Text style={[s.tableHeaderText, s.colPU]}>Prix unitaire</Text>
          <Text style={[s.tableHeaderText, s.colTot]}>Total</Text>
        </View>

        {/* Lignes */}
        {order.lines.map((line, index) => {
          const [packName, packSub] = splitPackName(line.packNameSnapshot);
          return (
            <View key={line.id} style={[s.tableRow, index % 2 !== 0 ? s.tableRowAlt : {}]}>
              <View style={s.colDes}>
                <Text style={s.cellNormal}>{packName}</Text>
                {packSub ? <Text style={s.cellSub}>{packSub}</Text> : null}
              </View>
              <Text style={[s.cellRight, s.colQty]}>{line.quantity}</Text>
              <Text style={[s.cellRight, s.colPU]}>{fmtAmt(line.unitPrice.amount)}</Text>
              <Text style={[s.cellBold, s.colTot]}>{fmtAmt(line.lineTotal.amount)}</Text>
            </View>
          );
        })}

        {/* ══════════════════════ TOTAUX ══════════════════════ */}
        <View style={s.totalsWrapper}>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Sous-total</Text>
            <Text style={s.totalValue}>{fmtAmt(order.subtotal.amount)}</Text>
          </View>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Frais de livraison</Text>
            <Text style={s.totalValue}>
              {order.deliveryFee.amount > 0 ? fmtAmt(order.deliveryFee.amount) : 'Inclus'}
            </Text>
          </View>
          <View style={s.totalFinalRow}>
            <Text style={s.totalFinalLabel}>TOTAL TTC</Text>
            <Text style={s.totalFinalValue}>{fmtAmt(totalAmount)}</Text>
          </View>
        </View>

        {/* ══════════════════════ MONTANT EN LETTRES ══════════════════════ */}
        <View style={s.amountWords}>
          <Text style={s.amountWordsLabel}>
            Arrêtée la présente facture à la somme de
          </Text>
          <Text style={s.amountWordsText}>
            {wordsLine}
          </Text>
        </View>

        {/* ══════════════════════ SUIVI COMMANDE ══════════════════════ */}
        <Text style={s.timelineTitle}>Suivi de la commande</Text>

        <View style={s.timelineRow}>
          <View style={s.timelineDot} />
          <View style={s.timelineContent}>
            <Text style={s.timelineLabel}>Commande confirmée</Text>
            <Text style={s.timelineDate}>
              {fmtDate(order.confirmedAt ?? order.createdAt)}
            </Text>
          </View>
        </View>

        <View style={s.timelineRow}>
          <View style={[s.timelineDot, order.deliveredAt ? {} : s.timelineDotMuted]} />
          <View style={s.timelineContent}>
            <Text style={s.timelineLabel}>Commande livrée</Text>
            <Text style={s.timelineDate}>
              {order.deliveredAt ? fmtDate(order.deliveredAt) : '—'}
            </Text>
          </View>
        </View>

        <View style={s.timelineRow}>
          <View style={[s.timelineDot, isPaid ? {} : s.timelineDotMuted]} />
          <View style={s.timelineContent}>
            <Text style={s.timelineLabel}>Paiement reçu</Text>
            <Text style={s.timelineDate}>
              {[planLabel, moyenLabel].filter(Boolean).join(' · ') || '—'}
            </Text>
          </View>
        </View>

        <View style={s.timelineRow}>
          <View style={s.timelineDot} />
          <View style={s.timelineContent}>
            <Text style={s.timelineLabel}>Facture émise</Text>
            <Text style={s.timelineDate}>{fmtDate(generatedAt.toISOString())}</Text>
          </View>
        </View>

        {/* ══════════════════════ MERCI ══════════════════════ */}
        <View style={s.thanksBox}>
          <Text style={s.thanksText}>Merci pour votre confiance.</Text>
          <Text style={s.thanksNote}>
            Commande confirmée et livrée. Ce document tient lieu de reçu.
          </Text>
        </View>

        {/* ══════════════════════ PIED DE PAGE ══════════════════════ */}
        <View style={s.footer} fixed>
          <Text style={s.footerLine1}>
            RiceWare CI
            {invoiceEmail  ? ` · ${invoiceEmail}`  : ''}
            {invoicePhone  ? ` · ${invoicePhone}`  : ''}
          </Text>
          {invoiceRccm ? (
            <Text style={s.footerLine2}>
              RCCM : {invoiceRccm}
            </Text>
          ) : null}
        </View>

      </Page>
    </Document>
  );
}
