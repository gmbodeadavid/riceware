'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Product } from '@/lib/boutique';
import { addItemToCart, createCartItem } from '@/lib/cart';

export default function AddToCartForm({ product }: { product: Product }) {
  const router = useRouter();
  const [packId, setPackId] = useState(product.packs[0]?.id ?? '');
  const [quantity, setQuantity] = useState(1);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    addItemToCart(createCartItem(product, packId, quantity));
    router.push('/panier');
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      <div className="rounded-[18px] border border-line bg-surface p-3 sm:p-4">
        <p className="font-mono-brand text-[9px] uppercase tracking-[0.1em] text-ink-muted mb-2.5">Choisir un pack</p>
        <div className="space-y-2.5">
          {product.packs.map((pack) => (
            <label
              key={pack.id}
              className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-[14px] border border-line bg-ground p-2.5 transition-colors hover:border-paddy"
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="pack"
                  value={pack.id}
                  checked={packId === pack.id}
                  onChange={() => setPackId(pack.id)}
                  className="h-3.5 w-3.5 accent-paddy"
                />
                <div>
                  <div className="text-sm font-semibold text-ink">{pack.label}</div>
                  <div className="text-[11px] leading-4 text-ink-muted">{pack.note}</div>
                </div>
              </div>
              <span className="text-sm font-semibold text-ink">{pack.price}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-[18px] border border-line bg-surface p-3 sm:p-4">
        <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-end sm:justify-between">
          <label className="grid gap-2 text-sm font-semibold text-ink">
            Quantité de packs
            <input
              type="number"
              min="1"
              max="99"
              value={quantity}
              onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))}
              className="min-h-11 w-full max-w-32 rounded-lg border border-line bg-ground px-3 py-2 text-center text-sm font-normal text-ink outline-hidden transition-colors focus:border-paddy focus:ring-2 focus:ring-paddy/20 sm:w-28"
              style={{ colorScheme: 'light' }}
            />
          </label>
          <button
            type="submit"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-paddy px-5 py-3 text-sm font-semibold text-on-paddy transition-colors hover:bg-paddy-deep focus-visible:outline-2 focus-visible:outline-paddy focus-visible:outline-offset-2 sm:w-auto"
          >
            Ajouter au panier
          </button>
        </div>
      </div>
    </form>
  );
}