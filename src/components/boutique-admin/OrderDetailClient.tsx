'use client';

import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import { LuArrowLeft, LuDownload, LuLoader, LuRefreshCw } from 'react-icons/lu';
import { Badge } from '@/components/admin/ui';
import { buttonClassName, selectClassName, selectStyle } from '@/components/admin/fields';
import type { MappedOrder } from '@/lib/data/mappers';

// ─── Constantes ───────────────────────────────────────────────────────────────

const ORDER_STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'received',             label: 'Reçue' },
  { value: 'pending_confirmation', label: 'À confirmer' },
  { value: 'confirmed',            label: 'Confirmée' },
  { value: 'preparing',            label: 'En préparation' },
  { value: 'shipped',              label: 'Expédiée' },
  { value: 'delivered',            label: 'Livrée' },
  { value: 'cancelled',            label: 'Annulée' },
];

const PAYMENT_STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'pending',  label: 'En attente' },
  { value: 'paid',     label: 'Payé' },
  { value: 'failed',   label: 'Échoué' },
  { value: 'refunded', label: 'Remboursé' },
];

const CHANNEL_LABELS: Record<string, string> = {
  site:        'Site web',
  whatsapp:    'WhatsApp',
  phone:       'Téléphone',
  direct_sale: 'Vente directe',
  partner:     'Partenaire',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  wave:         'Wave',
  orange_money: 'Orange Money',
  mtn_momo:     'MTN MoMo',
  moov_money:   'Moov Money',
  djamo:        'Djamo',
};

const DELIVERY_OPTION_LABELS: Record<string, string> = {
  standard: 'Livraison standard',
  express:  'Livraison Express',
};

const PAYMENT_PLAN_LABELS: Record<string, string> = {
  comptant: 'Paiement comptant',
  flex:     'Paiement FLEX',
};

type Tone = 'info' | 'warning' | 'success' | 'danger' | 'neutral';

function statusTone(status: string): Tone {
  switch (status) {
    case 'received':             return 'info';
    case 'pending_confirmation': return 'warning';
    case 'confirmed':            return 'success';
    case 'preparing':            return 'warning';
    case 'shipped':              return 'info';
    case 'delivered':            return 'success';
    case 'cancelled':            return 'danger';
    default:                     return 'neutral';
  }
}

function paymentTone(status: string): Tone {
  switch (status) {
    case 'pending':  return 'warning';
    case 'paid':     return 'success';
    case 'failed':   return 'danger';
    case 'refunded': return 'neutral';
    default:         return 'neutral';
  }
}

function formatAmount(amount: number): string {
  if (amount === 0) return 'À confirmer';
  return new Intl.NumberFormat('fr-FR').format(amount) + '\u00a0FCFA';
}

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function OrderDetailClient({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder]           = useState<MappedOrder | null>(null);
  const [loading, setLoading]       = useState(true);
  const [notFound, setNotFound]     = useState(false);
  const [statusBusy, setStatusBusy]       = useState(false);
  const [statusError, setStatusError]     = useState('');
  const [statusSuccess, setStatusSuccess] = useState('');
  const [downloading, setDownloading]     = useState(false);

  function fetchOrder() {
    setLoading(true);
    setStatusError('');
    setStatusSuccess('');
    fetch(`/api/boutique-admin/orders/${id}`)
      .then(async (r) => {
        if (r.status === 404) { setNotFound(true); setLoading(false); return; }
        if (!r.ok) throw new Error(`Erreur ${r.status}`);
        setOrder((await r.json()) as MappedOrder);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  useEffect(() => { fetchOrder(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function patchField(field: 'status' | 'paymentStatus', value: string) {
    if (!order) return;
    setStatusBusy(true);
    setStatusError('');
    setStatusSuccess('');
    try {
      const res  = await fetch(`/api/boutique-admin/orders/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ [field]: value }),
      });
      const data = (await res.json()) as MappedOrder & { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Mise à jour impossible.');
      setOrder(data);
      setStatusSuccess('Statut mis à jour.');
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Mise à jour impossible.');
    } finally {
      setStatusBusy(false);
    }
  }

  async function handleDownload() {
    if (downloading) return;
    setDownloading(true);
    try {
      const res = await fetch(invoiceUrl);
      if (!res.ok) throw new Error('Génération impossible');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `facture-${order?.orderNumber ?? id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silencieux — le navigateur affichera son propre message
    } finally {
      setDownloading(false);
    }
  }

  // ── Skeleton ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-28 animate-pulse rounded bg-grain/70" />
        <div className="h-9 w-80 animate-pulse rounded-lg bg-grain/70" />
        <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
          <div className="space-y-4">
            <div className="h-56 animate-pulse rounded-xl border border-line bg-surface" />
            <div className="h-40 animate-pulse rounded-xl border border-line bg-surface" />
          </div>
          <div className="h-64 animate-pulse rounded-xl border border-line bg-surface" />
        </div>
      </div>
    );
  }

  // ── 404 ─────────────────────────────────────────────────────────────────────
  if (notFound || !order) {
    return (
      <div className="rounded-xl border border-line bg-surface p-10 text-center">
        <p className="text-lg font-semibold text-ink">Commande introuvable</p>
        <p className="mt-2 text-sm text-ink-muted">Cette commande n&apos;existe pas ou a été supprimée.</p>
        <Link href="/boutique/articles-admin/commandes" className={`mt-4 inline-flex ${buttonClassName('secondary')}`}>
          ← Retour aux commandes
        </Link>
      </div>
    );
  }

  const isDelivered = order.status === 'delivered';
  const invoiceUrl  = `/api/boutique-admin/orders/${id}/invoice`;

  const addressParts = [
    order.deliveryAddress?.details,
    order.deliveryAddress?.district,
    order.deliveryAddress?.city,
  ].filter(Boolean).join(', ');

  const statusLabel  = ORDER_STATUS_OPTIONS.find((o) => o.value === order.status)?.label  ?? order.status;
  const paymentLabel = PAYMENT_STATUS_OPTIONS.find((o) => o.value === order.paymentStatus)?.label ?? order.paymentStatus;

  return (
    <div className="space-y-5">

      {/* ══════════════════════════════════════════════════════════════════════
          EN-TÊTE
      ══════════════════════════════════════════════════════════════════════ */}
      <div>
        {/* En-tête : retour + actualiser */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link
              href="/boutique/articles-admin/commandes"
              aria-label="Retour aux commandes"
              className="inline-flex items-center justify-center rounded-control px-4 py-2.5 transition-colors"
              style={{ backgroundColor: '#f97316', color: '#fff' }}
            >
              <LuArrowLeft size={16} aria-hidden="true" />
            </Link>
            <h1 className="m-0 mt-3 font-display text-2xl font-bold text-ink sm:text-3xl">
              <span className="font-mono-brand text-paddy">{order.orderNumber}</span>
            </h1>
            <p className="mt-1 text-sm text-ink-muted">
              Reçue le {formatDateTime(order.createdAt)}
              {order.deliveredAt ? (
                <> · Livrée le <span className="text-paddy-deep font-medium">{formatDateTime(order.deliveredAt)}</span></>
              ) : null}
            </p>
          </div>

          <button
            type="button"
            onClick={fetchOrder}
            title="Actualiser"
            className={buttonClassName('ghost')}
          >
            <LuRefreshCw size={15} aria-hidden="true" />
            Actualiser
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          CORPS : colonne principale + sidebar
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="grid gap-5 lg:grid-cols-[1fr_300px] lg:items-start">

        {/* ── Colonne principale ─────────────────────────────────────────── */}
        <div className="space-y-5 min-w-0">

          {/* Lignes de commande */}
          <section className="rounded-xl border border-line bg-surface">
            <div className="border-b border-line px-5 py-4">
              <h2 className="m-0 font-display text-base font-semibold text-ink">
                Lignes de commande
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
                    <th className="px-5 py-3 text-left font-semibold">Désignation</th>
                    <th className="px-4 py-3 text-right font-semibold">Qté</th>
                    <th className="px-4 py-3 text-right font-semibold">Prix unitaire</th>
                    <th className="px-5 py-3 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {order.lines.map((line, index) => (
                    <tr key={line.id} className={index % 2 !== 0 ? 'bg-ground/40' : ''}>
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-ink leading-snug">{line.packNameSnapshot.replace(/\s*—\s*/g, ' · ')}</p>
                        {Array.isArray(line.packContentSnapshot) && line.packContentSnapshot.length > 0 && (
                          <ul className="mt-1 space-y-0.5">
                            {(line.packContentSnapshot as Array<{ productNameSnapshot: string; quantity: number }>).map((comp, i) => (
                              <li key={i} className="text-[11px] text-ink-muted">
                                {comp.quantity}× {comp.productNameSnapshot}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono-brand text-sm font-semibold tabular-nums text-ink">
                        {line.quantity}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono-brand text-sm tabular-nums text-ink-muted">
                        {formatAmount(line.unitPrice.amount)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono-brand text-sm font-semibold tabular-nums text-ink">
                        {formatAmount(line.lineTotal.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-line bg-ground/60 text-sm">
                  <tr className="border-t border-line">
                    <td colSpan={3} className="px-5 py-3 text-right font-semibold text-ink">Total TTC</td>
                    <td className="px-5 py-3 text-right font-mono-brand text-base font-bold tabular-nums text-paddy-deep">
                      {formatAmount(order.total.amount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          {/* Client & Livraison */}
          <section className="rounded-xl border border-line bg-surface">
            <div className="border-b border-line px-5 py-4">
              <h2 className="m-0 font-display text-base font-semibold text-ink">
                Client &amp; Livraison
              </h2>
            </div>
            <div className="grid gap-0 divide-y divide-line sm:grid-cols-2 sm:divide-x sm:divide-y-0">

              {/* Bloc client */}
              <dl className="grid gap-3 px-5 py-4 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Client</p>
                <div className="flex gap-3">
                  <dt className="w-20 shrink-0 text-ink-muted">Nom</dt>
                  <dd className="font-medium text-ink">{order.customerName ?? '—'}</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="w-20 shrink-0 text-ink-muted">Téléphone</dt>
                  <dd className="font-medium text-ink">{order.customerPhone ?? '—'}</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="w-20 shrink-0 text-ink-muted">Adresse</dt>
                  <dd className="text-ink">{addressParts || '—'}</dd>
                </div>
                {order.deliveryAddress?.deliveryInstructions && (
                  <div className="flex gap-3">
                    <dt className="w-20 shrink-0 text-ink-muted">Instructions</dt>
                    <dd className="italic text-ink-muted">{order.deliveryAddress.deliveryInstructions}</dd>
                  </div>
                )}
              </dl>

              {/* Bloc options */}
              <dl className="grid gap-3 px-5 py-4 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Options</p>
                <div className="flex gap-3">
                  <dt className="w-28 shrink-0 text-ink-muted">Canal</dt>
                  <dd className="text-ink">{CHANNEL_LABELS[order.channel] ?? order.channel}</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="w-28 shrink-0 text-ink-muted">Livraison</dt>
                  <dd className="text-ink">
                    {order.deliveryOption ? (DELIVERY_OPTION_LABELS[order.deliveryOption] ?? order.deliveryOption) : '—'}
                  </dd>
                </div>
                <div className="flex gap-3">
                  <dt className="w-28 shrink-0 text-ink-muted">Paiement</dt>
                  <dd className="text-ink">
                    {order.paymentPlan ? (PAYMENT_PLAN_LABELS[order.paymentPlan] ?? order.paymentPlan) : '—'}
                  </dd>
                </div>
                <div className="flex gap-3">
                  <dt className="w-28 shrink-0 text-ink-muted">Moyen préféré</dt>
                  <dd className="text-ink">
                    {order.preferredPaymentMethod
                      ? (PAYMENT_METHOD_LABELS[order.preferredPaymentMethod] ?? order.preferredPaymentMethod)
                      : '—'}
                  </dd>
                </div>
              </dl>
            </div>
          </section>

        </div>{/* /colonne principale */}

        {/* ── Sidebar ────────────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Section statut + facture */}
          <section className="rounded-xl border border-line bg-surface divide-y divide-line">

            {/* Badges état actuels */}
            <div className="px-4 py-4">
              <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                État actuel
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge tone={statusTone(order.status)}>{statusLabel}</Badge>
                <Badge tone={paymentTone(order.paymentStatus)}>{paymentLabel}</Badge>
                {order.channel && (
                  <Badge tone="neutral">{CHANNEL_LABELS[order.channel] ?? order.channel}</Badge>
                )}
              </div>
            </div>

            {/* Selects mise à jour */}
            <div className="px-4 py-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Mettre à jour
              </p>

              <div className="grid gap-1.5">
                <label htmlFor="order-status-select" className="text-sm font-medium text-ink">
                  Statut commande
                </label>
                <select
                  id="order-status-select"
                  value={order.status}
                  disabled={statusBusy}
                  onChange={(e) => void patchField('status', e.target.value)}
                  className={selectClassName}
                  style={selectStyle}
                >
                  {ORDER_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid gap-1.5">
                <label htmlFor="payment-status-select" className="text-sm font-medium text-ink">
                  Statut paiement
                </label>
                <select
                  id="payment-status-select"
                  value={order.paymentStatus}
                  disabled={statusBusy}
                  onChange={(e) => void patchField('paymentStatus', e.target.value)}
                  className={selectClassName}
                  style={selectStyle}
                >
                  {PAYMENT_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {statusBusy && (
                <p className="text-xs text-ink-muted">Mise à jour en cours…</p>
              )}
              {statusError && !statusBusy && (
                <p role="alert" className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
                  {statusError}
                </p>
              )}
              {statusSuccess && !statusBusy && (
                <p role="status" className="rounded-lg border border-paddy/30 bg-paddy/5 px-3 py-2 text-xs font-medium text-paddy-deep">
                  {statusSuccess}
                </p>
              )}
            </div>

            {/* Facture PDF (si livré) */}
            {isDelivered && (
              <div className="px-4 py-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Facture
                </p>
                <button
                  type="button"
                  onClick={() => void handleDownload()}
                  disabled={downloading}
                  className={`w-full justify-center ${buttonClassName('primary')}`}
                >
                  {downloading ? (
                    <>
                      <LuLoader size={15} aria-hidden="true" className="animate-spin" />
                      Génération en cours…
                    </>
                  ) : (
                    <>
                      <LuDownload size={15} aria-hidden="true" />
                      Télécharger le PDF
                    </>
                  )}
                </button>
              </div>
            )}
          </section>


        </div>{/* /sidebar */}

      </div>{/* /grid */}
    </div>
  );
}
