import { Prisma, type BlogMedia as MediaRow } from '@prisma/client';
import { prisma } from '@/lib/db';
import { mapAuthor, mapCategory, mapMedia, mapPost, mapSettings, mapTag } from '@/lib/data/mappers';
import type { ArticleInput } from '@/lib/blog/articleInput';
import { BlogInputError, BlogNotFoundError } from '@/lib/blog/errors';
import { removeStoredImage, type StoredImage } from '@/lib/blog/mediaStorage';
import type { QuickStatus } from '@/lib/blog/status';
import type {
  AdminArticleSummary,
  ArticleEditorData,
  ArticleTaxonomies,
  MediaSummary,
  PublicArticle,
  PublicArticleSummary,
  TaxonomyOption,
} from '@/lib/blog/types';
import { toIso } from '@/lib/dates';
import {
  type AnyBlogBlock,
  type BlogAuthor,
  type BlogCategory,
  type BlogMedia,
  type BlogPostStatus,
  type BlogSettings,
  type BlogTag,
  type EntityId,
  calculateReadingTime,
  generateSlug,
} from '@/lib/ricewareModels';

const DEFAULT_AUTHOR = {
  slug: 'riceware-ci',
  name: 'RiceWare CI',
  bio: 'Équipe éditoriale RiceWare CI.',
};

/* -------------------------------------------------------------------------- */
/* Règles de publication                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Un article est visible sur le site s’il est publié, ou programmé et que sa
 * date est passée : aucune tâche planifiée n’est nécessaire.
 */
function publicPostWhere(now: Date): Prisma.BlogPostWhereInput {
  return {
    OR: [
      { status: 'published' },
      { status: 'scheduled', scheduledAt: { lte: now } },
    ],
  };
}

function isPostPublic(post: { status: string; scheduledAt: Date | null }, now = new Date()): boolean {
  return post.status === 'published' || (post.status === 'scheduled' && !!post.scheduledAt && post.scheduledAt <= now);
}

type PublicationState = { publishedAt: Date | null; publishedBy: string | null };

function resolvePublication(
  status: BlogPostStatus,
  scheduledAt: Date | null,
  existing: PublicationState | null,
  now: Date,
): PublicationState & { scheduledAt: Date | null } {
  const pastPublishedAt = existing?.publishedAt && existing.publishedAt <= now ? existing.publishedAt : null;

  if (status === 'published') {
    return { publishedAt: pastPublishedAt ?? now, publishedBy: 'admin', scheduledAt: null };
  }
  if (status === 'scheduled') {
    return { publishedAt: scheduledAt, publishedBy: 'admin', scheduledAt };
  }
  // Brouillon, relecture ou archive : on conserve la date d’une publication passée.
  return {
    publishedAt: pastPublishedAt,
    publishedBy: pastPublishedAt ? existing?.publishedBy ?? 'admin' : null,
    scheduledAt: null,
  };
}

/* -------------------------------------------------------------------------- */
/* Utilitaires                                                                 */
/* -------------------------------------------------------------------------- */

function toMediaSummary(row: Pick<MediaRow, 'id' | 'url' | 'altText'>): MediaSummary {
  return { id: row.id, url: row.url, altText: row.altText ?? undefined };
}

function collectImageMediaIds(blocks: AnyBlogBlock[]): string[] {
  return [...new Set(blocks.flatMap((block) => (block.type === 'image' || block.type === 'video' ? [block.content.mediaId] : [])))];
}

async function loadMediaMap(blocks: AnyBlogBlock[]): Promise<Record<string, MediaSummary>> {
  const ids = collectImageMediaIds(blocks);
  if (!ids.length) return {};
  const rows = await prisma.blogMedia.findMany({ where: { id: { in: ids } } });
  return Object.fromEntries(rows.map((row) => [row.id, toMediaSummary(row)]));
}

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  const slug = generateSlug(base) || `article-${Date.now()}`;
  let attempt = slug;
  let suffix = 2;

  while (
    await prisma.blogPost.findFirst({
      where: { slug: attempt, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      select: { id: true },
    })
  ) {
    attempt = `${slug}-${suffix}`;
    suffix += 1;
  }
  return attempt;
}

/** Vérifie que l’auteur, les taxonomies et les médias référencés existent. */
async function assertRelationsExist(input: ArticleInput): Promise<void> {
  const mediaIds = [...new Set([...collectImageMediaIds(input.content), ...(input.featuredImageId ? [input.featuredImageId] : [])])];

  const [author, categoryCount, tagCount, mediaCount] = await Promise.all([
    prisma.blogAuthor.findUnique({ where: { id: input.authorId }, select: { id: true } }),
    prisma.blogCategory.count({ where: { id: { in: input.categoryIds } } }),
    prisma.blogTag.count({ where: { id: { in: input.tagIds } } }),
    prisma.blogMedia.count({ where: { id: { in: mediaIds } } }),
  ]);

  const issues: string[] = [];
  if (!author) issues.push('Auteur introuvable.');
  if (categoryCount !== input.categoryIds.length) issues.push('Une catégorie sélectionnée n’existe plus.');
  if (tagCount !== input.tagIds.length) issues.push('Une étiquette sélectionnée n’existe plus.');
  if (mediaCount !== mediaIds.length) issues.push('Une image de l’article est introuvable : importez-la à nouveau.');
  if (issues.length) throw new BlogInputError(issues);
}

function buildPostFields(input: ArticleInput) {
  return {
    title: input.title,
    excerpt: input.excerpt,
    content: input.content as unknown as Prisma.InputJsonValue,
    status: input.status,
    featuredImageId: input.featuredImageId,
    authorId: input.authorId,
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
    isFeatured: input.isFeatured,
    readingTimeMinutes: calculateReadingTime(input.content),
  };
}

/** Recalcule le compteur d’utilisation des étiquettes concernées. */
async function refreshTagUsage(tagIds: string[]): Promise<void> {
  await Promise.all(
    [...new Set(tagIds)].map(async (id) => {
      const usageCount = await prisma.blogPost.count({ where: { tags: { some: { id } } } });
      await prisma.blogTag.updateMany({ where: { id }, data: { usageCount } });
    }),
  );
}

/* -------------------------------------------------------------------------- */
/* Articles – administration                                                   */
/* -------------------------------------------------------------------------- */

export async function listAdminPosts(): Promise<AdminArticleSummary[]> {
  const rows = await prisma.blogPost.findMany({
    include: { author: true, categories: true },
    orderBy: { updatedAt: 'desc' },
  });
  const now = new Date();

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    status: row.status as BlogPostStatus,
    isPublic: isPostPublic(row, now),
    authorName: row.author.name,
    categoryNames: row.categories.map((category) => category.name),
    updatedAt: row.updatedAt.toISOString(),
    publishedAt: toIso(row.publishedAt),
    scheduledAt: toIso(row.scheduledAt),
  }));
}

export async function getArticleEditorData(id: EntityId): Promise<ArticleEditorData | null> {
  const row = await prisma.blogPost.findUnique({
    where: { id },
    include: { categories: true, tags: true, featuredImage: true },
  });
  if (!row) return null;

  const post = mapPost(row);
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt ?? '',
    status: post.status,
    scheduledAt: post.scheduledAt ?? '',
    featuredImage: row.featuredImage ? toMediaSummary(row.featuredImage) : null,
    authorId: post.authorId,
    categoryIds: post.categoryIds,
    tagIds: post.tagIds,
    seoTitle: post.seoTitle ?? '',
    seoDescription: post.seoDescription ?? '',
    isFeatured: post.isFeatured,
    content: post.content,
    media: await loadMediaMap(post.content),
    publicUrl: isPostPublic(row) ? `/blog/${row.slug}` : null,
  };
}

export async function createPost(input: ArticleInput): Promise<{ id: string; slug: string }> {
  await assertRelationsExist(input);

  const row = await prisma.blogPost.create({
    data: {
      ...buildPostFields(input),
      ...resolvePublication(input.status, input.scheduledAt, null, new Date()),
      slug: await uniqueSlug(input.slug || input.title),
      seoKeywords: [],
      categories: { connect: input.categoryIds.map((id) => ({ id })) },
      tags: { connect: input.tagIds.map((id) => ({ id })) },
    },
    select: { id: true, slug: true },
  });

  await refreshTagUsage(input.tagIds);
  return row;
}

export async function updatePost(id: EntityId, input: ArticleInput): Promise<{ id: string; slug: string }> {
  const existing = await prisma.blogPost.findUnique({
    where: { id },
    select: { slug: true, publishedAt: true, publishedBy: true, tags: { select: { id: true } } },
  });
  if (!existing) throw new BlogNotFoundError();

  await assertRelationsExist(input);

  const slug = input.slug && input.slug !== existing.slug ? await uniqueSlug(input.slug, id) : existing.slug;

  const row = await prisma.blogPost.update({
    where: { id },
    data: {
      ...buildPostFields(input),
      ...resolvePublication(input.status, input.scheduledAt, existing, new Date()),
      slug,
      version: { increment: 1 },
      categories: { set: input.categoryIds.map((categoryId) => ({ id: categoryId })) },
      tags: { set: input.tagIds.map((tagId) => ({ id: tagId })) },
    },
    select: { id: true, slug: true },
  });

  await refreshTagUsage([...existing.tags.map((tag) => tag.id), ...input.tagIds]);
  return row;
}

/** Action rapide depuis la liste : publier, repasser en brouillon ou archiver. */
export async function updatePostStatus(id: EntityId, status: QuickStatus): Promise<{ id: string; slug: string }> {
  const existing = await prisma.blogPost.findUnique({
    where: { id },
    select: { content: true, publishedAt: true, publishedBy: true },
  });
  if (!existing) throw new BlogNotFoundError();

  const content = Array.isArray(existing.content) ? existing.content : [];
  if (status === 'published' && content.length === 0) {
    throw new BlogInputError(['Ajoutez du contenu avant de publier.']);
  }

  return prisma.blogPost.update({
    where: { id },
    data: { status, ...resolvePublication(status, null, existing, new Date()) },
    select: { id: true, slug: true },
  });
}

export async function deletePost(id: EntityId): Promise<{ slug: string }> {
  const existing = await prisma.blogPost.findUnique({
    where: { id },
    select: { slug: true, tags: { select: { id: true } } },
  });
  if (!existing) throw new BlogNotFoundError();

  await prisma.blogPost.delete({ where: { id } });
  await refreshTagUsage(existing.tags.map((tag) => tag.id));
  return { slug: existing.slug };
}

/* -------------------------------------------------------------------------- */
/* Articles – site public                                                      */
/* -------------------------------------------------------------------------- */

const publicPostInclude = {
  author: true,
  categories: true,
  featuredImage: true,
} satisfies Prisma.BlogPostInclude;

type PublicPostRow = Prisma.BlogPostGetPayload<{ include: typeof publicPostInclude }>;

function toPublicSummary(row: PublicPostRow): PublicArticleSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt ?? undefined,
    publishedAt: (row.publishedAt ?? row.scheduledAt ?? row.createdAt).toISOString(),
    readingTimeMinutes: row.readingTimeMinutes,
    authorName: row.author.name,
    categoryNames: row.categories.map((category) => category.name),
    coverImage: row.featuredImage ? toMediaSummary(row.featuredImage) : null,
    isFeatured: row.isFeatured,
  };
}

export async function listPublicPosts(): Promise<PublicArticleSummary[]> {
  try {
    const rows = await prisma.blogPost.findMany({
      where: publicPostWhere(new Date()),
      include: publicPostInclude,
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map(toPublicSummary);
  } catch (error) {
    console.error('Chargement des articles publics impossible :', error);
    return [];
  }
}

export async function getPublicPost(slug: string): Promise<PublicArticle | null> {
  try {
    const row = await prisma.blogPost.findFirst({
      where: { AND: [{ slug }, publicPostWhere(new Date())] },
      include: { ...publicPostInclude, tags: true },
    });
    if (!row) return null;

    const post = mapPost(row);
    return {
      ...toPublicSummary(row),
      content: post.content,
      media: await loadMediaMap(post.content),
      seoTitle: post.seoTitle,
      seoDescription: post.seoDescription,
    };
  } catch (error) {
    console.error(`Chargement de l’article public "${slug}" impossible :`, error);
    return null;
  }
}

export async function incrementPostViews(slug: string): Promise<void> {
  await prisma.blogPost.updateMany({
    where: { AND: [{ slug }, publicPostWhere(new Date())] },
    data: { viewCount: { increment: 1 } },
  }).catch((error) => {
    console.error(`Incrément de vue impossible pour "${slug}" :`, error);
  });
}

/* -------------------------------------------------------------------------- */
/* Taxonomies                                                                  */
/* -------------------------------------------------------------------------- */

export async function ensureDefaultAuthor(): Promise<BlogAuthor> {
  const row = await prisma.blogAuthor.upsert({
    where: { slug: DEFAULT_AUTHOR.slug },
    update: {},
    create: DEFAULT_AUTHOR,
  });
  return mapAuthor(row);
}

export async function getArticleTaxonomies(): Promise<ArticleTaxonomies> {
  if ((await prisma.blogAuthor.count()) === 0) await ensureDefaultAuthor();

  const select = { id: true, name: true } as const;
  const [authors, categories, tags] = await Promise.all([
    prisma.blogAuthor.findMany({ select, orderBy: { name: 'asc' } }),
    prisma.blogCategory.findMany({ select, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
    prisma.blogTag.findMany({ select, orderBy: { name: 'asc' } }),
  ]);
  return { authors, categories, tags };
}

function parseTaxonomyName(name: unknown): { name: string; slug: string } {
  const cleanName = typeof name === 'string' ? name.trim().slice(0, 60) : '';
  const slug = generateSlug(cleanName);
  if (!cleanName || !slug) throw new BlogInputError(['Indiquez un nom contenant au moins une lettre ou un chiffre.']);
  return { name: cleanName, slug };
}

/** Crée la catégorie, ou renvoie celle qui porte déjà ce slug. */
export async function findOrCreateCategory(name: unknown): Promise<TaxonomyOption> {
  const data = parseTaxonomyName(name);
  return prisma.blogCategory.upsert({
    where: { slug: data.slug },
    update: {},
    create: data,
    select: { id: true, name: true },
  });
}

/** Crée l’étiquette, ou renvoie celle qui porte déjà ce slug. */
export async function findOrCreateTag(name: unknown): Promise<TaxonomyOption> {
  const data = parseTaxonomyName(name);
  return prisma.blogTag.upsert({
    where: { slug: data.slug },
    update: {},
    create: data,
    select: { id: true, name: true },
  });
}

export async function listCategories(): Promise<BlogCategory[]> {
  const rows = await prisma.blogCategory.findMany({ orderBy: { sortOrder: 'asc' } });
  return rows.map(mapCategory);
}

export async function listTags(): Promise<BlogTag[]> {
  const rows = await prisma.blogTag.findMany({ orderBy: { name: 'asc' } });
  return rows.map(mapTag);
}

export async function listAuthors(): Promise<BlogAuthor[]> {
  const rows = await prisma.blogAuthor.findMany({ orderBy: { name: 'asc' } });
  return rows.map(mapAuthor);
}

/* -------------------------------------------------------------------------- */
/* Médias                                                                      */
/* -------------------------------------------------------------------------- */

export async function createMediaRecord(
  image: StoredImage,
  details: { originalName: string; altText?: string },
): Promise<MediaSummary> {
  const row = await prisma.blogMedia.create({
    data: {
      filename: image.filename,
      originalName: details.originalName.slice(0, 200),
      mimeType: image.mimeType,
      sizeBytes: image.sizeBytes,
      url: image.url,
      thumbnailUrl: image.url,
      altText: details.altText?.slice(0, 200) || null,
      type: 'image',
      uploadedBy: 'admin',
    },
  });
  return toMediaSummary(row);
}

export async function listMedia(): Promise<BlogMedia[]> {
  const rows = await prisma.blogMedia.findMany({ orderBy: { createdAt: 'desc' } });
  return rows.map(mapMedia);
}

export async function deleteMediaRecord(id: EntityId): Promise<void> {
  const existing = await prisma.blogMedia.findUnique({ where: { id } });
  if (!existing) throw new BlogNotFoundError('Média introuvable.');
  await prisma.blogMedia.delete({ where: { id } });
  await removeStoredImage(existing.filename);
}

/* -------------------------------------------------------------------------- */
/* Réglages                                                                    */
/* -------------------------------------------------------------------------- */

export async function getSettingsRecord(): Promise<BlogSettings> {
  const row = await prisma.blogSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: { id: 'default' },
  });
  return mapSettings(row);
}

export async function updateSettingsRecord(data: Partial<BlogSettings>): Promise<BlogSettings> {
  const current = await getSettingsRecord();
  const row = await prisma.blogSettings.update({
    where: { id: 'default' },
    data: { ...current, ...data, id: 'default' },
  });
  return mapSettings(row);
}
