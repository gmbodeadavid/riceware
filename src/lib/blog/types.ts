import type { AnyBlogBlock, BlogPostStatus } from '@/lib/ricewareModels';

/** Types partagés entre le serveur et les composants clients du blog. */

export type MediaSummary = {
  id: string;
  url: string;
  altText?: string;
  mimeType?: string;
};

export type TaxonomyOption = {
  id: string;
  name: string;
};

export type ArticleTaxonomies = {
  authors: TaxonomyOption[];
  categories: TaxonomyOption[];
  tags: TaxonomyOption[];
};

export type ArticleFormValues = {
  title: string;
  slug: string;
  excerpt: string;
  status: BlogPostStatus;
  /** Date ISO, vide si l’article n’est pas programmé. */
  scheduledAt: string;
  featuredImage: MediaSummary | null;
  authorId: string;
  categoryIds: string[];
  tagIds: string[];
  seoTitle: string;
  seoDescription: string;
  isFeatured: boolean;
  content: AnyBlogBlock[];
};

export type ArticleEditorData = ArticleFormValues & {
  id: string;
  publicUrl: string | null;
  /** Médias référencés par les blocs image, indexés par identifiant. */
  media: Record<string, MediaSummary>;
};

export type AdminArticleSummary = {
  id: string;
  slug: string;
  title: string;
  status: BlogPostStatus;
  isPublic: boolean;
  authorName: string;
  categoryNames: string[];
  updatedAt: string;
  publishedAt?: string;
  scheduledAt?: string;
};

export type PublicArticleSummary = {
  id: string;
  slug: string;
  title: string;
  excerpt?: string;
  publishedAt: string;
  readingTimeMinutes: number;
  authorName: string;
  categoryNames: string[];
  coverImage: MediaSummary | null;
  isFeatured: boolean;
};

export type PublicArticle = PublicArticleSummary & {
  content: AnyBlogBlock[];
  media: Record<string, MediaSummary>;
  seoTitle?: string;
  seoDescription?: string;
};
