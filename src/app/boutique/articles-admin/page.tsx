'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { PageHeader, StatCard, Badge, EmptyState } from '@/components/admin/ui';
import { selectClassName, selectStyle } from '@/components/admin/fields';
import type { ProductRow, ProductCategoryRow } from '@/lib/data/products';

// ─── Constantes ───────────────────────────────────────────────────────────────

const PRODUCT_STATUSES = [
  { value: 'Prototype', label: 'Prototype' },
  { value: 'Validé', label: 'Validé' },
  { value: 'À venir', label: 'À venir' },
] as const;

type ProductStatus = 'Prototype' | 'Validé' | 'À venir';

function statusTone(status: string): 'warning' | 'success' | 'info' | 'neutral' {
  if (status === 'Prototype') return 'warning';
  if (status === 'Validé') return 'success';
  if (status === 'À venir') return 'info';
  return 'neutral';
}

function isNewProduct(product: ProductRow): boolean {
  if (product.isNew) return true;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return new Date(product.createdAt) > thirtyDaysAgo;
}

const inputCls =
  'block w-full rounded-control border border-line bg-ground px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-paddy focus:outline-none focus:ring-1 focus:ring-paddy';

// ─── Types filtres ─────────────────────────────────────────────────────────────

type Filters = {
  category: string;
  status: string;
  published: string;
  search: string;
};

// ─── Composant principal ───────────────────────────────────────────────────────

export default function ArticlesAdminPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [categories, setCategories] = useState<ProductCategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({ category: '', status: '', published: '', search: '' });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<{ id: string; message: string; canArchive: boolean } | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Chargement initial des catégories
  useEffect(() => {
    fetch('/api/boutique-admin/categories')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: ProductCategoryRow[]) => setCategories(data))
      .catch(() => undefined);
  }, []);

  // Chargement des produits (re-déclenché par les filtres)
  const loadProducts = () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (filters.category) params.set('category', filters.category);
    if (filters.status) params.set('status', filters.status);
    if (filters.published) params.set('published', filters.published);
    if (filters.search) params.set('search', filters.search);

    fetch(`/api/boutique-admin/products?${params.toString()}`)
      .then(async (r) => {
        if (!r.ok) throw new Error('Erreur lors du chargement des produits.');
        return r.json() as Promise<ProductRow[]>;
      })
      .then((data) => {
        setProducts(data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Erreur inconnue.');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stats calculées côté client depuis la liste chargée
  const totalAll = products.length;
  const totalPublished = products.filter((p) => p.isPublished).length;
  const totalArchived = products.filter((p) => !p.isPublished).length;
  const totalCategories = categories.length;

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleFilterSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    loadProducts();
  };

  const handleFilterReset = () => {
    setFilters({ category: '', status: '', published: '', search: '' });
    // Recharger sans filtres
    setLoading(true);
    setError(null);
    fetch('/api/boutique-admin/products')
      .then((r) => (r.ok ? (r.json() as Promise<ProductRow[]>) : Promise.reject(new Error('Erreur'))))
      .then((data) => { setProducts(data); setLoading(false); })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Erreur inconnue.');
        setLoading(false);
      });
  };

  const handleTogglePublished = async (product: ProductRow) => {
    setTogglingId(product.id);
    try {
      const r = await fetch(`/api/boutique-admin/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !product.isPublished }),
      });
      if (!r.ok) throw new Error('Échec de la mise à jour.');
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, isPublished: !p.isPublished } : p)),
      );
    } catch {
      // Silencieux — l'état ne change pas
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteRequest = (id: string) => {
    setDeleteError(null);
    setConfirmDeleteId(id);
  };

  const handleDeleteCancel = () => {
    setConfirmDeleteId(null);
    setDeleteError(null);
  };

  const handleDeleteConfirm = async (id: string) => {
    setDeletingId(id);
    try {
      const r = await fetch(`/api/boutique-admin/products/${id}`, { method: 'DELETE' });
      if (r.status === 409) {
        const body = (await r.json()) as { error: string; canArchive: boolean };
        setDeleteError({ id, message: body.error, canArchive: body.canArchive ?? false });
        setConfirmDeleteId(null);
        return;
      }
      if (!r.ok) throw new Error('Erreur lors de la suppression.');
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setConfirmDeleteId(null);
    } catch {
      setDeleteError({ id, message: 'Erreur lors de la suppression.', canArchive: false });
      setConfirmDeleteId(null);
    } finally {
      setDeletingId(null);
    }
  };

  const handleArchiveInstead = async (id: string) => {
    setDeletingId(id);
    try {
      const r = await fetch(`/api/boutique-admin/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: false }),
      });
      if (!r.ok) throw new Error('Erreur lors de l\'archivage.');
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isPublished: false } : p)),
      );
      setDeleteError(null);
    } catch {
      // Silencieux
    } finally {
      setDeletingId(null);
    }
  };

  // ─── Rendu ───────────────────────────────────────────────────────────────────

  return (
    <div>
      <PageHeader
        title="Produits"
        description="Gérez le catalogue de la boutique : publication, tarification et contenu des produits."
        actions={
          <Link
            href="/boutique/articles-admin/nouveau"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-control bg-paddy px-4 py-2 text-sm font-semibold text-on-paddy transition-colors hover:bg-paddy-deep"
          >
            + Nouveau produit
          </Link>
        }
      />

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total produits" value={totalAll} />
        <StatCard label="Publiés" value={totalPublished} tone="paddy" />
        <StatCard label="Archivés" value={totalArchived} tone={totalArchived > 0 ? 'warning' : 'default'} />
        <StatCard label="Catégories" value={totalCategories} />
      </div>

      {/* Filtres */}
      <form
        onSubmit={handleFilterSubmit}
        className="mb-5 mt-5 grid gap-3 rounded-panel border border-line bg-surface p-4 sm:grid-cols-3 lg:flex lg:flex-wrap lg:items-end"
      >
        <div className="sm:col-span-1 lg:w-40">
          <label className="mb-1 block text-xs font-medium text-ink-muted" htmlFor="products-search">
            Recherche
          </label>
          <input
            id="products-search"
            type="text"
            placeholder="Nom…"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            className={inputCls}
          />
        </div>
        <div className="lg:w-36">
          <label className="mb-1 block text-xs font-medium text-ink-muted" htmlFor="products-category">
            Catégorie
          </label>
          <select
            id="products-category"
            value={filters.category}
            onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
            className={selectClassName}
            style={selectStyle}
          >
            <option value="">Toutes</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.slug}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
        <div className="lg:w-32">
          <label className="mb-1 block text-xs font-medium text-ink-muted" htmlFor="products-status">
            Statut
          </label>
          <select
            id="products-status"
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            className={selectClassName}
            style={selectStyle}
          >
            <option value="">Tous</option>
            {PRODUCT_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="lg:w-32">
          <label className="mb-1 block text-xs font-medium text-ink-muted" htmlFor="products-published">
            Publication
          </label>
          <select
            id="products-published"
            value={filters.published}
            onChange={(e) => setFilters((f) => ({ ...f, published: e.target.value }))}
            className={selectClassName}
            style={selectStyle}
          >
            <option value="">Tous</option>
            <option value="true">Publiés</option>
            <option value="false">Archivés</option>
          </select>
        </div>
        <div className="flex items-end gap-2 sm:col-span-3 lg:flex-1">
          <button
            type="submit"
            className="inline-flex min-h-10 items-center justify-center rounded-control bg-paddy px-4 py-2 text-sm font-semibold text-on-paddy transition-colors hover:bg-paddy-deep"
          >
            Filtrer
          </button>
          <button
            type="button"
            onClick={handleFilterReset}
            className="inline-flex min-h-10 items-center justify-center rounded-control border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-paddy hover:text-paddy"
          >
            Réinitialiser
          </button>
          <span className="ml-auto self-center text-xs text-ink-muted">
            {products.length} produit{products.length !== 1 ? 's' : ''}
          </span>
        </div>
      </form>

      {/* Tableau */}
      <section className="rounded-panel border border-line bg-surface p-5 sm:p-6">
        <h2 className="font-display text-lg font-semibold text-ink mb-4">Catalogue</h2>

        {loading ? (
          <p className="py-6 text-center text-sm text-ink-muted">Chargement…</p>
        ) : error ? (
          <p className="py-6 text-center text-sm text-danger">{error}</p>
        ) : products.length === 0 ? (
          <EmptyState
            title="Aucun produit"
            description="Aucun produit ne correspond aux filtres. Créez votre premier produit pour commencer."
            action={
              <Link
                href="/boutique/articles-admin/nouveau"
                className="inline-flex min-h-10 items-center justify-center rounded-control bg-paddy px-4 py-2 text-sm font-semibold text-on-paddy transition-colors hover:bg-paddy-deep"
              >
                + Nouveau produit
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
                  <th className="pb-2 pr-3 w-14">Image</th>
                  <th className="pb-2 pr-3">Produit</th>
                  <th className="pb-2 pr-3">Catégorie</th>
                  <th className="pb-2 pr-3">Statut</th>
                  <th className="pb-2 pr-3">Prix</th>
                  <th className="pb-2 pr-3">Publié</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-b border-line/60 last:border-0 align-middle">
                    {/* Miniature */}
                    <td className="py-3 pr-3">
                      {product.image ? (
                        <div className="relative size-12 overflow-hidden rounded-control border border-line bg-grain/30">
                          <Image
                            src={product.image}
                            alt={product.name}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        </div>
                      ) : (
                        <div className="size-12 rounded-control border border-line bg-grain/30" />
                      )}
                    </td>

                    {/* Nom + slug */}
                    <td className="py-3 pr-3">
                      <p className="font-medium text-ink">{product.name}</p>
                      <p className="text-xs text-ink-muted">{product.slug}</p>
                    </td>

                    {/* Catégorie */}
                    <td className="py-3 pr-3 text-xs text-ink-muted">
                      {categories.find((c) => c.slug === product.category)?.name ?? product.category}
                    </td>

                    {/* Statut + badge Nouveau */}
                    <td className="py-3 pr-3">
                      <div className="flex flex-col gap-1">
                        <Badge tone={statusTone(product.status)}>
                          {product.status as ProductStatus}
                        </Badge>
                        {isNewProduct(product) ? (
                          <Badge tone="success">Nouveau</Badge>
                        ) : null}
                      </div>
                    </td>

                    {/* Prix */}
                    <td className="py-3 pr-3 font-semibold text-ink">
                      {product.currentPrice}
                    </td>

                    {/* Toggle publication */}
                    <td className="py-3 pr-3">
                      <button
                        type="button"
                        onClick={() => handleTogglePublished(product)}
                        disabled={togglingId === product.id}
                        aria-label={product.isPublished ? 'Dépublier' : 'Publier'}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-paddy focus:ring-offset-1 disabled:opacity-50 ${
                          product.isPublished ? 'bg-paddy' : 'bg-grain'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block size-4 rounded-full bg-white shadow transition-transform ${
                            product.isPublished ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3">
                      <div className="flex flex-col gap-1">
                        <Link
                          href={`/boutique/articles-admin/${product.id}`}
                          className="inline-flex items-center rounded-control border border-line px-2.5 py-1 text-xs font-medium text-ink hover:border-paddy hover:text-paddy"
                        >
                          Éditer
                        </Link>

                        {/* Suppression inline */}
                        {deleteError?.id === product.id ? (
                          <div className="mt-1 rounded-control border border-danger/30 bg-danger/5 p-2 text-xs text-danger">
                            <p className="mb-1">{deleteError.message}</p>
                            {deleteError.canArchive ? (
                              <button
                                type="button"
                                onClick={() => handleArchiveInstead(product.id)}
                                disabled={deletingId === product.id}
                                className="underline hover:no-underline disabled:opacity-50"
                              >
                                Archiver à la place
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => setDeleteError(null)}
                              className="ml-2 underline hover:no-underline"
                            >
                              Fermer
                            </button>
                          </div>
                        ) : confirmDeleteId === product.id ? (
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => handleDeleteConfirm(product.id)}
                              disabled={deletingId === product.id}
                              className="inline-flex items-center rounded-control bg-danger px-2.5 py-1 text-xs font-semibold text-white hover:bg-danger/80 disabled:opacity-50"
                            >
                              Confirmer
                            </button>
                            <button
                              type="button"
                              onClick={handleDeleteCancel}
                              className="inline-flex items-center rounded-control border border-line px-2.5 py-1 text-xs font-medium text-ink hover:bg-grain"
                            >
                              Annuler
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleDeleteRequest(product.id)}
                            className="inline-flex items-center rounded-control border border-danger/40 px-2.5 py-1 text-xs font-medium text-danger hover:bg-danger/5"
                          >
                            Supprimer
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
