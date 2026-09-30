'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import ProductViewerModal from './ProductViewerModal';
import type { ProductId } from '@/lib/viewer3d/catalog';

// Same order as VIEWER_PRODUCTS: `id` links each photo to its 3D model.
const PRODUCTS: { id: ProductId; name: string; src: string; alt: string }[] = [
  { id: 'barquette', name: 'Barquette', src: '/produits/barquette.webp', alt: 'Barquette alimentaire ouverte en fibre de coque de riz' },
  { id: 'assiette', name: 'Assiette', src: '/produits/assiette.webp', alt: 'Assiette ronde en fibre de coque de riz, vue de dessus' },
  { id: 'cuillere', name: 'Cuillère', src: '/produits/cuillere.png', alt: 'Cuillère en fibre de coque de riz' },
  { id: 'fourchette', name: 'Fourchette', src: '/produits/fourchette.png', alt: 'Fourchette en fibre de coque de riz' },
  { id: 'gobelet', name: 'Gobelet', src: '/produits/gobelet.png', alt: 'Pile de gobelets en fibre de coque de riz' },
];

// A horizontal drag of at least this many pixels changes slide.
const SWIPE_THRESHOLD = 40;

export default function ProductCarousel() {
  const [index, setIndex] = useState(0);
  // The product shown in the 3D window, or null while it is closed.
  const [viewing, setViewing] = useState<ProductId | null>(null);
  const dragStart = useRef<number | null>(null);

  const goTo = (next: number) => setIndex((next + PRODUCTS.length) % PRODUCTS.length);

  // Leaving the 3D window on another product brings the carousel to that product too.
  const closeViewer = (lastId: ProductId) => {
    const shown = PRODUCTS.findIndex((product) => product.id === lastId);
    if (shown >= 0) setIndex(shown);
    setViewing(null);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      goTo(index + 1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goTo(index - 1);
    }
  };

  const onPointerDown = (event: PointerEvent) => {
    dragStart.current = event.clientX;
  };

  const onPointerUp = (event: PointerEvent) => {
    if (dragStart.current === null) return;
    const distance = event.clientX - dragStart.current;
    dragStart.current = null;
    if (Math.abs(distance) >= SWIPE_THRESHOLD) goTo(index + (distance < 0 ? 1 : -1));
  };

  return (
    <>
    <div
      role="group"
      aria-roledescription="carrousel"
      aria-label="Produits RiceWare"
      onKeyDown={onKeyDown}
      className="relative bg-husk-soft rounded-[10px] p-5 sm:p-6 flex flex-col"
    >
      {/* Slides are stacked and cross-fade; touch-pan-y lets the page scroll vertically while a horizontal swipe changes slide. */}
      <div
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          dragStart.current = null;
        }}
        className="relative flex-1 min-h-[220px] sm:min-h-[260px] touch-pan-y select-none"
      >
        {PRODUCTS.map((product, i) => {
          const active = i === index;

          return (
            <div
              key={product.name}
              role="group"
              aria-roledescription="diapositive"
              aria-label={`${i + 1} sur ${PRODUCTS.length} : ${product.name}`}
              aria-hidden={!active}
              className={`absolute inset-0 transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none ${active ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
            >
              <Image
                src={product.src}
                alt={product.alt}
                fill
                sizes="(min-width: 1200px) 480px, (min-width: 768px) 40vw, 90vw"
                draggable={false}
                className="object-contain p-2 drop-shadow-xl"
              />
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-col items-end gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full min-w-0">
          <p aria-live="polite" className="font-mono-brand text-[11px] tracking-[0.1em] uppercase text-husk-text text-left mt-0 mb-1">
            {PRODUCTS[index].name}
          </p>

          {/* Each dot has a 24px hit area around a 10px mark; the current one stretches into a pill. */}
          <div className="flex justify-start">
            {PRODUCTS.map((product, i) => (
              <button
                key={product.name}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Afficher : ${product.name}`}
                aria-current={i === index}
                className="group h-6 px-[5px] flex items-center cursor-pointer focus-visible:outline-2 focus-visible:outline-husk-deep focus-visible:outline-offset-[-2px] rounded-full"
              >
                <span
                  className={`block h-2.5 rounded-full transition-[width,background-color] duration-300 motion-reduce:transition-none ${i === index ? 'w-6 bg-husk-text' : 'w-2.5 bg-husk-deep/40 group-hover:bg-husk-deep'}`}
                />
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setViewing(PRODUCTS[index].id)}
          aria-haspopup="dialog"
          aria-label={`Explorer ${PRODUCTS[index].name} en 3D`}
          className="inline-flex shrink-0 items-center gap-2 rounded-md border border-line bg-surface px-3.5 py-2 text-[13px] font-semibold text-ink transition-colors hover:border-husk-deep hover:bg-ground cursor-pointer focus-visible:outline-2 focus-visible:outline-paddy focus-visible:outline-offset-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zM12 12l8-4.5M12 12v9M12 12L4 7.5" />
          </svg>
          Explorer en 3D
        </button>
      </div>
    </div>
    {viewing && <ProductViewerModal initialId={viewing} onClose={closeViewer} />}
    </>
  );
}
