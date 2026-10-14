'use client';

import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import Image from 'next/image';
import Product3DTrigger from '@/components/Product3DTrigger';
import { PRODUCT_COLORS } from '@/lib/boutique';
import type { ProductColorId } from '@/lib/boutique';
import type { ProductId } from '@/lib/viewer3d/catalog';

type ProductColorContextValue = {
  selectedColor: ProductColorId;
  selectColor: (color: ProductColorId) => void;
  imagesByColor: Record<ProductColorId, string>;
};

const ProductColorContext = createContext<ProductColorContextValue | null>(null);

function useProductColor() {
  const context = useContext(ProductColorContext);
  if (!context) {
    throw new Error('Les composants de couleur doivent être dans ProductColorProvider.');
  }
  return context;
}

export function ProductColorProvider({
  imagesByColor,
  children,
}: {
  imagesByColor: Record<ProductColorId, string>;
  children: ReactNode;
}) {
  const [selectedColor, selectColor] = useState<ProductColorId>('beige');

  return (
    <ProductColorContext.Provider value={{ selectedColor, selectColor, imagesByColor }}>
      {children}
    </ProductColorContext.Provider>
  );
}

export function ProductColorSwatches() {
  const { selectedColor, selectColor } = useProductColor();

  return (
    <div role="group" aria-label="Choisir une couleur" className="flex flex-wrap items-center justify-start gap-3 sm:gap-4 pt-1">
      {PRODUCT_COLORS.map((color) => (
        <button
          key={color.id}
          type="button"
          aria-label={color.label}
          aria-pressed={selectedColor === color.id}
          title={color.label}
          onClick={() => selectColor(color.id)}
          className={`size-11 rounded-full border-2 transition-colors focus-visible:outline-2 focus-visible:outline-paddy focus-visible:outline-offset-2 ${
            selectedColor === color.id ? 'border-paddy scale-110' : 'border-line hover:border-paddy'
          }`}
          style={{ backgroundColor: color.value }}
        />
      ))}
    </div>
  );
}

export function ProductColorGallery({
  productName,
  viewerId,
}: {
  productName: string;
  viewerId: ProductId;
}) {
  const { selectedColor, imagesByColor } = useProductColor();
  const image = imagesByColor[selectedColor];
  const colorLabel = PRODUCT_COLORS.find((color) => color.id === selectedColor)?.label;

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[24px] border border-line bg-surface">
        <div className="relative aspect-[4/3] bg-ground">
          <Image
            src={image}
            alt={`${productName}, couleur ${colorLabel}`}
            fill
            sizes="(max-width: 1024px) 100vw, 58vw"
            className="object-contain p-6 sm:p-8"
          />
          <Product3DTrigger initialId={viewerId} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((index) => (
          <div key={`${selectedColor}-${index}`} className="overflow-hidden rounded-[16px] border border-line bg-surface">
            <div className="relative aspect-[4/3] bg-ground">
              <Image
                src={image}
                alt={`${productName}, ${colorLabel}, vue ${index + 1}`}
                fill
                sizes="(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 18vw"
                className="object-contain p-3"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}