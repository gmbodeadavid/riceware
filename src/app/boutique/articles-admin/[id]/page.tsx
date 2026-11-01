'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProductForm from '@/components/boutique-admin/ProductForm';
import type { ProductRow } from '@/lib/data/products';

export default function EditProduitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [product, setProduct] = useState<ProductRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/boutique-admin/products/${id}`)
      .then(async (r) => {
        if (r.status === 404) { setNotFound(true); setLoading(false); return; }
        if (!r.ok) throw new Error(`Erreur ${r.status}`);
        const data = (await r.json()) as ProductRow;
        setProduct(data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
        setLoading(false);
      });
  }, [id]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">
            {product ? `Éditer : ${product.name}` : 'Éditer le produit'}
          </h1>
          {product && (
            <p className="mt-1 text-sm text-ink-muted">Slug : {product.slug}</p>
          )}
        </div>
        <Link
          href="/boutique/articles-admin"
          className="rounded-control border border-line px-4 py-2 text-sm hover:bg-grain/60"
        >
          ← Retour à la liste
        </Link>
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-ink-muted">Chargement…</p>
      ) : notFound ? (
        <div className="rounded-xl border border-line bg-surface p-10 text-center">
          <p className="text-lg font-semibold text-ink">Produit introuvable</p>
          <p className="mt-2 text-sm text-ink-muted">
            Ce produit n&apos;existe pas ou a été supprimé.
          </p>
          <Link
            href="/boutique/articles-admin"
            className="mt-4 inline-flex items-center rounded-control bg-paddy px-4 py-2 text-sm font-medium text-on-paddy hover:bg-paddy-deep"
          >
            Retour à la liste
          </Link>
        </div>
      ) : error ? (
        <p className="rounded-control border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : product ? (
        <ProductForm
          mode="edit"
          initialData={product}
          onSuccess={() => router.push('/boutique/articles-admin')}
        />
      ) : null}
    </div>
  );
}
