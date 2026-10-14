'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LAST_ORDER_STORAGE_KEY, type StoredOrder, readJsonStorage } from '@/lib/cart';

export default function OrderConfirmationClient() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get('numero');
  const [order, setOrder] = useState<StoredOrder | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setOrder(readJsonStorage<StoredOrder | null>(LAST_ORDER_STORAGE_KEY, null));
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="mx-auto max-w-3xl rounded-[18px] border border-line bg-surface p-5 text-center sm:p-8">
      <p className="font-mono-brand text-[10px] uppercase tracking-[0.08em] text-ink-muted">Commande reçue</p>
      <h1 className="mt-3 font-display text-title font-bold text-ink m-0">Votre demande est enregistrée.</h1>
      <p className="mt-4 text-sm leading-6 text-ink-muted">
        Numéro de commande : <strong className="text-ink">{order?.orderNumber ?? orderNumber ?? 'Non disponible'}</strong>
      </p>

      {order ? (
        <div className="mt-6 grid gap-3 rounded-[16px] bg-ground p-4 text-left text-sm">
          <div><strong>Client :</strong> {order.customer.fullName}</div>
          <div><strong>Téléphone :</strong> {order.customer.phone}</div>
          <div><strong>Packs :</strong> {order.totalPacks}</div>
          <div><strong>Articles estimés :</strong> {order.totalArticles}</div>
          <div><strong>Statut :</strong> {order.status}</div>
          <div><strong>Paiement :</strong> {order.paymentStatus}</div>
          <p className="text-ink-muted">{order.commercialNote}</p>
        </div>
      ) : (
        <p className="mt-6 rounded-[16px] bg-ground p-4 text-sm text-ink-muted">
          Le détail de la commande est stocké dans ce navigateur. S&apos;il a été vidé, seul le numéro affiché dans l&apos;URL reste visible.
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
