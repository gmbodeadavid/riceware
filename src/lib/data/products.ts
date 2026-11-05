import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { formatCurrency } from '@/lib/format';

// ─── Types de sortie ─────────────────────────────────────────────────────────

export interface ProductPackRow {
  id: string;
  productId: string;
  packKey: string;
  label: string;
  quantity: number;
  price: string;
  priceValue: number;
  note: string;
}

export interface ProductRow {
  id: string;
  slug: string;
  name: string;
  category: string;
  headline: string;
  summary: string;
  format: string;
  material: string;
  accent: string;
  status: string;
  isPublished: boolean;
  isNew: boolean;
  currentPrice: string;
  oldPrice: string;
  image: string;
  imagesByColor: Record<string, string>;
  galleryImages: string[];
  viewsByColor: Record<string, string[]>;
  model3dUrl: string | null;
  sortOrder: number;
  createdAt: Date;
  packs: ProductPackRow[];
}

export interface ProductCategoryRow {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
  createdAt: Date;
}

export interface ProductStats {
  total: number;
  published: number;
  archived: number;
  byStatus: Record<string, number>;
}

// ─── Types d'entrée ───────────────────────────────────────────────────────────

export interface CreateProductInput {
  id?: string;
  slug: string;
  name: string;
  category: string;
  headline?: string;
  summary: string;
  format: string;
  material: string;
  accent: 'paddy' | 'husk' | 'surface';
  status: 'Prototype' | 'Validé' | 'À venir';
  isPublished?: boolean;
  isNew?: boolean;
  currentPrice: string;
  oldPrice?: string;
  image: string;
  imagesByColor: Record<string, string>;
  galleryImages?: string[];
  viewsByColor?: Record<string, string[]>;
  model3dUrl?: string;
  sortOrder?: number;
  packs: Array<{
    packKey: string;
    label: string;
    quantity: number;
    price: string;
    priceValue: number;
    note: string;
  }>;
}

export type UpdateProductInput = Partial<Omit<CreateProductInput, 'id'>>;

// ─── Helpers internes ─────────────────────────────────────────────────────────

const packInclude = { packs: true } satisfies Prisma.ProductInclude;

function mapProductRow(
  row: Prisma.ProductGetPayload<{ include: { packs: true } }>,
): ProductRow {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    headline: row.headline,
    summary: row.summary,
    format: row.format,
    material: row.material,
    accent: row.accent,
    status: row.status,
    isPublished: row.isPublished,
    isNew: row.isNew,
    currentPrice: row.currentPrice,
    oldPrice: row.oldPrice,
    image: row.image,
    imagesByColor: (row.imagesByColor ?? {}) as Record<string, string>,
    galleryImages: (row.galleryImages ?? []) as string[],
    viewsByColor: (row.viewsByColor ?? {}) as Record<string, string[]>,
    model3dUrl: row.model3dUrl,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    packs: row.packs.map((p) => ({
      id: p.id,
      productId: p.productId,
      packKey: p.packKey,
      label: p.label,
      quantity: p.quantity,
      priceValue: p.priceValue,
      price: p.priceValue > 0 ? formatCurrency(p.priceValue) : p.price,
      note: p.note,
    })),
  };
}

// ─── Fonctions exportées ──────────────────────────────────────────────────────

export async function listProducts(opts?: {
  isPublished?: boolean;
  category?: string;
  status?: string;
  search?: string;
}): Promise<ProductRow[]> {
  const where: Prisma.ProductWhereInput = {};
  if (opts?.isPublished !== undefined) where.isPublished = opts.isPublished;
  if (opts?.category) where.category = opts.category;
  if (opts?.status) where.status = opts.status;
  if (opts?.search) {
    where.OR = [
      { name: { contains: opts.search } },
      { summary: { contains: opts.search } },
      { headline: { contains: opts.search } },
    ];
  }

  const rows = await prisma.product.findMany({
    where,
    include: packInclude,
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });

  return rows.map(mapProductRow);
}

export async function getProductBySlug(slug: string): Promise<ProductRow | null> {
  const row = await prisma.product.findUnique({ where: { slug }, include: packInclude });
  return row ? mapProductRow(row) : null;
}

export async function getProductById(id: string): Promise<ProductRow | null> {
  const row = await prisma.product.findUnique({ where: { id }, include: packInclude });
  return row ? mapProductRow(row) : null;
}

export async function createProduct(data: CreateProductInput): Promise<ProductRow> {
  const productId = data.id ?? crypto.randomUUID();

  const row = await prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        id: productId,
        slug: data.slug,
        name: data.name,
        category: data.category,
        headline: data.headline ?? '',
        summary: data.summary,
        format: data.format,
        material: data.material,
        accent: data.accent,
        status: data.status,
        isPublished: data.isPublished ?? true,
        isNew: data.isNew ?? false,
        currentPrice: data.currentPrice,
        oldPrice: data.oldPrice ?? '',
        image: data.image,
        imagesByColor: data.imagesByColor,
        galleryImages: data.galleryImages ?? [],
        viewsByColor: data.viewsByColor ?? {},
        model3dUrl: data.model3dUrl ?? null,
        sortOrder: data.sortOrder ?? 0,
      },
    });

    if (data.packs.length > 0) {
      await tx.productPack.createMany({
        data: data.packs.map((pack) => ({
          id: `${productId}-pack-${pack.packKey}`,
          productId,
          packKey: pack.packKey,
          label: pack.label,
          quantity: pack.quantity,
          priceValue: pack.priceValue ?? 0,
          price: pack.priceValue && pack.priceValue > 0
            ? formatCurrency(pack.priceValue)
            : pack.price,
          note: pack.note,
        })),
      });
    }

    return tx.product.findUniqueOrThrow({ where: { id: productId }, include: packInclude });
  });

  return mapProductRow(row);
}

export async function updateProduct(id: string, data: UpdateProductInput): Promise<ProductRow> {
  const row = await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id },
      data: {
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.name !== undefined && { name: data.name }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.headline !== undefined && { headline: data.headline }),
        ...(data.summary !== undefined && { summary: data.summary }),
        ...(data.format !== undefined && { format: data.format }),
        ...(data.material !== undefined && { material: data.material }),
        ...(data.accent !== undefined && { accent: data.accent }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.isPublished !== undefined && { isPublished: data.isPublished }),
        ...(data.isNew !== undefined && { isNew: data.isNew }),
        ...(data.currentPrice !== undefined && { currentPrice: data.currentPrice }),
        ...(data.oldPrice !== undefined && { oldPrice: data.oldPrice }),
        ...(data.image !== undefined && { image: data.image }),
        ...(data.imagesByColor !== undefined && { imagesByColor: data.imagesByColor }),
        ...(data.galleryImages !== undefined && { galleryImages: data.galleryImages }),
        ...(data.viewsByColor !== undefined && { viewsByColor: data.viewsByColor }),
        ...(data.model3dUrl !== undefined && { model3dUrl: data.model3dUrl }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      },
    });

    if (data.packs !== undefined) {
      // Upsert différentiel : ne supprime que les packs sans PackLot actif
      // pour respecter la contrainte FK PackLot → ProductPack sous PostgreSQL.
      const incomingKeys = new Set(data.packs.map((p) => p.packKey));

      const existing = await tx.productPack.findMany({
        where: { productId: id },
        include: { packLots: { where: { deletedAt: null }, take: 1 } },
      });
      const toDelete = existing
        .filter((p) => !incomingKeys.has(p.packKey) && p.packLots.length === 0)
        .map((p) => p.id);
      if (toDelete.length > 0) {
        await tx.productPack.deleteMany({ where: { id: { in: toDelete } } });
      }

      for (const pack of data.packs) {
        const packId = `${id}-pack-${pack.packKey}`;
        const price = pack.priceValue && pack.priceValue > 0
          ? formatCurrency(pack.priceValue)
          : pack.price;
        await tx.productPack.upsert({
          where: { id: packId },
          update: { label: pack.label, quantity: pack.quantity, priceValue: pack.priceValue ?? 0, price, note: pack.note },
          create: { id: packId, productId: id, packKey: pack.packKey, label: pack.label, quantity: pack.quantity, priceValue: pack.priceValue ?? 0, price, note: pack.note },
        });
      }
    }

    return tx.product.findUniqueOrThrow({ where: { id }, include: packInclude });
  });

  return mapProductRow(row);
}

export async function deleteProduct(
  id: string,
): Promise<{ deleted: true } | { error: string; canArchive: true }> {
  const usageCount = await prisma.orderLine.count({ where: { productId: id } });
  if (usageCount > 0) {
    return {
      error: `Ce produit est référencé dans ${usageCount} ligne(s) de commande et ne peut pas être supprimé. Vous pouvez l'archiver à la place.`,
      canArchive: true,
    };
  }

  await prisma.product.delete({ where: { id } });
  return { deleted: true };
}

export async function listCategories(): Promise<ProductCategoryRow[]> {
  const rows = await prisma.productCategory.findMany({
    orderBy: { sortOrder: 'asc' },
  });
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    sortOrder: r.sortOrder,
    createdAt: r.createdAt,
  }));
}

export async function createCategory(data: {
  slug: string;
  name: string;
  sortOrder?: number;
}): Promise<ProductCategoryRow> {
  const existing = await prisma.productCategory.findUnique({ where: { slug: data.slug } });
  if (existing) {
    throw new Error(`Une catégorie avec le slug "${data.slug}" existe déjà.`);
  }

  const row = await prisma.productCategory.create({
    data: {
      slug: data.slug,
      name: data.name,
      sortOrder: data.sortOrder ?? 0,
    },
  });

  return { id: row.id, slug: row.slug, name: row.name, sortOrder: row.sortOrder, createdAt: row.createdAt };
}

export async function getProductStats(): Promise<ProductStats> {
  const products = await prisma.product.findMany({
    select: { status: true, isPublished: true },
  });

  const byStatus: Record<string, number> = {};
  for (const p of products) {
    byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;
  }

  return {
    total: products.length,
    published: products.filter((p) => p.isPublished).length,
    archived: products.filter((p) => !p.isPublished).length,
    byStatus,
  };
}
