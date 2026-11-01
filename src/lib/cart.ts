// Minimal product shape needed by createCartItem — compatible with both Product (boutique.ts) and ProductRow (data/products.ts).
interface CartProduct {
  slug: string;
  name: string;
  image: string;
  format: string;
  packs: Array<{ id: string; label: string; quantity: number; price: string; priceValue: number; note: string }>;
  imagesByColor?: Record<string, string>;
}

export const CART_STORAGE_KEY = 'riceware:cart';
export const CART_UPDATED_EVENT = 'riceware:cart-updated';
export const LAST_ORDER_STORAGE_KEY = 'riceware:last-order';
export const ORDERS_STORAGE_KEY = 'riceware:orders';

export interface CartItem {
  id: string;
  productSlug: string;
  productName: string;
  productImage: string;
  productFormat: string;
  packId: string;
  packLabel: string;
  packQuantity: number;
  packPrice: string;
  packPriceValue: number;
  packNote: string;
  quantity: number;
  /** Color selected at add-to-cart time (e.g. "beige", "vert-sauge") */
  productColor: string;
  /** Human-readable color label (e.g. "Beige sable") */
  productColorLabel: string;
  /** Image URL for the selected color (snapshot at add time) */
  productColorImage: string;
}

export interface CheckoutCustomer {
  fullName: string;
  phone: string;
  email: string;
  city: string;
  district: string;
  addressDetails: string;
  deliveryInstructions: string;
  channel: 'site' | 'whatsapp' | 'phone' | 'direct_sale' | 'partner';
}

export type PaymentPlan = 'comptant' | 'flex';
export type DeliveryOption = 'standard' | 'express';
export type PaymentMethod = 'wave' | 'orange_money' | 'djamo' | 'mtn_momo' | 'moov_money';

export interface StoredOrder {
  orderNumber: string;
  createdAt: string;
  paymentPlan?: PaymentPlan;
  deliveryOption?: DeliveryOption;
  paymentMethod?: PaymentMethod;
  status: 'reçue' | 'à confirmer';
  paymentStatus: 'à confirmer';
  customer: CheckoutCustomer;
  items: CartItem[];
  totalPacks: number;
  totalArticles: number;
  commercialNote: string;
}

export function createCartItem(
  product: CartProduct,
  packId: string,
  quantity: number,
  color: string = 'beige',
  colorLabel: string = 'Beige sable',
): CartItem {
  const pack = product.packs.find((item) => item.id === packId) ?? product.packs[0];
  const colorImage = product.imagesByColor?.[color] ?? product.image;

  return {
    // Include color in id so same pack in different colors = separate cart lines
    id: `${product.slug}:${pack.id}:${color}`,
    productSlug: product.slug,
    productName: product.name,
    productImage: colorImage,
    productFormat: product.format,
    packId: pack.id,
    packLabel: pack.label,
    packQuantity: pack.quantity,
    packPrice: pack.price,
    packPriceValue: pack.priceValue,
    packNote: pack.note,
    quantity,
    productColor: color,
    productColorLabel: colorLabel,
    productColorImage: colorImage,
  };
}

export function getCartTotals(items: CartItem[]) {
  return {
    totalPacks: items.reduce((sum, item) => sum + item.quantity, 0),
    totalArticles: items.reduce((sum, item) => sum + item.packQuantity * item.quantity, 0),
    hasConfirmedPrices: items.every((item) => item.packPrice !== 'À confirmer'),
  };
}

export function createOrderNumber(date = new Date()) {
  const compactDate = date.toISOString().slice(0, 10).replaceAll('-', '');
  const compactTime = date.toTimeString().slice(0, 8).replaceAll(':', '');
  return `RW-CMD-${compactDate}-${compactTime}`;
}

export function readJsonStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const rawValue = window.localStorage.getItem(key);
    return rawValue ? (JSON.parse(rawValue) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJsonStorage<T>(key: string, value: T) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));

  if (key === CART_STORAGE_KEY) {
    window.dispatchEvent(new Event(CART_UPDATED_EVENT));
  }
}

export function addItemToCart(nextItem: CartItem) {
  const cart = readJsonStorage<CartItem[]>(CART_STORAGE_KEY, []);
  const existingItem = cart.find((item) => item.id === nextItem.id);
  const nextCart = existingItem
    ? cart.map((item) => (
      item.id === nextItem.id
        ? { ...item, quantity: item.quantity + nextItem.quantity }
        : item
    ))
    : [...cart, nextItem];

  writeJsonStorage(CART_STORAGE_KEY, nextCart);
  return nextCart;
}

export function getCartCount(): number {
  const cart = readJsonStorage<CartItem[]>(CART_STORAGE_KEY, []);
  return cart.reduce((sum, item) => sum + item.quantity, 0);
}

export function subscribeToCart(listener: () => void) {
  if (typeof window === 'undefined') return () => {};
  const handler = () => listener();
  window.addEventListener('storage', handler);
  window.addEventListener(CART_UPDATED_EVENT, handler);
  return () => {
    window.removeEventListener('storage', handler);
    window.removeEventListener(CART_UPDATED_EVENT, handler);
  };
}
