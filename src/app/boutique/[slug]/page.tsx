import Link from 'next/link';
import { notFound } from 'next/navigation';
import Footer from '@/components/Footer';
import RiceWareNav from '@/components/RiceWareNav';
import RelatedProductsCarousel from '@/components/RelatedProductsCarousel';
import { listProducts, getProductBySlug } from '@/lib/data/products';
import { ProductColorGallery, ProductColorProvider, ProductColorSwatches } from '@/components/ProductColorGallery';
import AddToCartForm from '@/components/AddToCartForm';

export const dynamic = 'force-dynamic';

function isRecentProduct(createdAt: Date): boolean {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return createdAt > thirtyDaysAgo;
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const allProducts = await listProducts({ isPublished: true });
  const relatedProducts = allProducts.filter((item) => item.slug !== product.slug);
  const viewerSrc = product.model3dUrl ?? undefined;
  const showNewBadge = product.isNew || isRecentProduct(product.createdAt);

  return (
    <div className="min-h-screen w-full bg-ground font-body text-ink flex flex-col">
      <RiceWareNav />
      <main className="flex-1">
        <section className="bg-ground pt-12 pb-section">
          <div className="max-w-page mx-auto px-5 sm:px-8">
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <Link href="/boutique" className="inline-flex size-11 items-center justify-center rounded-full border border-line bg-surface text-ink transition-colors hover:border-paddy hover:text-paddy focus-visible:outline-2 focus-visible:outline-paddy focus-visible:outline-offset-2" aria-label="Retour au catalogue">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </Link>
            </div>

            <ProductColorProvider imagesByColor={product.imagesByColor as Record<string, string>}>
              <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-stretch">
                <ProductColorGallery
                  productName={product.name}
                  viewerSrc={viewerSrc}
                  viewsByColor={product.viewsByColor}
                />

                <div className="flex flex-col gap-3 lg:h-full">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-line bg-surface px-2.5 py-1 font-mono-brand text-[10px] uppercase tracking-[0.08em] text-ink-muted">
                        {product.category}
                      </span>
                      {showNewBadge && (
                        <span className="inline-flex items-center rounded-full bg-paddy/10 px-2.5 py-0.5 text-xs font-medium text-paddy-deep">
                          Nouveau
                        </span>
                      )}
                    </div>
                    <h1 className="font-display text-title font-bold text-ink m-0">{product.name}</h1>
                    <ProductColorSwatches />
                  </div>

                  <AddToCartForm product={product} />
                </div>
              </div>
            </ProductColorProvider>
          </div>
        </section>

        <section className="bg-ground pt-0 pb-section">
          <div className="max-w-page mx-auto px-5 sm:px-8">
            <RelatedProductsCarousel products={relatedProducts} />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}