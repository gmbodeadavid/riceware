import type { BlogPostStatus } from '@/lib/ricewareModels';

export const BLOG_POST_STATUSES: readonly BlogPostStatus[] = ['draft', 'review', 'scheduled', 'published', 'archived'];

/** Statuts proposés dans l’éditeur (un seul administrateur : pas d’étape de relecture). */
export const EDITOR_STATUSES: readonly BlogPostStatus[] = ['draft', 'published', 'scheduled', 'archived'];

/** Statuts accessibles depuis les actions rapides de la liste. */
export const QUICK_STATUSES = ['draft', 'published', 'archived'] as const;
export type QuickStatus = (typeof QUICK_STATUSES)[number];

export const BLOG_STATUS_LABELS: Record<BlogPostStatus, string> = {
  draft: 'Brouillon',
  review: 'À relire',
  scheduled: 'Programmé',
  published: 'Publié',
  archived: 'Archivé',
};

export const BLOG_STATUS_HINTS: Record<BlogPostStatus, string> = {
  draft: 'Invisible sur le site.',
  review: 'Invisible sur le site.',
  scheduled: 'Visible automatiquement à la date choisie.',
  published: 'Visible immédiatement sur /blog.',
  archived: 'Retiré du site, conservé dans l’admin.',
};

export function isBlogPostStatus(value: unknown): value is BlogPostStatus {
  return typeof value === 'string' && (BLOG_POST_STATUSES as readonly string[]).includes(value);
}

export function isQuickStatus(value: unknown): value is QuickStatus {
  return typeof value === 'string' && (QUICK_STATUSES as readonly string[]).includes(value);
}
