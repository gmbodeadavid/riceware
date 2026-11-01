'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LAST_ORDER_STORAGE_KEY, type StoredOrder, readJsonStorage } from '@/lib/cart';
import type { PublicOrderSummary } from '@/lib/data/mappers';

type DisplayOrder = {
  orderNumber: string;
  customerName?: string;
  phone?: string;
  totalPacks?: number;
  totalArticles?: number;
  status?: string;
  paymentStatus?: string;
  note?: string;
};

function fromStoredOrder(order: StoredOrder): DisplayOrder {
  return {
    orderNumber: order.orderNumber,
    customerName: order.customer.fullName,
    phone: order.customer.phone,
    totalPacks: order.totalPacks,
    totalArticles: order.totalArticles,
    status: order.status,
    paymentStatus: order.paymentStatus,
    note: order.commercialNote,
  };
}

function fromServerOrder(order: PublicOrderSummary): DisplayOrder {
  return {
    orderNumber: order.orderNumber,
    customerName: order.fullName,
    phone: order.phone,
    totalPacks: order.totalPacks,
    totalArticles: order.totalArticles,
    status: order.status,
    paymentStatus: order.paymentStatus,
    note: order.notes ?? undefined,
  };
}

export default function OrderConfirmationClient() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get('numero');
  const [display, setDisplay] = useState<DisplayOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // First, try localStorage for an instant render
    const frame = window.requestAnimationFrame(() => {
      const stored = readJsonStorage<StoredOrder | null>(LAST_ORDER_STORAGE_KEY, null);
      if (stored) {
        setDisplay(fromStoredOrder(stored));
        setLoading(false);
        return;
      }

      // If localStorage is empty (e.g. cleared) fetch from the server
      if (orderNumber) {
        fetch(`/api/orders/${encodeURIComponent(orderNumber)}`)
          .then(async (res) => {
            if (!res.ok) return;
            const data = (await res.json()) as PublicOrderSummary;
            setDisplay(fromServerOrder(data));
          })
          .catch(() => undefined)
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [orderNumber]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl rounded-[18px] border border-line bg-surface p-5 sm:p-8">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-48 rounded bg-grain/70" />
          <div className="h-8 w-72 rounded bg-grain/70" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl rounded-[18px] border border-line bg-surface p-5 text-center sm:p-8">
      <p className="font-mono-brand text-[10px] uppercase tracking-[0.08em] text-ink-muted">Commande reçue</p>
      <h1 className="mt-3 font-display text-title font-bold text-ink m-0">Votre demande est enregistrée.</h1>
      <p className="mt-4 text-sm leading-6 text-ink-muted">
        Numéro de commande : <strong className="text-ink">{display?.orderNumber ?? orderNumber ?? 'Non disponible'}</strong>
      </p>

      {display ? (
        <div className="mt-6 grid gap-3 rounded-[16px] bg-ground p-4 text-left text-sm">
          {display.customerName ? <div><strong>Client :</strong> {display.customerName}</div> : null}
          {display.phone ? <div><strong>Téléphone :</strong> {display.phone}</div> : null}
          {display.totalPacks !== undefined ? (
            <div><strong>Packs :</strong> {display.totalPacks}</div>
          ) : null}
          {display.totalArticles !== undefined ? (
            <div><strong>Articles estimés :</strong> {display.totalArticles}</div>
          ) : null}
          {display.status ? <div><strong>Statut :</strong> {display.status}</div> : null}
          {display.paymentStatus ? <div><strong>Paiement :</strong> {display.paymentStatus}</div> : null}
          {display.note ? <p className="text-ink-muted">{display.note}</p> : null}
        </div>
      ) : (
        <p className="mt-6 rounded-[16px] bg-ground p-4 text-sm text-ink-muted">
          Le détail de la commande est consultable auprès de RiceWare CI avec votre numéro de commande.
        </p>
      )}

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/boutique" className="rounded-full border border-line px-5 py-3 text-sm font-semibold text-ink hover:border-paddy hover:text-paddy">
          Retour boutique
        </Link>
        <Link href="/" className="rounded-full bg-paddy px-5 py-3 text-sm font-semibold text-on-paddy hover:bg-paddy-deep">
          Accueil
        </Link>
      </div>
    </div>
  );
}
