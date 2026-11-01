import fs   from 'node:fs';
import path from 'node:path';
import type { MappedOrder } from '@/lib/data/mappers';

// ─── Montant en lettres ───────────────────────────────────────────────────────

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

function amountToWords(amount: number): string {
  const n = Math.round(amount);
  if (n === 0) return 'Zéro franc CFA';
  const millions  = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1_000);
  const remainder = n % 1_000;
  const parts: string[] = [];
  if (millions  > 0) parts.push(millions  === 1 ? 'un million'  : `${belowThousand(millions)} millions`);
  if (thousands > 0) parts.push(thousands === 1 ? 'mille'       : `${belowThousand(thousands)} mille`);
  if (remainder > 0) parts.push(belowThousand(remainder));
  const base = parts.join(' ');
  const cap  = base.charAt(0).toUpperCase() + base.slice(1);
  return `${cap} franc${n > 1 ? 's' : ''} CFA`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtAmt(amount: number): string {
  if (amount === 0) return 'Inclus';
  return new Intl.NumberFormat('fr-FR').format(amount) + '\u00a0FCFA';
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    .format(new Date(iso));
}

/** Échappe les caractères HTML dangereux. */
function esc(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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

function cleanSnap(s: string): string { return s.replace(/\s*—\s*/g, ' · '); }

function splitPackName(snapshot: string): [string, string | null] {
  const clean = cleanSnap(snapshot);
  const idx   = clean.indexOf(' · ');
  if (idx === -1) return [clean, null];
  return [clean.slice(0, idx), clean.slice(idx + 3)];
}

// ─── Générateur HTML ──────────────────────────────────────────────────────────

export function buildInvoiceHtml(order: MappedOrder): string {
  const generatedAt  = new Date();
  const logoPath = path.join(process.cwd(), 'RiceWare-logo copy.png');
  const logoB64  = fs.readFileSync(logoPath).toString('base64');
  const logoSrc  = `data:image/png;base64,${logoB64}`;
  const invoiceEmail = process.env.INVOICE_EMAIL ?? '';
  const invoicePhone = process.env.INVOICE_PHONE ?? '';
  const invoiceRccm  = process.env.INVOICE_RCCM  ?? '';

  const isPaid       = order.paymentStatus === 'paid';
  const paymentLabel = PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus;
  const planLabel    = order.paymentPlan         ? (PAYMENT_PLAN_LABELS[order.paymentPlan]                 ?? order.paymentPlan)         : null;
  const moyenLabel   = order.preferredPaymentMethod ? (PAYMENT_METHOD_LABELS[order.preferredPaymentMethod] ?? order.preferredPaymentMethod) : null;
  const totalAmount  = order.total.amount;

  const addrLine1 = [order.deliveryAddress?.details, order.deliveryAddress?.district].filter(Boolean).join(', ');
  const addrLine2 = order.deliveryAddress?.city ?? '';

  // Lignes de commande
  const linesHtml = order.lines.map((line, i) => {
    const [name, sub] = splitPackName(line.packNameSnapshot);
    const rowBg       = i % 2 !== 0 ? 'background:#fff' : '';
    return `
      <div class="grid line" style="${rowBg}">
        <div class="designation">
          <b>${esc(name)}</b>
          ${sub ? `<span>${esc(sub)}</span>` : ''}
        </div>
        <div class="qty">${line.quantity}</div>
        <div class="pu">${esc(fmtAmt(line.unitPrice.amount))}</div>
        <div class="tot">${esc(fmtAmt(line.lineTotal.amount))}</div>
      </div>`;
  }).join('');

  // Pied de page contact
  const contactParts = ['RiceWare CI', 'Abidjan, Côte d\'Ivoire'];
  if (invoiceEmail) contactParts.push(invoiceEmail);
  if (invoicePhone) contactParts.push(invoicePhone);
  const contactLine = contactParts.map(esc).join(' · ');

  const rccmLine = invoiceRccm
    ? `RCCM : ${esc(invoiceRccm)}    N° de compte contribuable : ______________________`
    : `RCCM : ______________________    N° de compte contribuable : ______________________`;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Facture ${esc(order.orderNumber)} — RiceWare CI</title>
<style>
:root{
  --linen:#F6F4EC;
  --green:#1A3325;
  --gold:#E9B634;
  --ink:#111813;
  --tint:#ECE8DA;
  --line:#CFCAB6;
  --muted:#55605A;
  --strong:700;
  --sans:"Helvetica Neue","Helvetica",Arial,sans-serif;
  --mono:"Courier New","Courier",monospace;
}
@page{size:A4;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{background:#d9d5c6;font-family:var(--sans);color:var(--ink);font-size:10pt;line-height:1.25}
.page{position:relative;width:210mm;height:297mm;margin:0 auto;padding:16mm 16mm 0;background:var(--linen);overflow:hidden}
.mono{font-family:var(--mono);font-weight:400}
.label{font-family:var(--mono);font-size:7.8pt;color:var(--green);letter-spacing:0}

/* En-tête */
.head{display:flex;justify-content:space-between;height:26mm}
.brand{display:flex;gap:5mm;padding-top:2.4mm}
.brand svg{width:20mm;height:17.6mm;display:block;flex-shrink:0}
.brand h1{font-size:20pt;font-weight:var(--strong);color:var(--green);line-height:1;margin-top:.7mm}
.brand p{font-size:10pt;color:var(--muted);margin-top:2.9mm}
.doc{text-align:right}
.doc h2{font-size:30pt;font-weight:var(--strong);color:var(--green);line-height:1;letter-spacing:0;margin-top:.1mm}
.doc .num{font-family:var(--mono);font-size:8.5pt;margin-top:2.9mm}
.badge{display:inline-flex;align-items:center;gap:2.1mm;margin-top:1.6mm;height:7mm;padding:0 4.2mm 0 3.5mm;border-radius:3.5mm;background:var(--green);color:#fff;font-family:var(--mono);font-size:8.5pt}
.badge i{width:2.4mm;height:2.4mm;border-radius:50%;background:var(--gold);display:block}
.badge.pending{background:#92400e}
.rule{height:1.3mm;background:var(--gold);margin-top:4mm}

/* Blocs d'information */
.meta{display:grid;grid-template-columns:repeat(3,1fr);gap:5mm;margin-top:6.7mm}
.card{height:36mm;background:var(--tint);border-top:.9mm solid var(--green);padding:3.8mm 4mm 0}
.card .label{display:block;margin-bottom:2.5mm}
.card div{font-size:9.5pt;line-height:4.6mm}
.card .strong{font-weight:var(--strong);font-size:10.5pt}
.card .name{font-weight:var(--strong);font-size:11pt}
.card .muted{color:var(--muted);font-size:8.5pt}
.card .ref{font-family:var(--mono);font-size:6.9pt}

/* Détail */
.items{margin-top:9.4mm}
.items>.label{display:block;margin-bottom:2.7mm}
.grid{display:grid;grid-template-columns:94mm 24mm 26mm 34mm;align-items:center}
.grid>*:nth-child(2){text-align:center}
.grid>*:nth-child(3){text-align:right}
.grid>*:nth-child(4){text-align:right;padding-right:4mm}
.grid>*:first-child{padding-left:4mm}
.thead{height:9mm;background:var(--green);color:#fff;font-family:var(--mono);font-size:8pt}
.line{height:20mm;background:#fff;border-bottom:.2mm solid var(--line);font-size:10.5pt;align-items:start;padding-top:0}
.line>*{padding-top:4.2mm}
.line .designation b{display:block;font-size:11.5pt;color:var(--green);font-weight:var(--strong);line-height:1.1}
.line .designation span{display:block;font-size:9.5pt;color:var(--muted);margin-top:1.4mm}
.line .qty{font-size:11pt;padding-top:6.1mm}
.line .pu,.line .tot{padding-top:6.1mm}
.line .tot{font-weight:var(--strong)}

/* Totaux */
.sums{display:flex;justify-content:space-between;margin-top:5.8mm;height:29mm}
.words{width:90mm;height:26mm;background:var(--tint);border-left:1.2mm solid var(--gold);padding:5.2mm 4mm 0 3.8mm}
.words .label{font-size:7pt}
.words strong{display:block;font-size:13pt;font-weight:var(--strong);margin-top:3mm;line-height:1.1}
.words small{display:block;font-size:9pt;color:var(--muted);margin-top:2.2mm}
.totals{width:84mm}
.totals .row{display:flex;justify-content:space-between;height:8mm;align-items:flex-end;padding:0 4mm .8mm 0;border-bottom:.15mm solid var(--line)}
.totals .row:first-child{margin-top:-3.3mm}
.totals .grand{display:flex;justify-content:space-between;align-items:center;height:13mm;margin:3.2mm 0 0 -3mm;padding:0 4mm 0 4mm;background:var(--green);color:var(--linen)}
.totals .grand .label{color:var(--linen);font-size:9pt}
.totals .grand b{font-size:15pt;font-weight:var(--strong);color:var(--gold)}

/* Suivi */
.track{margin-top:30.5mm}
.track ol{list-style:none;display:grid;grid-template-columns:repeat(4,1fr);position:relative;margin-top:3.7mm}
.track ol::before{content:"";position:absolute;left:12.5%;right:12.5%;top:2.6mm;height:.42mm;background:var(--green)}
.track li{position:relative;text-align:center}
.track li::before{content:"";display:block;width:5.2mm;height:5.2mm;margin:0 auto 3.2mm;border-radius:50%;background:var(--gold);border:.42mm solid var(--green);position:relative}
.track li.muted::before{background:var(--line)}
.track li b{display:block;font-size:9.5pt;font-weight:var(--strong);color:var(--green)}
.track li span{display:block;font-size:8.8pt;color:var(--muted);margin-top:1mm}

/* Remerciement + pied de page */
.thanks{position:absolute;left:16mm;right:16mm;top:238mm;height:16mm;background:var(--green);color:var(--linen);display:flex;align-items:center;padding-left:6mm;font-size:13pt;font-weight:var(--strong)}
.foot{position:absolute;left:16mm;right:16mm;top:261mm}
.foot .note{font-weight:var(--strong);font-size:9.5pt}
.foot hr{border:0;border-top:.2mm solid var(--line);margin:4.8mm 0 4mm}
.foot .contact{font-size:8.5pt;color:var(--muted)}
.foot .legal{font-family:var(--mono);font-size:7.5pt;color:var(--muted);margin-top:2.75mm;white-space:pre}
</style>
</head>
<body>
<main class="page">

  <header class="head">
    <div class="brand">
      <img src="${logoSrc}" style="width:20mm;height:17.6mm;display:block;object-fit:contain;flex-shrink:0">
      <div>
        <h1>RiceWare CI</h1>
        <p>Abidjan, Côte d'Ivoire</p>
      </div>
    </div>
    <div class="doc">
      <h2>FACTURE</h2>
      <div class="num">N° ${esc(order.orderNumber)}</div>
      <span class="badge${isPaid ? '' : ' pending'}"><i></i>${esc(paymentLabel.toUpperCase())}</span>
    </div>
  </header>
  <div class="rule"></div>

  <section class="meta">
    <article class="card">
      <span class="label">FACTURÉ À</span>
      <div class="name">${esc(order.customerName ?? '—')}</div>
      ${order.customerPhone ? `<div>${esc(order.customerPhone)}</div>` : ''}
      ${addrLine1 ? `<div>${esc(addrLine1)}${addrLine2 ? `, ${esc(addrLine2)}` : ''}</div>` : (addrLine2 ? `<div>${esc(addrLine2)}</div>` : '')}
    </article>
    <article class="card">
      <span class="label">COMMANDE</span>
      <div class="muted">Référence</div>
      <div class="ref">${esc(order.orderNumber)}</div>
      <div>Commande du ${esc(fmtDate(order.createdAt))}</div>
      ${order.deliveredAt ? `<div>Livrée le ${esc(fmtDate(order.deliveredAt))}</div>` : ''}
    </article>
    <article class="card">
      <span class="label">PAIEMENT</span>
      ${planLabel  ? `<div class="strong">${esc(planLabel)}</div>`    : ''}
      ${moyenLabel ? `<div>Moyen : ${esc(moyenLabel)}</div>`          : ''}
      <div>Émise le ${esc(fmtDate(generatedAt.toISOString()))}</div>
      <div>Statut : ${esc(paymentLabel.toLowerCase())}</div>
    </article>
  </section>

  <section class="items">
    <span class="label">DÉTAIL DE LA COMMANDE</span>
    <div class="grid thead"><span>DÉSIGNATION</span><span>QTÉ</span><span>PRIX UNITAIRE</span><span>TOTAL</span></div>
    ${linesHtml}
  </section>

  <section class="sums">
    <div class="words">
      <span class="label">ARRÊTÉE LA PRÉSENTE FACTURE À LA SOMME DE</span>
      <strong>${esc(amountToWords(totalAmount))}</strong>
      <small>(${esc(fmtAmt(totalAmount))}), toutes taxes comprises.</small>
    </div>
    <div class="totals">
      <div class="row"><span>Sous-total</span><span>${esc(fmtAmt(order.subtotal.amount))}</span></div>
      <div class="row"><span>Frais de livraison</span><span>${order.deliveryFee.amount > 0 ? esc(fmtAmt(order.deliveryFee.amount)) : 'Inclus'}</span></div>
      <div class="grand"><span class="label">TOTAL TTC</span><b>${esc(fmtAmt(totalAmount))}</b></div>
    </div>
  </section>

  <section class="track">
    <span class="label">SUIVI DE LA COMMANDE</span>
    <ol>
      <li><b>Commande confirmée</b><span>${esc(fmtDate(order.confirmedAt ?? order.createdAt))}</span></li>
      <li class="${order.deliveredAt ? '' : 'muted'}"><b>Commande livrée</b><span>${order.deliveredAt ? esc(fmtDate(order.deliveredAt)) : '—'}</span></li>
      <li class="${isPaid ? '' : 'muted'}"><b>Paiement reçu</b><span>${esc([planLabel, moyenLabel].filter(Boolean).join(' · ') || '—')}</span></li>
      <li><b>Facture émise</b><span>${esc(fmtDate(generatedAt.toISOString()))}</span></li>
    </ol>
  </section>

  <div class="thanks">Merci pour votre confiance.</div>

  <footer class="foot">
    <p class="note">Commande confirmée et livrée. Ce document tient lieu de reçu.</p>
    <hr>
    <p class="contact">${contactLine}</p>
    <p class="legal">${rccmLine}</p>
  </footer>

</main>
</body>
</html>`;
}
