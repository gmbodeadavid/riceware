import Link from 'next/link';
import { notFound } from 'next/navigation';
import Footer from '@/components/Footer';
import RiceWareNav from '@/components/RiceWareNav';
import RelatedProductsCarousel from '@/components/RelatedProductsCarousel';
import { PRODUCTS } from '@/lib/boutique';
import type { ProductId } from '@/lib/viewer3d/catalog';
import { ProductColorGallery, ProductColorProvider, ProductColorSwatches } from '@/components/ProductColorGallery';
import AddToCartForm from '@/components/AddToCartForm';

const VIEWER_ID_BY_SLUG: Record<string, ProductId> = {
  'assiette-plate': 'assiette',
  'barquette-repas': 'barquette',
  cuillere: 'cuillere',
  fourchette: 'fourchette',
  gobelet: 'gobelet',
};

export function generateStaticParams() {
  return PRODUCTS.map((product) => ({ slug: product.slug }));
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = PRODUCTS.find((item) => item.slug === slug);

  if (!product) {
    notFound();
  }

  const relatedProducts = PRODUCTS.filter((item) => item.slug !== product.slug);

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

            <ProductColorProvider imagesByColor={product.imagesByColor}>
              <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-stretch">
                <ProductColorGallery productName={product.name} viewerId={VIEWER_ID_BY_SLUG[product.slug]} />

                <div className="flex flex-col gap-3 lg:h-full">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-line bg-surface px-2.5 py-1 font-mono-brand text-[10px] uppercase tracking-[0.08em] text-ink-muted">
                        {product.category}
                      </span>
                    </div>
                    <h1 className="font-display text-title font-bold text-ink m-0">{product.name}</h1>
                    <ProductColorSwatches />
                  </div>

                  <div className="rounded-[18px] border border-line bg-surface p-3 sm:p-4">
                    <div>
                      <p className="text-xs text-ink-muted line-through">{product.oldPrice}</p>
                      <p className="mt-1 text-xl font-bold text-ink">{product.currentPrice}</p>
                    </div>
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