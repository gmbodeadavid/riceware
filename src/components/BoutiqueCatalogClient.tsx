'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Product } from '@/lib/boutique';
import { addItemToCart, createCartItem } from '@/lib/cart';

export default function BoutiqueCatalogClient({
  selectedProduct,
  filteredProducts,
}: {
  selectedProduct: Product | null;
  filteredProducts: Product[];
}) {
  const router = useRouter();
  const [packId, setPackId] = useState(selectedProduct?.packs[0]?.id ?? '');
  const [usage, setUsage] = useState('');

  function handleDemandeSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProduct) return;
    addItemToCart(createCartItem(selectedProduct, packId, 1));
    router.push('/panier');
  }

  return (
    <>
      {selectedProduct ? (
        <div className="mt-6 grid gap-4 rounded-[22px] border border-paddy bg-surface p-4 sm:p-5 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="font-mono-brand text-[10px] uppercase tracking-[0.08em] text-ink-muted">Demande de commande</p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-ink m-0">{selectedProduct.name}</h2>
            <p className="mt-2 text-sm leading-6 text-ink-muted m-0">
              Préparez une demande de devis pour un pack pilote. Les prix restent à confirmer selon volume, couleur et délai.
            </p>
          </div>
          <form onSubmit={handleDemandeSubmit} className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-semibold text-ink">
              Nom
              <input
                name="nom"
                className="rounded-lg border border-line bg-ground px-3 py-2 text-sm font-normal outline-none focus:border-paddy"
                placeholder="Votre nom"
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-ink">
              Contact
              <input
                name="contact"
                className="rounded-lg border border-line bg-ground px-3 py-2 text-sm font-normal outline-none focus:border-paddy"
                placeholder="Téléphone ou email"
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-ink">
              Pack
              <select
                name="pack"
                value={packId}
                onChange={(event) => setPackId(event.target.value)}
                className="rounded-lg border border-line bg-ground px-3 py-2 text-sm font-normal outline-none focus:border-paddy"
              >
                {selectedProduct.packs.map((pack) => (
                  <option key={pack.id} value={pack.id}>{pack.label}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold text-ink">
              Usage
              <input
                name="usage"
                value={usage}
                onChange={(event) => setUsage(event.target.value)}
                className="rounded-lg border border-line bg-ground px-3 py-2 text-sm font-normal outline-none focus:border-paddy"
                placeholder="Cantine, événement, hôtel..."
              />
            </label>
            <button type="submit" className="sm:col-span-2 rounded-full bg-paddy px-5 py-3 text-sm font-semibold text-on-paddy transition-colors hover:bg-paddy-deep">
              Préparer la demande
            </button>
          </form>
        </div>
      ) : null}

      {filteredProducts.length > 0 ? (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5">
          {filteredProducts.map((product) => (
            <Link
              key={product.id}
              href={`/boutique/${product.slug}`}
              className="group flex h-full min-w-0 flex-col overflow-hidden rounded-[18px] border border-line bg-surface transition-all duration-200 hover:-translate-y-1 hover:border-paddy"
            >
              <div className="relative aspect-[4/3] overflow-hidden border-b border-line bg-ground">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                  className="object-contain p-3 sm:p-4 transition-transform duration-300 group-hover:scale-[1.02]"
                />
              </div>

              <div className="flex flex-1 flex-col p-3 sm:p-4">
                <h2 className="font-display text-base font-semibold text-ink m-0 sm:text-lg">{product.name}</h2>

                <div className="mt-2 border-t border-line pt-2">
                  <span className="text-sm font-semibold text-ink">{product.currentPrice}</span>
                </div>

                <div className="mt-auto pt-3">
                  <span className="inline-flex items-center justify-center rounded-full bg-paddy px-3 py-1.5 text-xs font-semibold text-on-paddy transition-colors hover:bg-paddy-deep sm:text-sm">
                    Voir plus
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-[22px] border border-dashed border-line bg-surface p-8 text-center">
          <p className="font-mono-brand text-xs uppercase tracking-[0.08em] text-ink-muted">Aucun résultat</p>
          <h2 className="mt-3 font-display text-[1.8rem] font-semibold text-ink m-0">
            Aucun produit ne correspond à ce filtre.
          </h2>
          <p className="mt-3 text-sm leading-6 text-ink-muted m-0 max-w-lg mx-auto">
            Réinitialisez la recherche ou les filtres pour retrouver la gamme disponible.
          </p>
          <Link href="/boutique" className="mt-6 inline-flex items-center justify-center rounded-full bg-paddy px-5 py-2.5 text-sm font-semibold text-on-paddy transition-colors hover:bg-paddy-deep">
            Réinitialiser
          </Link>
        </div>
      )}
    </>
  );
}