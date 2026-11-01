import Image from 'next/image';
import Link from 'next/link';
import SectionLabel from './SectionLabel';
import { listProducts } from '@/lib/data/products';

export default async function ProductSection() {
  const products = await listProducts({ isPublished: true });

  return (
    <section id="produit" className="bg-surface py-section">
      <div className="max-w-page mx-auto px-5 sm:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <SectionLabel>NOTRE GAMME</SectionLabel>
            <h2 className="font-display text-title font-bold text-ink m-0">Nos produits</h2>
          </div>
          <Link href="/boutique" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-paddy px-5 py-2.5 text-sm font-semibold text-on-paddy transition-colors hover:bg-paddy-deep focus-visible:outline-2 focus-visible:outline-paddy focus-visible:outline-offset-2">
            Voir toute la gamme
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3 xl:grid-cols-5">
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/boutique/${product.slug}`}
              aria-label={product.name}
              className="group relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border border-line bg-ground shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-paddy-soft hover:shadow-md"
            >
              <Image
                src={product.image}
                alt={product.name}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                className="object-contain p-4 transition-transform duration-300 group-hover:scale-105 sm:p-6"
              />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
