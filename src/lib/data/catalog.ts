import { prisma } from '@/lib/db';
import { mapProduct } from '@/lib/data/mappers';
import type { Product } from '@/lib/boutique';

const packOrder = { packs: { orderBy: { quantity: 'asc' as const } } };

export async function getCatalogProducts(): Promise<Product[]> {
  const rows = await prisma.product.findMany({
    include: packOrder,
    orderBy: { sortOrder: 'asc' },
  });
  return rows.map(mapProduct);
}

export async function getCatalogProductBySlug(slug: string): Promise<Product | null> {
  const row = await prisma.product.findUnique({
    where: { slug },
    include: packOrder,
  });
  return row ? mapProduct(row) : null;
}

export async function getCatalogProductById(id: string): Promise<Product | null> {
  const row = await prisma.product.findUnique({
    where: { id },
    include: packOrder,
  });
  return row ? mapProduct(row) : null;
}

export async function getProductPack(productPackId: string) {
  return prisma.productPack.findUnique({
    where: { id: productPackId },
    include: { product: true },
  });
}
