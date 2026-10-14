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

export const PRODUCTS: Product[] = [
  {
    id: 'assiette-plate',
    slug: 'assiette-plate',
    name: 'Assiette plate',
    category: 'assiettes',
    headline: '',
    summary: 'Format de table robuste pour repas collectifs, cantines et services de livraison.',
    format: '21 cm',
    material: 'Coque et paille de riz + liant végétal',
    image: '/produits/assiette.webp',
    imagesByColor: {
      beige: '/produits/assiette.webp',
      ivoire: '/produits/ivoire/assiette.png',
      'vert-sauge': '/produits/vert-sauge/assiette.png',
      taupe: '/produits/taupe/assiette.png',
    },
    status: 'Prototype',
    currentPrice: 'À confirmer',
    oldPrice: 'Prix standard à venir',
    packs: [
      { id: '10', label: 'Pack de 10 éléments', quantity: 10, price: 'À confirmer', note: 'Pour service individuel' },
      { id: '20', label: 'Pack de 20 éléments', quantity: 20, price: 'À confirmer', note: 'Pour service court' },
      { id: '30', label: 'Pack de 30 éléments', quantity: 30, price: 'À confirmer', note: 'Pour distribution de masse' },
    ],
    accent: 'paddy',
  },
  {
    id: 'barquette-repas',
    slug: 'barquette-repas',
    name: 'Barquette repas',
    category: 'barquettes',
    headline: '',
    summary: 'Structure rigide avec la bonne tenue pour les plats chauds et les portions standardisées.',
    format: 'Standard 500 ml',
    material: 'Coque et paille de riz + fibres naturelles',
    image: '/produits/barquette.webp',
    imagesByColor: {
      beige: '/produits/barquette.webp',
      ivoire: '/produits/ivoire/barquette.png',
      'vert-sauge': '/produits/vert-sauge/barquette.png',
      taupe: '/produits/taupe/barquette.png',
    },
    status: 'Validé',
    currentPrice: 'À confirmer',
    oldPrice: 'Prix standard à venir',
    packs: [
      { id: '10', label: 'Pack de 10 éléments', quantity: 10, price: 'À confirmer', note: 'Pour événements' },
      { id: '20', label: 'Pack de 20 éléments', quantity: 20, price: 'À confirmer', note: 'Pour petits lots' },
      { id: '30', label: 'Pack de 30 éléments', quantity: 30, price: 'À confirmer', note: 'Pour gros volumes' },
    ],
    accent: 'husk',
  },
  {
    id: 'cuillere',
    slug: 'cuillere',
    name: 'Cuillère',
    category: 'couverts',
    headline: '',
    summary: 'Mise en forme douce pour les soupes, les desserts et les rations de cantine.',
    format: 'Longueur 18 cm',
    material: 'Coque et paille de riz + biopolymère',
    image: '/produits/cuillere.png',
    imagesByColor: {
      beige: '/produits/cuillere.png',
      ivoire: '/produits/ivoire/cuillere.png',
      'vert-sauge': '/produits/vert-sauge/cuillere.png',
      taupe: '/produits/taupe/cuillere.png',
    },
    status: 'Prototype',
    currentPrice: 'À confirmer',
    oldPrice: 'Prix standard à venir',
    packs: [
      { id: '10', label: 'Pack de 10 éléments', quantity: 10, price: 'À confirmer', note: 'Pour couverts de table' },
      { id: '20', label: 'Pack de 20 éléments', quantity: 20, price: 'À confirmer', note: 'Pour commandes de masse' },
      { id: '30', label: 'Pack de 30 éléments', quantity: 30, price: 'À confirmer', note: 'Pour volumes réguliers' },
    ],
    accent: 'surface',
  },
  {
    id: 'fourchette',
    slug: 'fourchette',
    name: 'Fourchette',
    category: 'couverts',
    headline: '',
    summary: 'Modèle robuste pour le service de restauration rapide et les usages fréquents en cuisine.',
    format: 'Longueur 18 cm',
    material: 'Coque et paille de riz + résine végétale',
    image: '/produits/fourchette.png',
    imagesByColor: {
      beige: '/produits/fourchette.png',
      ivoire: '/produits/ivoire/fourchette.png',
      'vert-sauge': '/produits/vert-sauge/fourchette.png',
      taupe: '/produits/taupe/fourchette.png',
    },
    status: 'Validé',
    currentPrice: 'À confirmer',
    oldPrice: 'Prix standard à venir',
    packs: [
      { id: '10', label: 'Pack de 10 éléments', quantity: 10, price: 'À confirmer', note: 'Pour service quotidien' },
      { id: '20', label: 'Pack de 20 éléments', quantity: 20, price: 'À confirmer', note: 'Pour petits clients' },
      { id: '30', label: 'Pack de 30 éléments', quantity: 30, price: 'À confirmer', note: 'Pour lots reproductibles' },
    ],
    accent: 'paddy',
  },
  {
    id: 'gobelet',
    slug: 'gobelet',
    name: 'Gobelet',
    category: 'gobelets',
    headline: '',
    summary: 'Un conteneur de service compact, pensé pour la consommation rapide et les pauses.',
    format: '250 ml',
    material: 'Coque et paille de riz + papier renforcé',
    image: '/produits/gobelet.png',
    imagesByColor: {
      beige: '/produits/gobelet.png',
      ivoire: '/produits/ivoire/gobelet.png',
      'vert-sauge': '/produits/vert-sauge/gobelet.png',
      taupe: '/produits/taupe/gobelet.png',
    },
    status: 'À venir',
    currentPrice: 'À confirmer',
    oldPrice: 'Prix standard à venir',
    packs: [
      { id: '10', label: 'Pack de 10 éléments', quantity: 10, price: 'À confirmer', note: 'Pour usage ponctuel' },
      { id: '20', label: 'Pack de 20 éléments', quantity: 20, price: 'À confirmer', note: 'Pour service régulier' },
      { id: '30', label: 'Pack de 30 éléments', quantity: 30, price: 'À confirmer', note: 'Pour clients institutionnels' },
    ],
    accent: 'husk',
  },
];

export const CATEGORY_LOOKUP = Object.fromEntries(
  CATEGORY_OPTIONS.map((option) => [option.id, option.label]),
) as Record<string, string>;

export function getCategoryLabel(category: ProductCategory | 'toutes') {
  return CATEGORY_LOOKUP[category] ?? 'Produit';
}

export function getFilteredProducts(category: string, query: string) {
  const selectedCategory = category === 'toutes' ? 'toutes' : category;
  const normalizedQuery = query.trim().toLowerCase();

  return PRODUCTS.filter((product) => {
    const matchesCategory = selectedCategory === 'toutes' || product.category === selectedCategory;
    if (!matchesCategory) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const searchable = [
      product.name,
      product.headline,
      product.summary,
      product.category,
      product.format,
      product.material,
      product.status,
    ]
      .join(' ')
      .toLowerCase();

    return searchable.includes(normalizedQuery);
  });
}
