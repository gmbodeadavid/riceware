import { PrismaClient } from '@prisma/client';
import { CATALOG_PRODUCTS } from '../src/lib/catalogSeed';

const prisma = new PrismaClient();

async function main() {
  for (const [index, product] of CATALOG_PRODUCTS.entries()) {
    await prisma.product.upsert({
      where: { id: product.id },
      update: {
        slug: product.slug,
        name: product.name,
        category: product.category,
        headline: product.headline,
        summary: product.summary,
        format: product.format,
        material: product.material,
        image: product.image,
        imagesByColor: product.imagesByColor,
        status: product.status,
        currentPrice: product.currentPrice,
        oldPrice: product.oldPrice,
        accent: product.accent,
        sortOrder: index,
      },
      create: {
        id: product.id,
        slug: product.slug,
        name: product.name,
        category: product.category,
        headline: product.headline,
        summary: product.summary,
        format: product.format,
        material: product.material,
        image: product.image,
        imagesByColor: product.imagesByColor,
        status: product.status,
        currentPrice: product.currentPrice,
        oldPrice: product.oldPrice,
        accent: product.accent,
        sortOrder: index,
      },
    });

    for (const pack of product.packs) {
      const packId = `${product.id}-${pack.id}`;
      await prisma.productPack.upsert({
        where: { id: packId },
        update: {
          packKey: pack.id,
          label: pack.label,
          quantity: pack.quantity,
          price: pack.price,
          note: pack.note,
        },
        create: {
          id: packId,
          productId: product.id,
          packKey: pack.id,
          label: pack.label,
          quantity: pack.quantity,
          price: pack.price,
          note: pack.note,
        },
      });
    }
  }

  await prisma.blogAuthor.upsert({
    where: { slug: 'riceware-ci' },
    update: { name: 'RiceWare CI' },
    create: {
      name: 'RiceWare CI',
      slug: 'riceware-ci',
      bio: 'Équipe éditoriale RiceWare CI.',
    },
  });

  await prisma.blogSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: { id: 'default' },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
