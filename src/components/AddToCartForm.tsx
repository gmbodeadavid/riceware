'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ProductRow } from '@/lib/data/products';
import { addItemToCart, createCartItem } from '@/lib/cart';
import { useProductColor } from '@/components/ProductColorGallery';
import { PRODUCT_COLORS } from '@/lib/boutique';

function formatFCFA(value: number): string {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(value)) + ' FCFA';
}

export default function AddToCartForm({ product }: { product: ProductRow }) {
  const router = useRouter();
  const { selectedColor } = useProductColor();
  const colorMeta = PRODUCT_COLORS.find((c) => c.id === selectedColor);
  const colorLabel = colorMeta?.label ?? 'Beige sable';

  const firstPack = product.packs[0];
  const [packId, setPackId] = useState(firstPack?.id ?? '');
  const [quantity, setQuantity] = useState(1);

  const selectedPack = product.packs.find((p) => p.id === packId) ?? firstPack;

  const unitPrice = selectedPack?.priceValue ?? 0;
  const hasPriceValue = unitPrice > 0;
  const totalPrice = unitPrice * quantity;

  function decrement() {
    setQuantity((q) => Math.max(1, q - 1));
  }
  function increment() {
    setQuantity((q) => Math.min(99, q + 1));
  }

  function handlePackChange(id: string) {
    setPackId(id);
    setQuantity(1); // reset qty when pack changes
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    addItemToCart(createCartItem(product, packId, quantity, selectedColor, colorLabel));
    router.push('/panier');
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">

      {/* ── Sélection de pack ─────────────────────────────────── */}
      <div className="rounded-[18px] border border-line bg-surface p-3 sm:p-4">
        <p className="font-mono-brand text-[9px] uppercase tracking-[0.1em] text-ink-muted mb-2.5">
          Choisir un pack
        </p>
        <div className="space-y-2">
          {product.packs.map((pack) => {
            const isSelected = packId === pack.id;
            const packHasPrice = (pack.priceValue ?? 0) > 0;
            return (
              <label
                key={pack.id}
                className={`flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-[14px] border p-2.5 transition-colors hover:border-paddy ${
                  isSelected ? 'border-paddy bg-paddy/5' : 'border-line bg-ground'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="pack"
                    value={pack.id}
                    checked={isSelected}
                    onChange={() => handlePackChange(pack.id)}
                    className="h-3.5 w-3.5 accent-paddy"
                  />
                  <div>
                    <div className="text-sm font-semibold text-ink">{pack.label}</div>
                    {pack.note && (
                      <div className="text-[11px] leading-4 text-ink-muted">{pack.note}</div>
                    )}
                  </div>
                </div>
                <span
                  className={`text-sm font-bold whitespace-nowrap ${
                    isSelected ? 'text-paddy-deep' : 'text-ink'
                  }`}
                >
                  {packHasPrice ? formatFCFA(pack.priceValue) : pack.price}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* ── Prix + Quantité + CTA ──────────────────────────────── */}
      <div className="rounded-[18px] border border-line bg-surface p-3 sm:p-4 space-y-3">

        {/* Prix réactif au pack sélectionné */}
        {hasPriceValue ? (
          <div className="flex items-start justify-between gap-3">
            {/* Gauche : prix unitaire du pack */}
            <div>
              <p className="text-[9px] font-mono-brand uppercase tracking-[0.1em] text-ink-muted mb-0.5">
                Prix du pack sélectionné
              </p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-ink leading-none">
                  {formatFCFA(unitPrice)}
                </span>
                <span className="text-xs text-ink-muted">/ pack</span>
              </div>
              <p className="text-[11px] text-ink-muted mt-0.5">
                {selectedPack?.label}
              </p>
            </div>

            {/* Droite : total à payer */}
            <div className="text-right shrink-0">
              <p className="text-[9px] font-mono-brand uppercase tracking-[0.1em] text-ink-muted mb-0.5">
                Total à payer
              </p>
              <p className="text-2xl font-bold text-paddy-deep leading-none">
                {formatFCFA(totalPrice)}
              </p>
              {quantity > 1 && (
                <p className="text-[11px] text-ink-muted mt-0.5">
                  {quantity} × {formatFCFA(unitPrice)}
                </p>
              )}
            </div>
          </div>
        ) : (
          /* Fallback quand pas de priceValue */
          <div>
            <p className="text-[9px] font-mono-brand uppercase tracking-[0.1em] text-ink-muted mb-0.5">
              Prix
            </p>
            <p className="text-2xl font-bold text-ink">
              {selectedPack?.price ?? product.currentPrice}
            </p>
          </div>
        )}

        {/* Séparateur */}
        <div className="border-t border-line" />

        {/* Quantité + Bouton */}
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">

          {/* Stepper − / qty / + */}
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-mono-brand uppercase tracking-wide text-ink-muted">
              Quantité de packs
            </span>
            <div className="flex items-center">
              <button
                type="button"
                onClick={decrement}
                disabled={quantity <= 1}
                aria-label="Diminuer la quantité"
                className="flex size-10 items-center justify-center rounded-l-lg border border-r-0 border-line bg-ground text-lg font-bold text-ink transition-colors hover:bg-grain disabled:opacity-40 disabled:cursor-not-allowed"
              >
                −
              </button>
              <div
                className="flex size-10 items-center justify-center border border-line bg-surface text-sm font-semibold text-ink select-none"
                aria-live="polite"
                aria-atomic="true"
              >
                {quantity}
              </div>
              <button
                type="button"
                onClick={increment}
                disabled={quantity >= 99}
                aria-label="Augmenter la quantité"
                className="flex size-10 items-center justify-center rounded-r-lg border border-l-0 border-line bg-ground text-lg font-bold text-ink transition-colors hover:bg-grain disabled:opacity-40 disabled:cursor-not-allowed"
              >
                +
              </button>
            </div>
          </div>

          {/* CTA */}
          <button
            type="submit"
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-paddy px-5 py-3 text-sm font-semibold text-on-paddy transition-colors hover:bg-paddy-deep focus-visible:outline-2 focus-visible:outline-paddy focus-visible:outline-offset-2 sm:w-auto"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            Ajouter au panier
          </button>
        </div>
      </div>
    </form>
  );
}
