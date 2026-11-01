'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProductForm from '@/components/boutique-admin/ProductForm';

export default function NouveauProduitPage() {
  const router = useRouter();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Nouveau produit</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Remplissez les informations ci-dessous pour créer un nouveau produit dans le catalogue.
          </p>
        </div>
        <Link
          href="/boutique/articles-admin"
          className="rounded-control border border-line px-4 py-2 text-sm hover:bg-grain/60"
        >
          ← Retour à la liste
        </Link>
      </div>

      <ProductForm
        mode="create"
        onSuccess={() => router.push('/boutique/articles-admin')}
      />
    </div>
  );
}
