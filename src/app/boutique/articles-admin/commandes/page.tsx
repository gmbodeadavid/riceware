'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PageHeader, Badge, EmptyState } from '@/components/admin/ui';
import { inputClassName, buttonClassName, selectClassName, selectStyle } from '@/components/admin/fields';
import type { MappedOrder } from '@/lib/data/mappers';

// ─── Labels ───────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  received: 'Reçue',
  pending_confirmation: 'En attente',
  confirmed: 'Confirmée',
  preparing: 'En préparation',
  shipped: 'Expédiée',
  delivered: 'Livrée',
  cancelled: 'Annulée',
};

const PAYMENT_LABELS: Record<string, string> = {
  pending: 'En attente',
  paid: 'Payée',
  failed: 'Échouée',
  refunded: 'Remboursée',
};

const ORDER_STATUS_OPTIONS = [
  { value: 'received', label: 'Reçue' },
  { value: 'pending_confirmation', label: 'En attente confirmation' },
  { value: 'confirmed', label: 'Confirmée' },
  { value: 'preparing', label: 'En préparation' },
  { value: 'shipped', label: 'Expédiée' },
  { value: 'delivered', label: 'Livrée' },
  { value: 'cancelled', label: 'Annulée' },
];

const PAYMENT_STATUS_OPTIONS = [
  { value: 'pending', label: 'En attente' },
  { value: 'paid', label: 'Payée' },
  { value: 'failed', label: 'Échouée' },
  { value: 'refunded', label: 'Remboursée' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAmount(amount: number): string {
  if (amount === 0) return 'À confirmer';
  return new Intl.NumberFormat('fr-FR').format(amount) + ' XOF';
}

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

type StatusTone = 'info' | 'warning' | 'success' | 'danger' | 'neutral';

function statusTone(status: string): StatusTone {
  switch (status) {
    case 'received': return 'info';
    case 'pending_confirmation': return 'warning';
    case 'confirmed': return 'success';
    case 'preparing': return 'warning';
    case 'shipped': return 'info';
    case 'delivered': return 'success';
    case 'cancelled': return 'danger';
    default: return 'neutral';
  }
}

function paymentTone(status: string): StatusTone {
  switch (status) {
    case 'pending': return 'warning';
    case 'paid': return 'success';
    case 'failed': return 'danger';
    case 'refunded': return 'neutral';
    default: return 'neutral';
  }
}

// ─── Composant ────────────────────────────────────────────────────────────────

type Filters = { status: string; paymentStatus: string };

export default function CommandesPage() {
  const [orders, setOrders] = useState<MappedOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({ status: '', paymentStatus: '' });
  const [applied, setApplied] = useState<Filters>({ status: '', paymentStatus: '' });

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (applied.status) params.set('status', applied.status);
    if (applied.paymentStatus) params.set('paymentStatus', applied.paymentStatus);

    fetch(`/api/boutique-admin/orders?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as { orders: MappedOrder[]; total: number };
        setOrders(data.orders.slice(0, 50));
        setTotal(data.total);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [applied]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setApplied({ ...filters });
  }

  function handleReset() {
    const empty: Filters = { status: '', paymentStatus: '' };
    setFilters(empty);
    setApplied(empty);
  }

  return (
    <div>
      <PageHeader
        title="Commandes"
        description="Commandes validées depuis le site e-commerce"
      />

      {/* Filtres */}
      <form
        onSubmit={handleSubmit}
        className="mb-5 mt-5 grid gap-3 rounded-xl border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted" htmlFor="cmd-status">
            Statut
          </label>
          <select
            id="cmd-status"
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
            className={selectClassName}
            style={selectStyle}
          >
            <option value="">Tous</option>
            {ORDER_STATUS_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted" htmlFor="cmd-payment">
            Paiement
          </label>
          <select
            id="cmd-payment"
            value={filters.paymentStatus}
            onChange={(e) => setFilters((prev) => ({ ...prev, paymentStatus: e.target.value }))}
            className={selectClassName}
            style={selectStyle}
          >
            <option value="">Tous</option>
            {PAYMENT_STATUS_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end gap-2 sm:col-span-2">
          <button type="submit" className={buttonClassName('primary')}>
            Filtrer
          </button>
          <button type="button" onClick={handleReset} className={buttonClassName('secondary')}>
            Réinitialiser
          </button>
          {!loading && (
            <span className="ml-auto self-center text-xs text-ink-muted">
              {orders.length} affichée(s) sur {total}
            </span>
          )}
        </div>
      </form>

      {/* Tableau */}
      <div className="rounded-xl border border-line bg-surface">
        {loading ? (
          <p className="p-6 text-sm text-ink-muted">Chargement…</p>
        ) : orders.length === 0 ? (
          <EmptyState
            title="Aucune commande"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
                  <th className="pb-2 pl-4 pr-3 pt-3">N° commande</th>
                  <th className="pb-2 pr-3 pt-3">Date</th>
                  <th className="pb-2 pr-3 pt-3">Client</th>
                  <th className="pb-2 pr-3 pt-3">Articles</th>
                  <th className="pb-2 pr-3 pt-3">Total</th>
                  <th className="pb-2 pr-3 pt-3">Statut</th>
                  <th className="pb-2 pr-4 pt-3 text-right">Paiement</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-line/60 align-top last:border-0">
                    <td className="py-3 pl-4 pr-3">
                      <Link
                        href={`/boutique/articles-admin/commandes/${order.id}`}
                        className="font-mono text-xs font-semibold text-paddy hover:underline"
                      >
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="py-3 pr-3 text-xs text-ink-muted">
                      {formatDateTime(order.createdAt)}
                    </td>
                    <td className="py-3 pr-3">
                      <p className="font-medium">{order.customerName ?? '—'}</p>
                    </td>
                    <td className="py-3 pr-3">
                      <ul className="space-y-0.5 text-xs">
                        {order.lines.slice(0, 2).map((line) => {
                          const parts = line.packNameSnapshot.split(/\s*[·—]\s*/);
                          const label = parts.length > 1 ? parts.slice(1).join(' · ') : parts[0];
                          return (
                            <li key={line.id}>
                              {line.quantity} × {label}
                            </li>
                          );
                        })}
                        {order.lines.length > 2 && (
                          <li className="text-ink-muted">+{order.lines.length - 2} autre(s)</li>
                        )}
                      </ul>
                    </td>
                    <td className="py-3 pr-3 font-semibold">
                      {formatAmount(order.total.amount)}
                    </td>
                    <td className="py-3 pr-3">
                      <Badge tone={statusTone(order.status)}>
                        {STATUS_LABELS[order.status] ?? order.status}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <Badge tone={paymentTone(order.paymentStatus)}>
                        {PAYMENT_LABELS[order.paymentStatus] ?? order.paymentStatus}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
