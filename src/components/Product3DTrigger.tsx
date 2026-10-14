'use client';

import { useState } from 'react';
import ProductViewerModal from '@/components/ProductViewerModal';
import type { ProductId } from '@/lib/viewer3d/catalog';

export default function Product3DTrigger({ initialId }: { initialId: ProductId }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-haspopup="dialog"
        className="absolute bottom-3 right-3 inline-flex min-h-11 items-center gap-2 rounded-md border border-line bg-surface/95 px-3.5 text-sm font-semibold text-ink shadow-sm transition-colors hover:border-paddy focus-visible:outline-2 focus-visible:outline-paddy focus-visible:outline-offset-2"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zM12 12l8-4.5M12 12v9M12 12L4 7.5" />
        </svg>
        Explorer en 3D
      </button>
      {isOpen && <ProductViewerModal initialId={initialId} onClose={() => setIsOpen(false)} />}
    </>
  );
}
