import type {
  Address,
  BlogAuthor,
  BlogCategory,
  BlogMedia,
  BlogPost,
  BlogSettings,
  BlogTag,
  Customer,
  Order,
  OrderLine,
  OrderStatus,
  PaymentStatus,
  SalesChannel,
  AnyBlogBlock,
} from '@/lib/ricewareModels';
import type { Product, ProductCategory, ProductColorId, ProductPack, ProductStatus } from '@/lib/boutique';
import { PRODUCT_COLORS } from '@/lib/boutique';
import { toIso, toIsoRequired } from '@/lib/dates';
import type {
  Address as AddressRow,
  BlogAuthor as AuthorRow,
  BlogCategory as CategoryRow,
  BlogMedia as MediaRow,
  BlogPost as PostRow,
  BlogSettings as SettingsRow,
  BlogTag as TagRow,
  Customer as CustomerRow,
  Order as OrderRow,
  OrderLine as OrderLineRow,
  Product as ProductRow,
  ProductPack as ProductPackRow,
} from '@prisma/client';

const COLOR_IDS = new Set(PRODUCT_COLORS.map((color) => color.id));

function parseJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  return value as T;
}

export function mapProduct(
  row: ProductRow & { packs: ProductPackRow[] },
): Product {
  const images = parseJson<Record<string, string>>(row.imagesByColor, {});
  const imagesByColor = Object.fromEntries(
    Object.entries(images).filter(([key]) => COLOR_IDS.has(key as ProductColorId)),
  ) as Record<ProductColorId, string>;

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category as ProductCategory,
    headline: row.headline,
    summary: row.summary,
    format: row.format,
    material: row.material,
    image: row.image,
    imagesByColor,
    status: row.status as ProductStatus,
    currentPrice: row.currentPrice,
    oldPrice: row.oldPrice,
    accent: row.accent as Product['accent'],
    packs: row.packs.map(mapProductPack),
  };
}

export function mapProductPack(row: ProductPackRow): ProductPack {
  return {
    id: row.id,
    label: row.label,
    quantity: row.quantity,
    price: row.price,
    note: row.note,
  };
}

export function mapAuthor(row: AuthorRow): BlogAuthor {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    bio: row.bio ?? undefined,
    avatarUrl: row.avatarUrl ?? undefined,
    socialLinks: parseJson<BlogAuthor['socialLinks']>(row.socialLinks, undefined),
    createdAt: toIsoRequired(row.createdAt),
    updatedAt: toIsoRequired(row.updatedAt),
  };
}

export function mapCategory(row: CategoryRow): BlogCategory {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? undefined,
    color: row.color ?? undefined,
    parentId: row.parentId ?? undefined,
    sortOrder: row.sortOrder,
    createdAt: toIsoRequired(row.createdAt),
    updatedAt: toIsoRequired(row.updatedAt),
  };
}

export function mapTag(row: TagRow): BlogTag {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? undefined,
    color: row.color ?? undefined,
    usageCount: row.usageCount,
    createdAt: toIsoRequired(row.createdAt),
  };
}

export function mapMedia(row: MediaRow): BlogMedia {
  return {
    id: row.id,
    filename: row.filename,
    originalName: row.originalName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    width: row.width ?? undefined,
    height: row.height ?? undefined,
    durationSeconds: row.durationSeconds ?? undefined,
    url: row.url,
    thumbnailUrl: row.thumbnailUrl ?? undefined,
    altText: row.altText ?? undefined,
    caption: row.caption ?? undefined,
    type: row.type as BlogMedia['type'],
    uploadedBy: row.uploadedBy,
    createdAt: toIsoRequired(row.createdAt),
  };
}

export function mapPost(
  row: PostRow & { categories: CategoryRow[]; tags: TagRow[] },
): BlogPost {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt ?? undefined,
    content: parseJson<AnyBlogBlock[]>(row.content, []),
    status: row.status as BlogPost['status'],
    featuredImageId: row.featuredImageId ?? undefined,
    authorId: row.authorId,
    categoryIds: row.categories.map((category) => category.id),
    tagIds: row.tags.map((tag) => tag.id),
    seoTitle: row.seoTitle ?? undefined,
    seoDescription: row.seoDescription ?? undefined,
    seoKeywords: parseJson<string[] | undefined>(row.seoKeywords, undefined),
    scheduledAt: toIso(row.scheduledAt),
    publishedAt: toIso(row.publishedAt),
    publishedBy: row.publishedBy ?? undefined,
    readingTimeMinutes: row.readingTimeMinutes,
    viewCount: row.viewCount,
    likeCount: row.likeCount,
    commentCount: row.commentCount,
    isFeatured: row.isFeatured,
    allowComments: row.allowComments,
    createdAt: toIsoRequired(row.createdAt),
    updatedAt: toIsoRequired(row.updatedAt),
    version: row.version,

    // Traductions
    titreEn: row.titreEn ?? undefined,
    titreKo: row.titreKo ?? undefined,
    extraitEn: row.extraitEn ?? undefined,
    extraitKo: row.extraitKo ?? undefined,
    contenuHtmlEn: row.contenuHtmlEn ?? undefined,
    contenuHtmlKo: row.contenuHtmlKo ?? undefined,
  };
}

export function mapSettings(row: SettingsRow): BlogSettings {
  return {
    postsPerPage: row.postsPerPage,
    allowComments: row.allowComments,
    commentModeration: row.commentModeration,
    autoCloseCommentsDays: row.autoCloseCommentsDays,
    defaultAuthorId: row.defaultAuthorId,
    defaultCategoryId: row.defaultCategoryId,
    rssEnabled: row.rssEnabled,
    rssItemsCount: row.rssItemsCount,
    jsonLdEnabled: row.jsonLdEnabled,
    socialShareEnabled: row.socialShareEnabled,
    readingTimeEnabled: row.readingTimeEnabled,
    relatedPostsEnabled: row.relatedPostsEnabled,
    relatedPostsCount: row.relatedPostsCount,
  };
}

export function mapCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    fullName: row.fullName,
    phone: row.phone,
    email: row.email ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: toIsoRequired(row.createdAt),
  };
}

export function mapAddress(row: AddressRow): Address {
  return {
    id: row.id,
    customerId: row.customerId,
    city: row.city,
    district: row.district ?? undefined,
    details: row.details ?? undefined,
    deliveryInstructions: row.deliveryInstructions ?? undefined,
  };
}

function mapOrderLine(row: OrderLineRow): OrderLine {
  return {
    id: row.id,
    packId: row.productPackId ?? row.productId ?? row.id,
    packNameSnapshot: row.packNameSnapshot,
    packContentSnapshot: parseJson(row.packContentSnapshot, []),
    quantity: row.quantity,
    unitPrice: { amount: row.unitPriceAmount, currency: 'XOF' },
    lineTotal: { amount: row.lineTotalAmount, currency: 'XOF' },
  };
}

export type MappedOrder = Order & { customerName?: string };

export function mapOrder(
  row: OrderRow & { lines: OrderLineRow[]; customer?: CustomerRow | null },
): MappedOrder {
  return {
    id: row.id,
    orderNumber: row.orderNumber,
    customerId: row.customerId,
    deliveryAddressId: row.deliveryAddressId,
    channel: row.channel as SalesChannel,
    status: row.status as OrderStatus,
    paymentStatus: row.paymentStatus as PaymentStatus,
    lines: row.lines.map(mapOrderLine),
    subtotal: { amount: row.subtotalAmount, currency: 'XOF' },
    deliveryFee: { amount: row.deliveryFeeAmount, currency: 'XOF' },
    total: { amount: row.totalAmount, currency: 'XOF' },
    createdAt: toIsoRequired(row.createdAt),
    confirmedAt: toIso(row.confirmedAt),
    preparedAt: toIso(row.preparedAt),
    deliveredAt: toIso(row.deliveredAt),
    cancelledAt: toIso(row.cancelledAt),
    notes: row.notes ?? undefined,
    customerName: row.customer?.fullName,
  };
}

export type PublicOrderSummary = {
  orderNumber: string;
  createdAt: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fullName: string;
  phone: string;
  totalPacks: number;
  totalArticles: number;
  notes: string | null;
};

export function mapPublicOrder(
  row: OrderRow & { lines: OrderLineRow[]; customer: CustomerRow },
): PublicOrderSummary {
  return {
    orderNumber: row.orderNumber,
    createdAt: toIsoRequired(row.createdAt),
    status: row.status as OrderStatus,
    paymentStatus: row.paymentStatus as PaymentStatus,
    fullName: row.customer.fullName,
    phone: row.customer.phone,
    totalPacks: row.lines.reduce((sum, line) => sum + line.quantity, 0),
    totalArticles: row.lines.reduce((sum, line) => sum + line.packQuantity * line.quantity, 0),
    notes: row.notes,
  };
}
