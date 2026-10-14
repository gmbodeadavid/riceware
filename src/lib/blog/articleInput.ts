import { BlogInputError } from '@/lib/blog/errors';
import { ARTICLE_LIMITS } from '@/lib/blog/limits';
import { isBlogPostStatus } from '@/lib/blog/status';
import {
  type AnyBlogBlock,
  type BlogCalloutBlock,
  type BlogPostStatus,
  generateSlug,
  reorderBlocks,
} from '@/lib/ricewareModels';

/** Données d’article validées, prêtes à être enregistrées. */
export type ArticleInput = {
  title: string;
  slug?: string;
  excerpt: string | null;
  status: BlogPostStatus;
  scheduledAt: Date | null;
  featuredImageId: string | null;
  authorId: string;
  categoryIds: string[];
  tagIds: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  isFeatured: boolean;
  content: AnyBlogBlock[];
};

const CALLOUT_VARIANTS: readonly BlogCalloutBlock['content']['variant'][] = ['info', 'tip', 'success', 'warning', 'danger'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function optionalText(value: unknown, maxLength: number): string | null {
  return cleanText(value, maxLength) || null;
}

function cleanIdList(value: unknown, label: string, issues: string[]): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.some((id) => typeof id !== 'string')) {
    issues.push(`${label} : liste invalide.`);
    return [];
  }
  const ids = [...new Set(value as string[])].filter(Boolean);
  if (ids.length > ARTICLE_LIMITS.taxonomies) {
    issues.push(`${label} : ${ARTICLE_LIMITS.taxonomies} au maximum.`);
  }
  return ids.slice(0, ARTICLE_LIMITS.taxonomies);
}

function sanitizeBlock(raw: unknown): AnyBlogBlock | null {
  if (!isRecord(raw)) return null;

  const id = typeof raw.id === 'string' && raw.id ? raw.id.slice(0, 64) : crypto.randomUUID();
  const content = isRecord(raw.content) ? raw.content : {};

  switch (raw.type) {
    case 'paragraph': {
      const text = cleanText(content.text, ARTICLE_LIMITS.blockText);
      return text ? { id, type: 'paragraph', order: 0, content: { text } } : null;
    }
    case 'heading': {
      const text = cleanText(content.text, ARTICLE_LIMITS.shortText);
      const level = content.level === 3 ? 3 : 2;
      return text ? { id, type: 'heading', order: 0, content: { level, text } } : null;
    }
    case 'quote': {
      const text = cleanText(content.text, ARTICLE_LIMITS.blockText);
      const author = cleanText(content.author, ARTICLE_LIMITS.shortText) || undefined;
      return text ? { id, type: 'quote', order: 0, content: { text, author } } : null;
    }
    case 'callout': {
      const text = cleanText(content.text, ARTICLE_LIMITS.blockText);
      const variant = CALLOUT_VARIANTS.find((item) => item === content.variant) ?? 'info';
      const title = cleanText(content.title, ARTICLE_LIMITS.shortText) || undefined;
      return text ? { id, type: 'callout', order: 0, content: { variant, title, text } } : null;
    }
    case 'image': {
      const mediaId = cleanText(content.mediaId, 64);
      const caption = cleanText(content.caption, ARTICLE_LIMITS.shortText) || undefined;
      return mediaId ? { id, type: 'image', order: 0, content: { mediaId, caption } } : null;
    }
    case 'divider':
      return { id, type: 'divider', order: 0, content: {} };
    default:
      return null;
  }
}

function parseScheduledAt(value: unknown): Date | null {
  if (typeof value !== 'string' || !value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Valide et normalise le corps JSON envoyé par l’éditeur.
 * Lève une `BlogInputError` listant tous les problèmes détectés.
 */
export function parseArticleInput(body: unknown, now = new Date()): ArticleInput {
  if (!isRecord(body)) throw new BlogInputError(['Requête invalide.']);

  const issues: string[] = [];

  const title = cleanText(body.title, ARTICLE_LIMITS.title);
  if (!title) issues.push('Le titre est requis.');

  const status = isBlogPostStatus(body.status) ? body.status : null;
  if (!status) issues.push('Statut inconnu.');

  const authorId = cleanText(body.authorId, 64);
  if (!authorId) issues.push('Choisissez un auteur.');

  const slugSource = cleanText(body.slug, ARTICLE_LIMITS.slug);
  const slug = slugSource ? generateSlug(slugSource) : undefined;
  if (slugSource && !slug) issues.push('Le slug doit contenir au moins une lettre ou un chiffre.');

  const rawBlocks = Array.isArray(body.content) ? body.content : [];
  if (rawBlocks.length > ARTICLE_LIMITS.blocks) {
    issues.push(`Le contenu est limité à ${ARTICLE_LIMITS.blocks} blocs.`);
  }
  const content = reorderBlocks(
    rawBlocks
      .slice(0, ARTICLE_LIMITS.blocks)
      .map(sanitizeBlock)
      .filter((block): block is AnyBlogBlock => block !== null),
  );

  const scheduledAt = parseScheduledAt(body.scheduledAt);
  if (status === 'scheduled') {
    if (!scheduledAt) issues.push('Choisissez la date de publication programmée.');
    else if (scheduledAt <= now) issues.push('La date programmée doit être dans le futur.');
  }

  if ((status === 'published' || status === 'scheduled') && content.length === 0) {
    issues.push('Ajoutez du contenu avant de publier.');
  }

  const categoryIds = cleanIdList(body.categoryIds, 'Catégories', issues);
  const tagIds = cleanIdList(body.tagIds, 'Étiquettes', issues);

  if (issues.length || !status) throw new BlogInputError(issues);

  return {
    title,
    slug,
    excerpt: optionalText(body.excerpt, ARTICLE_LIMITS.excerpt),
    status,
    scheduledAt: status === 'scheduled' ? scheduledAt : null,
    featuredImageId: optionalText(body.featuredImageId, 64),
    authorId,
    categoryIds,
    tagIds,
    seoTitle: optionalText(body.seoTitle, ARTICLE_LIMITS.seoTitle),
    seoDescription: optionalText(body.seoDescription, ARTICLE_LIMITS.seoDescription),
    isFeatured: body.isFeatured === true,
    content,
  };
}
