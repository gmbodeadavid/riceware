'use client';

import { useSyncExternalStore } from 'react';
import { getCartCount, subscribeToCart } from '@/lib/cart';

export default function CartIcon() {
  const count = useSyncExternalStore(subscribeToCart, getCartCount, () => 0);

  if (count === 0) return null;
  return (
    <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-paddy text-[10px] font-bold text-on-paddy">
      {count > 99 ? '99+' : count}
    </span>
  );
}
