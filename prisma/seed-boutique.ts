import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CATEGORIES = [
  { slug: 'assiettes', name: 'Assiettes', sortOrder: 0 },
  { slug: 'couverts', name: 'Couverts', sortOrder: 1 },
  { slug: 'barquettes', name: 'Barquettes', sortOrder: 2 },
  { slug: 'gobelets', name: 'Gobelets', sortOrder: 3 },
  { slug: 'emballage', name: 'Emballage', sortOrder: 4 },
];

type PackDef = { key: string; label: string; quantity: number; price: string; note: string };

interface ProductDef {
  id: string;
  slug: string;
  name: string;
  category: string;
  headline: string;
  summary: string;
  format: string;
  material: string;
  image: string;
  imagesByColor: Record<string, string>;
  status: string;
  currentPrice: string;
  oldPrice: string;
  accent: string;
  sortOrder: number;
  packs: PackDef[];
}

const PRODUCTS: ProductDef[] = [
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
    accent: 'paddy',
    sortOrder: 0,
    packs: [
      { key: '10', label: 'Pack de 10 éléments', quantity: 10, price: 'À confirmer', note: 'Pour service individuel' },
      { key: '20', label: 'Pack de 20 éléments', quantity: 20, price: 'À confirmer', note: 'Pour service court' },
      { key: '30', label: 'Pack de 30 éléments', quantity: 30, price: 'À confirmer', note: 'Pour distribution de masse' },
    ],
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
    accent: 'husk',
    sortOrder: 1,
    packs: [
      { key: '10', label: 'Pack de 10 éléments', quantity: 10, price: 'À confirmer', note: 'Pour événements' },
      { key: '20', label: 'Pack de 20 éléments', quantity: 20, price: 'À confirmer', note: 'Pour petits lots' },
      { key: '30', label: 'Pack de 30 éléments', quantity: 30, price: 'À confirmer', note: 'Pour gros volumes' },
    ],
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
    accent: 'surface',
    sortOrder: 2,
    packs: [
      { key: '10', label: 'Pack de 10 éléments', quantity: 10, price: 'À confirmer', note: 'Pour couverts de table' },
      { key: '20', label: 'Pack de 20 éléments', quantity: 20, price: 'À confirmer', note: 'Pour commandes de masse' },
      { key: '30', label: 'Pack de 30 éléments', quantity: 30, price: 'À confirmer', note: 'Pour volumes réguliers' },
    ],
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
    accent: 'paddy',
    sortOrder: 3,
    packs: [
      { key: '10', label: 'Pack de 10 éléments', quantity: 10, price: 'À confirmer', note: 'Pour service quotidien' },
      { key: '20', label: 'Pack de 20 éléments', quantity: 20, price: 'À confirmer', note: 'Pour petits clients' },
      { key: '30', label: 'Pack de 30 éléments', quantity: 30, price: 'À confirmer', note: 'Pour lots reproductibles' },
    ],
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
    accent: 'husk',
    sortOrder: 4,
    packs: [
      { key: '10', label: 'Pack de 10 éléments', quantity: 10, price: 'À confirmer', note: 'Pour usage ponctuel' },
      { key: '20', label: 'Pack de 20 éléments', quantity: 20, price: 'À confirmer', note: 'Pour service régulier' },
      { key: '30', label: 'Pack de 30 éléments', quantity: 30, price: 'À confirmer', note: 'Pour clients institutionnels' },
    ],
  },
];

async function main() {
  console.log('Seeding boutique categories and products...');

  await prisma.$transaction(async (tx) => {
    // Upsert categories
    for (const cat of CATEGORIES) {
      await tx.productCategory.upsert({
        where: { slug: cat.slug },
        update: { name: cat.name, sortOrder: cat.sortOrder },
        create: { slug: cat.slug, name: cat.name, sortOrder: cat.sortOrder },
      });
    }
    console.log(`  ✓ ${CATEGORIES.length} categories upserted`);

    // Upsert products + packs
    for (const p of PRODUCTS) {
      await tx.product.upsert({
        where: { id: p.id },
        update: {
          slug: p.slug,
          name: p.name,
          category: p.category,
          headline: p.headline,
          summary: p.summary,
          format: p.format,
          material: p.material,
          image: p.image,
          imagesByColor: p.imagesByColor,
          status: p.status,
          currentPrice: p.currentPrice,
          oldPrice: p.oldPrice,
          accent: p.accent,
          sortOrder: p.sortOrder,
        },
        create: {
          id: p.id,
          slug: p.slug,
          name: p.name,
          category: p.category,
          headline: p.headline,
          summary: p.summary,
          format: p.format,
          material: p.material,
          image: p.image,
          imagesByColor: p.imagesByColor,
          status: p.status,
          currentPrice: p.currentPrice,
          oldPrice: p.oldPrice,
          accent: p.accent,
          sortOrder: p.sortOrder,
        },
      });

      for (const pack of p.packs) {
        await tx.productPack.upsert({
          where: { productId_packKey: { productId: p.id, packKey: pack.key } },
          update: { label: pack.label, quantity: pack.quantity, price: pack.price, note: pack.note },
          create: {
            id: `${p.id}-pack-${pack.key}`,
            productId: p.id,
            packKey: pack.key,
            label: pack.label,
            quantity: pack.quantity,
            price: pack.price,
            note: pack.note,
          },
        });
      }
      console.log(`  ✓ Product "${p.name}" upserted with ${p.packs.length} packs`);
    }
  });

  console.log('Boutique seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
