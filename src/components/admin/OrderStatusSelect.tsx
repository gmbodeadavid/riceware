'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { selectStyle } from '@/components/admin/fields';

const compactSelect =
  'rounded border border-line bg-ground px-2 py-1 text-xs text-ink appearance-none cursor-pointer focus:border-paddy focus:outline-none focus:ring-1 focus:ring-paddy/20 disabled:opacity-60 pr-6';

const ORDER_STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  received: 'Reçue',
  pending_confirmation: 'À confirmer',
  confirmed: 'Confirmée',
  preparing: 'En préparation',
  shipped: 'Expédiée',
  delivered: 'Livrée',
  cancelled: 'Annulée',
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  paid: 'Payé',
  failed: 'Échoué',
  refunded: 'Remboursé',
};

export default function OrderStatusSelect({
  orderId,
  field,
  value: initialValue,
}: {
  orderId: string;
  field: 'status' | 'paymentStatus';
  value: string;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(initialValue);
  const [busy, setBusy] = useState(false);

  const update = async (newValue: string) => {
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: newValue }),
      });
      if (response.status === 401) { router.push('/admin/login'); return; }
      if (!response.ok) return;
      setCurrent(newValue);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const options = field === 'status' ? ORDER_STATUS_LABELS : PAYMENT_STATUS_LABELS;

  return (
    <select
      aria-label={field === 'status' ? 'Statut de la commande' : 'Statut du paiement'}
      value={current}
      disabled={busy}
      onChange={(event) => void update(event.target.value)}
      className={compactSelect}
      style={selectStyle}
    >
      {Object.entries(options).map(([val, label]) => (
        <option key={val} value={val}>{label}</option>
      ))}
    </select>
  );
}
