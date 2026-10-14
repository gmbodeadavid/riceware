/** Limites partagées par l’éditeur (client) et la validation (serveur). */
export const ARTICLE_LIMITS = {
  title: 160,
  slug: 120,
  excerpt: 400,
  seoTitle: 70,
  seoDescription: 170,
  blockText: 20_000,
  shortText: 300,
  blocks: 200,
  taxonomies: 20,
} as const;

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
