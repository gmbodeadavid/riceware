'use client';

import { useEffect, useMemo, useState } from 'react';
import { EDITOR_STATUSES, BLOG_STATUS_LABELS, BLOG_STATUS_HINTS } from '@/lib/blog/status';
import type { ArticleFormValues, ArticleTaxonomies } from '@/lib/blog/types';
import type { AnyBlogBlock, BlogPostStatus } from '@/lib/ricewareModels';

type EditorPayload = ArticleFormValues & { featuredImageId: string | null };

type ArticleEditorProps = {
  initialData?: Partial<ArticleFormValues>;
  onSubmit: (data: EditorPayload) => Promise<void>;
  isSubmitting: boolean;
  submitLabel: string;
};

const emptyTaxonomies: ArticleTaxonomies = {
  authors: [],
  categories: [],
  tags: [],
};

function blocksToText(blocks: AnyBlogBlock[] | undefined) {
  return (blocks ?? [])
    .map((block) => {
      if (block.type === 'heading' || block.type === 'paragraph' || block.type === 'quote') {
        return 'text' in block.content ? block.content.text : '';
      }
      if (block.type === 'divider') {
        return '---';
      }
      return '';
    })
    .filter(Boolean)
    .join('\n\n');
}

function textToBlocks(value: string): AnyBlogBlock[] {
  return value
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((text, index): AnyBlogBlock => {
      if (text === '---') {
        return {
          id: crypto.randomUUID(),
          type: 'divider' as const,
          order: index,
          content: { style: 'solid' },
        };
      }

      if (text.startsWith('## ')) {
        return {
          id: crypto.randomUUID(),
          type: 'heading' as const,
          order: index,
          content: { level: 2 as const, text: text.slice(3).trim() },
        };
      }

      return {
        id: crypto.randomUUID(),
        type: 'paragraph' as const,
        order: index,
        content: { text },
      };
    });
}

export default function ArticleEditor({ initialData, onSubmit, isSubmitting, submitLabel }: ArticleEditorProps) {
  const [taxonomies, setTaxonomies] = useState<ArticleTaxonomies>(emptyTaxonomies);
  const [taxonomyError, setTaxonomyError] = useState('');
  const [form, setForm] = useState({
    title: initialData?.title ?? '',
    slug: initialData?.slug ?? '',
    excerpt: initialData?.excerpt ?? '',
    status: initialData?.status ?? 'draft',
    scheduledAt: initialData?.scheduledAt ?? '',
    authorId: initialData?.authorId ?? '',
    categoryIds: initialData?.categoryIds ?? [],
    tagIds: initialData?.tagIds ?? [],
    seoTitle: initialData?.seoTitle ?? '',
    seoDescription: initialData?.seoDescription ?? '',
    isFeatured: initialData?.isFeatured ?? false,
    contentText: blocksToText(initialData?.content),
  });

  useEffect(() => {
    let cancelled = false;

    async function loadTaxonomies() {
      try {
        const response = await fetch('/api/admin/taxonomies');
        if (!response.ok) {
          throw new Error('Chargement impossible.');
        }
        const data = await response.json() as ArticleTaxonomies;
        if (!cancelled) {
          setTaxonomies(data);
          setForm((current) => ({
            ...current,
            authorId: current.authorId || data.authors[0]?.id || '',
          }));
        }
      } catch {
        if (!cancelled) {
          setTaxonomyError('Impossible de charger les auteurs, catégories et étiquettes.');
        }
      }
    }

    loadTaxonomies();
    return () => {
      cancelled = true;
    };
  }, []);

  const contentBlocks = useMemo(() => textToBlocks(form.contentText), [form.contentText]);

  function updateField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleId(key: 'categoryIds' | 'tagIds', id: string) {
    setForm((current) => ({
      ...current,
      [key]: current[key].includes(id)
        ? current[key].filter((item) => item !== id)
        : [...current[key], id],
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit({
      title: form.title,
      slug: form.slug,
      excerpt: form.excerpt,
      status: form.status as BlogPostStatus,
      scheduledAt: form.scheduledAt,
      featuredImage: initialData?.featuredImage ?? null,
      featuredImageId: initialData?.featuredImage?.id ?? null,
      authorId: form.authorId,
      categoryIds: form.categoryIds,
      tagIds: form.tagIds,
      seoTitle: form.seoTitle,
      seoDescription: form.seoDescription,
      isFeatured: form.isFeatured,
      content: contentBlocks,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      {taxonomyError ? (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{taxonomyError}</div>
      ) : null}

      <div className="grid gap-4 rounded-lg border border-line bg-surface p-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-semibold text-ink sm:col-span-2">
          Titre
          <input
            value={form.title}
            onChange={(event) => updateField('title', event.target.value)}
            required
            className="rounded border border-line bg-ground px-3 py-2 text-sm font-normal outline-none focus:border-paddy"
          />
        </label>

        <label className="grid gap-1 text-sm font-semibold text-ink">
          Slug
          <input
            value={form.slug}
            onChange={(event) => updateField('slug', event.target.value)}
            placeholder="automatique si vide"
            className="rounded border border-line bg-ground px-3 py-2 text-sm font-normal outline-none focus:border-paddy"
          />
        </label>

        <label className="grid gap-1 text-sm font-semibold text-ink">
          Statut
          <select
            value={form.status}
            onChange={(event) => updateField('status', event.target.value as BlogPostStatus)}
            className="rounded border border-line bg-ground px-3 py-2 text-sm font-normal outline-none focus:border-paddy"
          >
            {EDITOR_STATUSES.map((status) => (
              <option key={status} value={status}>{BLOG_STATUS_LABELS[status]}</option>
            ))}
          </select>
          <span className="text-xs font-normal text-ink-muted">{BLOG_STATUS_HINTS[form.status as BlogPostStatus]}</span>
        </label>

        {form.status === 'scheduled' ? (
          <label className="grid gap-1 text-sm font-semibold text-ink">
            Publication programmée
            <input
              type="datetime-local"
              value={form.scheduledAt}
              onChange={(event) => updateField('scheduledAt', event.target.value)}
              className="rounded border border-line bg-ground px-3 py-2 text-sm font-normal outline-none focus:border-paddy"
            />
          </label>
        ) : null}

        <label className="grid gap-1 text-sm font-semibold text-ink">
          Auteur
          <select
            value={form.authorId}
            onChange={(event) => updateField('authorId', event.target.value)}
            required
            className="rounded border border-line bg-ground px-3 py-2 text-sm font-normal outline-none focus:border-paddy"
          >
            <option value="">Choisir un auteur</option>
            {taxonomies.authors.map((author) => (
              <option key={author.id} value={author.id}>{author.name}</option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm font-semibold text-ink">
          <input
            type="checkbox"
            checked={form.isFeatured}
            onChange={(event) => updateField('isFeatured', event.target.checked)}
            className="size-4 accent-paddy"
          />
          Article à la une
        </label>
      </div>

      <label className="grid gap-1 text-sm font-semibold text-ink">
        Extrait
        <textarea
          value={form.excerpt}
          onChange={(event) => updateField('excerpt', event.target.value)}
          rows={3}
          className="rounded border border-line bg-ground px-3 py-2 text-sm font-normal outline-none focus:border-paddy"
        />
      </label>

      <label className="grid gap-1 text-sm font-semibold text-ink">
        Contenu
        <textarea
          value={form.contentText}
          onChange={(event) => updateField('contentText', event.target.value)}
          rows={12}
          placeholder="Séparez les blocs par une ligne vide. Utilisez ## pour un titre."
          className="rounded border border-line bg-ground px-3 py-2 text-sm font-normal leading-6 outline-none focus:border-paddy"
        />
      </label>

      <div className="grid gap-4 rounded-lg border border-line bg-surface p-4 sm:grid-cols-2">
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-ink">Catégories</legend>
          <div className="grid gap-2">
            {taxonomies.categories.map((category) => (
              <label key={category.id} className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={form.categoryIds.includes(category.id)}
                  onChange={() => toggleId('categoryIds', category.id)}
                  className="size-4 accent-paddy"
                />
                {category.name}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-ink">Étiquettes</legend>
          <div className="grid gap-2">
            {taxonomies.tags.map((tag) => (
              <label key={tag.id} className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={form.tagIds.includes(tag.id)}
                  onChange={() => toggleId('tagIds', tag.id)}
                  className="size-4 accent-paddy"
                />
                {tag.name}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="grid gap-4 rounded-lg border border-line bg-surface p-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-semibold text-ink">
          Titre SEO
          <input
            value={form.seoTitle}
            onChange={(event) => updateField('seoTitle', event.target.value)}
            className="rounded border border-line bg-ground px-3 py-2 text-sm font-normal outline-none focus:border-paddy"
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-ink">
          Description SEO
          <input
            value={form.seoDescription}
            onChange={(event) => updateField('seoDescription', event.target.value)}
            className="rounded border border-line bg-ground px-3 py-2 text-sm font-normal outline-none focus:border-paddy"
          />
        </label>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-full bg-paddy px-5 py-3 text-sm font-semibold text-white transition hover:bg-paddy-deep disabled:opacity-60"
        >
          {isSubmitting ? 'Enregistrement...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
