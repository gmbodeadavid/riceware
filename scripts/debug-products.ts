import { prisma } from '../src/lib/db';

async function main() {
  const rows = await prisma.product.findMany({ select: { slug: true, imagesByColor: true, image: true } });
  for (const r of rows) {
    console.log(r.slug, '| image:', r.image, '| imagesByColor:', JSON.stringify(r.imagesByColor));
  }
  await prisma.$disconnect();
}

main();
