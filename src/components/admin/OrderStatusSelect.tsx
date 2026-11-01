'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { selectClassName, selectStyle } from '@/components/admin/fields';

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
  status,
  paymentStatus,
}: {
  orderId: string;
  status: string;
  paymentStatus: string;
}) {
  const router = useRouter();
  const [currentStatus, setCurrentStatus] = useState(status);
  const [currentPayment, setCurrentPayment] = useState(paymentStatus);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const update = async (field: 'status' | 'paymentStatus', value: string) => {
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      const data = await response.json();
      if (response.status === 401) {
        router.push('/admin/login');
        return;
      }
      if (!response.ok) throw new Error(data.error || 'Mise à jour impossible.');
      if (field === 'status') setCurrentStatus(value);
      else setCurrentPayment(value);
      router.refresh();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Mise à jour impossible.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <select
        aria-label="Statut de la commande"
        value={currentStatus}
        disabled={busy}
        onChange={(event) => void update('status', event.target.value)}
        className={selectClassName}
        style={selectStyle}
      >
        {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>
      <select
        aria-label="Statut du paiement"
        value={currentPayment}
        disabled={busy}
        onChange={(event) => void update('paymentStatus', event.target.value)}
        className={selectClassName}
        style={selectStyle}
      >
        {Object.entries(PAYMENT_STATUS_LABELS).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>
      {error ? <span className="max-w-40 text-[11px] text-danger">{error}</span> : null}
    </div>
  );
}
