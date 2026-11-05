import type { Metadata } from 'next';
import Link from 'next/link';
import Footer from '@/components/Footer';
import RiceWareNav from '@/components/RiceWareNav';
import SectionLabel from '@/components/SectionLabel';
import type { ProductCategory } from '@/lib/boutique';
import { CATEGORY_OPTIONS, getCategoryLabel } from '@/lib/boutique';
import { listProducts } from '@/lib/data/products';
import BoutiqueCatalogClient from '@/components/BoutiqueCatalogClient';

export const metadata: Metadata = {
  title: 'Boutique | RiceWare CI',
  description: 'Catalogue produit RiceWare CI : assiettes, couverts, barquettes et gobelets.',
};

function createCategoryHref(categoryId: string, query: string) {
  const params = new URLSearchParams();

  if (categoryId && categoryId !== 'toutes') {
    params.set('category', categoryId);
  }

  if (query) {
    params.set('q', query);
  }

  const suffix = params.toString();
  return suffix ? `/boutique?${suffix}` : '/boutique';
}

export default async function BoutiquePage({
  searchParams,
}: {
  searchParams?: Promise<{ category?: string; q?: string; produit?: string }> | { category?: string; q?: string; produit?: string };
}) {
  const params = await Promise.resolve(searchParams ?? {});
  const categoryParam = Array.isArray(params.category) ? params.category[0] : params.category;
  const queryParam = Array.isArray(params.q) ? params.q[0] : params.q;
  const productParam = Array.isArray(params.produit) ? params.produit[0] : params.produit;
  const selectedCategory: ProductCategory | 'toutes' = categoryParam && CATEGORY_OPTIONS.some((option) => option.id === categoryParam)
    ? (categoryParam as ProductCategory)
    : 'toutes';
  const query = queryParam ?? '';
  const filteredProducts = await listProducts({
    isPublished: true,
    category: selectedCategory !== 'toutes' ? selectedCategory : undefined,
    search: query || undefined,
  });
  const selectedProduct = filteredProducts.find((product) => product.slug === productParam) ?? null;

  return (
    <div className="min-h-screen w-full bg-ground font-body text-ink flex flex-col">
      <RiceWareNav />
      <main className="flex-1">
        <section className="bg-ground py-section">
          <div className="max-w-page mx-auto px-5 sm:px-8">
            <SectionLabel>CATALOGUE</SectionLabel>

            <div className="mb-6">
              <h1 className="font-display text-title font-bold text-ink m-0 max-w-[680px]">
                La gamme RiceWare en catalogue.
              </h1>
            </div>

            <div className="rounded-[22px] border border-line bg-surface p-4 sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <form action="/boutique" method="get" className="w-full max-w-xs">
                  <label htmlFor="catalog-search" className="sr-only">
                    Rechercher un produit
                  </label>
                  <div className="flex w-full items-center gap-2 rounded-full border border-line bg-ground px-3 py-2.5">
                    <span aria-hidden="true" className="text-ink-muted">⌕</span>
                    <input
                      id="catalog-search"
                      name="q"
                      defaultValue={query}
                      placeholder="Rechercher une référence"
                      className="w-full bg-transparent text-sm text-ink placeholder:text-ink-muted outline-none"
                    />
                    {selectedCategory !== 'toutes' ? (
                      <input type="hidden" name="category" value={selectedCategory} />
                    ) : null}
                  </div>
                </form>

                <div className="flex flex-wrap items-center gap-2">
                  {CATEGORY_OPTIONS.map((option) => {
                    const isActive = option.id === selectedCategory;
                    return (
                      <Link
                        key={option.id}
                        href={createCategoryHref(option.id, query)}
                        aria-current={isActive ? 'page' : undefined}
                        className={[
                          'inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                          isActive
                            ? 'border-paddy bg-paddy text-on-paddy'
                            : 'border-line bg-ground text-ink hover:border-paddy hover:text-paddy',
                        ].join(' ')}
                      >
                        {option.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-mono-brand text-[11px] uppercase tracking-[0.08em] text-ink-muted m-0">
                {filteredProducts.length} {filteredProducts.length <= 1 ? 'produit' : 'produits'} · {getCategoryLabel(selectedCategory)}
              </p>
            </div>

            <BoutiqueCatalogClient
              key={selectedProduct?.slug ?? 'catalogue'}
              selectedProduct={selectedProduct}
              filteredProducts={filteredProducts}
            />

          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}