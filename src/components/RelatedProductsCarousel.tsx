import Image from 'next/image';
import Link from 'next/link';
import type { Product } from '@/lib/boutique';

export default function RelatedProductsCarousel({ products }: { products: Product[] }) {
  return (
    <section aria-labelledby="related-products-heading">
      <div className="mb-5">
        <h2 id="related-products-heading" className="font-display text-lg font-semibold text-ink m-0">
          Autres produits du catalogue
        </h2>
      </div>

      <div
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4"
      >
        {products.map((product) => (
          <Link
            key={product.id}
            href={`/boutique/${product.slug}`}
            className="group flex min-w-0 flex-col overflow-hidden rounded-[18px] border border-line bg-surface transition-colors hover:border-paddy"
          >
            <div className="relative aspect-[4/3] w-full overflow-hidden border-b border-line bg-ground">
              <Image
                src={product.image}
                alt={product.name}
                fill
                className="object-contain p-3 sm:p-4 transition-transform duration-300 group-hover:scale-[1.03]"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              />
            </div>
            <div className="p-3 sm:p-4">
              <h3 className="font-display text-base font-semibold text-ink m-0 sm:text-lg">{product.name}</h3>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
