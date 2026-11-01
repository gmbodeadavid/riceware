export type ProductCategory = 'assiettes' | 'couverts' | 'barquettes' | 'gobelets' | 'emballage';
export type ProductStatus = 'Prototype' | 'Validé' | 'À venir';

export const PRODUCT_COLORS = [
  { id: 'beige', label: 'Beige sable', value: '#C4A58C' },
  { id: 'ivoire', label: 'Ivoire', value: '#E8E4D9' },
  { id: 'vert-sauge', label: 'Vert sauge', value: '#A5C9A4' },
  { id: 'taupe', label: 'Taupe', value: '#A98B73' },
] as const;

export type ProductColorId = (typeof PRODUCT_COLORS)[number]['id'];

export interface ProductPack {
  id: string;
  label: string;
  quantity: number;
  price: string;
  priceValue: number;
  note: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: ProductCategory;
  headline: string;
  summary: string;
  format: string;
  material: string;
  image: string;
  imagesByColor: Record<ProductColorId, string>;
  status: ProductStatus;
  currentPrice: string;
  oldPrice: string;
  packs: ProductPack[];
  accent: 'paddy' | 'husk' | 'surface';
}

export const CATEGORY_OPTIONS = [
  { id: 'toutes', label: 'Tout le catalogue' },
  { id: 'assiettes', label: 'Assiettes' },
  { id: 'couverts', label: 'Couverts' },
  { id: 'barquettes', label: 'Barquettes' },
  { id: 'gobelets', label: 'Gobelets' },
] as const;

export const CATEGORY_LOOKUP = Object.fromEntries(
  CATEGORY_OPTIONS.map((option) => [option.id, option.label]),
) as Record<string, string>;

export function getCategoryLabel(category: ProductCategory | 'toutes') {
  return CATEGORY_LOOKUP[category] ?? 'Produit';
}

