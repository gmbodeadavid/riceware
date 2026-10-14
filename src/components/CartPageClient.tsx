'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CART_STORAGE_KEY, type CartItem, getCartTotals, readJsonStorage, writeJsonStorage } from '@/lib/cart';

export default function CartPageClient() {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setItems(readJsonStorage<CartItem[]>(CART_STORAGE_KEY, []));
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  const totals = useMemo(() => getCartTotals(items), [items]);

  function commitCart(nextItems: CartItem[]) {
    setItems(nextItems);
    writeJsonStorage(CART_STORAGE_KEY, nextItems);
  }

  function updateQuantity(itemId: string, quantity: number) {
    commitCart(items.map((item) => (
      item.id === itemId ? { ...item, quantity: Math.max(1, quantity) } : item
    )));
  }

  function removeItem(itemId: string) {
    commitCart(items.filter((item) => item.id !== itemId));
  }

  return (
    <div className="grid items-stretch gap-6 lg:grid-cols-[1fr_360px]">
      <div className="flex h-full flex-col rounded-[18px] border border-line bg-surface p-5 sm:p-6">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-title font-bold text-ink m-0">Votre panier</h1>
          <p className="text-sm leading-6 text-ink-muted">
            Vérifiez les packs avant de préparer la commande. Les prix restent à confirmer tant que le tarif commercial n’est pas validé.
          </p>
        </div>

        {items.length === 0 ? (
          <div className="mt-8 flex flex-1 flex-col items-center justify-center rounded-[18px] border border-dashed border-line bg-ground p-6 text-center">
            <p className="font-display text-xl font-semibold text-ink">Le panier est vide.</p>
            <p className="mt-2 max-w-sm text-sm text-ink-muted">
              Ajoutez des packs depuis la boutique pour préparer votre commande.
            </p>
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-3">
            {items.map((item) => (
              <article key={item.id} className="grid items-center gap-4 rounded-[18px] border border-line bg-ground p-3 sm:grid-cols-[88px_1fr_auto] sm:p-4">
                <div className="relative aspect-square overflow-hidden rounded-xl bg-surface">
                  <Image src={item.productImage} alt={item.productName} fill sizes="88px" className="object-contain p-2" />
                </div>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <h2 className="truncate font-display text-base font-semibold text-ink">{item.productName}</h2>
                  <p className="text-xs text-ink-muted">{item.packLabel} · {item.productFormat}</p>
                  <p className="text-xs text-ink-muted">{item.packNote}</p>
                  <button type="button" onClick={() => removeItem(item.id)} className="mt-2 inline-flex w-fit items-center justify-center rounded-full border border-line px-4 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-surface">
                    Retirer
                  </button>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <div className="grid justify-items-end gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Quantité</span>
                    <input
                      type="number"
                      min="1"
                      max="99"
                      value={item.quantity}
                      onChange={(event) => updateQuantity(item.id, Number(event.target.value) || 1)}
                      className="min-h-11 w-24 rounded-lg border border-line bg-ground px-3 py-2 text-center text-sm font-normal text-ink outline-hidden transition-colors focus:border-paddy focus:ring-2 focus:ring-paddy/20"
                      style={{ colorScheme: 'light' }}
                    />
                  </div>
                  <span className="text-base font-semibold text-ink">{item.packPrice}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <aside className="h-full rounded-[18px] border border-line bg-surface p-5 sm:p-6 lg:sticky lg:top-24">
        <div className="flex h-full flex-col">
          <h2 className="font-display text-xl font-semibold text-ink m-0">Résumé</h2>
          <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-ink-muted">Packs</span>
              <strong>{totals.totalPacks}</strong>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-ink-muted">Articles estimés</span>
              <strong>{totals.totalArticles}</strong>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-ink-muted">Sous-total</span>
              <strong>À confirmer</strong>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-ink-muted">Livraison</span>
              <strong>À confirmer</strong>
            </div>
          </div>
          <div className="mt-auto flex flex-col gap-3 pt-5">
            <Link
              href={items.length > 0 ? '/commande' : '/boutique'}
              className="inline-flex w-full items-center justify-center rounded-full bg-paddy px-5 py-3 text-sm font-semibold text-on-paddy transition-colors hover:bg-paddy-deep"
            >
              {items.length > 0 ? 'Commander' : 'Choisir des produits'}
            </Link>
            <Link href="/boutique" className="inline-flex w-full items-center justify-center rounded-full border border-line px-5 py-3 text-sm font-semibold text-ink transition-colors hover:border-paddy hover:text-paddy">
              Continuer mes achats
            </Link>
          </div>
        </div>
      </aside>
    </div>
  );
}