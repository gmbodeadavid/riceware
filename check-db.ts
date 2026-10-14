import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany();
  console.log('Products:', JSON.stringify(products, null, 2));
  
  const packs = await prisma.productPack.findMany();
  console.log('Packs:', JSON.stringify(packs, null, 2));
  
  await prisma.$disconnect();
}

main().catch(console.error);