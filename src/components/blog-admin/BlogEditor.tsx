'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { EDITOR_STATUSES, BLOG_STATUS_LABELS } from '@/lib/blog/status';
import type { ArticleFormValues, ArticleTaxonomies, MediaSummary } from '@/lib/blog/types';
import type { AnyBlogBlock } from '@/lib/ricewareModels';
import BlockEditor from '@/components/blog-admin/BlockEditor';
import BlockPreview from '@/components/blog-admin/BlockPreview';
import MediaLibrary from '@/components/blog-admin/MediaLibrary';

// ─── Types ────────────────────────────────────────────────────────────────────

export type EditorPayload = ArticleFormValues & { featuredImageId: string | null };

export type BlogEditorProps = {
  /** Données initiales lors de l'édition d'un article existant. */
  initialData?: Partial<ArticleFormValues & { id?: string; publicUrl?: string | null; media?: Record<string, MediaSummary> }>;
  onSubmit: (data: EditorPayload) => Promise<void>;
  isSubmitting: boolean;
  submitLabel: string;
};

const emptyTaxonomies: ArticleTaxonomies = { authors: [], categories: [], tags: [] };

// ─── Slug helper ─────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

// ─── BlogEditor ───────────────────────────────────────────────────────────────

export default function BlogEditor({ initialData, onSubmit, isSubmitting, submitLabel }: BlogEditorProps) {
  const [taxonomies, setTaxonomies] = useState<ArticleTaxonomies>(emptyTaxonomies);
  const [form, setForm] = useState<ArticleFormValues>({
    title: initialData?.title ?? '',
    slug: initialData?.slug ?? '',
    excerpt: initialData?.excerpt ?? '',
    status: initialData?.status ?? 'draft',
    scheduledAt: initialData?.scheduledAt ?? '',
    featuredImage: initialData?.featuredImage ?? null,
    authorId: initialData?.authorId ?? '',
    categoryIds: initialData?.categoryIds ?? [],
    tagIds: initialData?.tagIds ?? [],
    seoTitle: initialData?.seoTitle ?? '',
    seoDescription: initialData?.seoDescription ?? '',
    isFeatured: initialData?.isFeatured ?? false,
    content: initialData?.content ?? [],
  });

  // Media map: blockId → MediaSummary (for preview)
  const [mediaMap, setMediaMap] = useState<Record<string, MediaSummary>>(initialData?.media ?? {});

  const [slugManuallyEdited, setSlugManuallyEdited] = useState(!!initialData?.slug);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'content' | 'meta' | 'seo'>('content');
  const [showFeaturedMediaPicker, setShowFeaturedMediaPicker] = useState(false);

  // Load taxonomies
  useEffect(() => {
    let active = true;
    fetch('/api/blog-admin/taxonomies', { credentials: 'same-origin' })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => { if (active && data) setTaxonomies(data as ArticleTaxonomies); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  // Set default author once taxonomies load
  useEffect(() => {
    if (!form.authorId && taxonomies.authors.length > 0) {
      setForm((prev) => ({ ...prev, authorId: taxonomies.authors[0].id }));
    }
  }, [taxonomies.authors, form.authorId]);

  // Auto-generate slug from title
  const prevTitleRef = useRef(form.title);
  useEffect(() => {
    if (!slugManuallyEdited && form.title !== prevTitleRef.current) {
      prevTitleRef.current = form.title;
      setForm((prev) => ({ ...prev, slug: slugify(prev.title) }));
    }
  }, [form.title, slugManuallyEdited]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  function updateField<K extends keyof ArticleFormValues>(key: K, value: ArticleFormValues[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const handleBlocksChange = useCallback((blocks: AnyBlogBlock[]) => {
    setForm((prev) => ({ ...prev, content: blocks }));
  }, []);

  const handleMediaSelect = useCallback((blockId: string, selectedMedia: MediaSummary) => {
    // Update the block's mediaId
    setForm((prev) => ({
      ...prev,
      content: prev.content.map((block) =>
        block.id === blockId
          ? ({ ...block, content: { ...block.content, mediaId: selectedMedia.id } } as AnyBlogBlock)
          : block,
      ) as AnyBlogBlock[],
    }));
    // Add to media map for preview
    setMediaMap((prev) => ({ ...prev, [selectedMedia.id]: selectedMedia }));
  }, []);

  const handleFeaturedImageSelect = useCallback((media: MediaSummary) => {
    setForm((prev) => ({ ...prev, featuredImage: media }));
    setMediaMap((prev) => ({ ...prev, [media.id]: media }));
    setShowFeaturedMediaPicker(false);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await onSubmit({
        ...form,
        featuredImageId: form.featuredImage?.id ?? null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement.");
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="h-[calc(100vh-160px)] flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link
            href="/blog/admin/articles"
            className="inline-flex items-center gap-1.5 rounded-control bg-paddy px-4 py-2 text-sm font-semibold text-on-paddy transition-colors hover:bg-paddy-deep focus-visible:outline-2 focus-visible:outline-paddy focus-visible:outline-offset-2"
          >
            ← Articles
          </Link>
          {initialData?.id && initialData?.publicUrl && (
            <a
              href={initialData.publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-control border-2 border-husk px-4 py-2 text-sm font-semibold text-husk-text transition-colors hover:bg-husk-soft focus-visible:outline-2 focus-visible:outline-husk focus-visible:outline-offset-2"
            >
              Voir l'article ↗
            </a>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted sr-only" htmlFor="editor-status">Statut</label>
          <select
            id="editor-status"
            value={form.status}
            onChange={(e) => updateField('status', e.target.value as ArticleFormValues['status'])}
            className="rounded-control border border-line bg-ground px-3 py-2 text-sm font-semibold outline-none focus:border-paddy focus:ring-2 focus:ring-paddy/20 appearance-none cursor-pointer pr-7"
          >
            {EDITOR_STATUSES.map((s) => (
              <option key={s} value={s}>{BLOG_STATUS_LABELS[s]}</option>
            ))}
          </select>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="inline-flex items-center rounded-control bg-paddy px-5 py-2 text-sm font-semibold text-on-paddy hover:bg-paddy-deep disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Enregistrement…' : submitLabel}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Title (full width) */}
      <div className="mb-3">
        <label htmlFor="editor-title" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Titre de l'article
        </label>
        <input
          id="editor-title"
          type="text"
          value={form.title}
          onChange={(e) => updateField('title', e.target.value)}
          placeholder="Titre de l'article…"
          className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-xl font-bold text-ink placeholder:text-ink-muted/40 outline-none focus:border-paddy focus:ring-2 focus:ring-paddy/20 transition"
        />
      </div>

      {/* Split layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">

        {/* ── LEFT: Editor ─────────────────────────────────────────────────── */}
        <div className="flex flex-col min-h-0 overflow-hidden">
          {/* Tabs */}
          <div className="flex gap-1 border-b border-gray-200 mb-3">
            {(['content', 'meta', 'seo'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'content' ? 'Contenu' : tab === 'meta' ? 'Métadonnées' : 'SEO'}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto pr-1">
            {/* CONTENT TAB */}
            {activeTab === 'content' && (
              <BlockEditor
                blocks={form.content}
                onChange={handleBlocksChange}
                media={mediaMap}
                onMediaSelect={handleMediaSelect}
              />
            )}

            {/* META TAB */}
            {activeTab === 'meta' && (
              <div className="space-y-5">
                {/* Slug */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Slug URL
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">/blog/</span>
                    <input
                      type="text"
                      value={form.slug}
                      onChange={(e) => {
                        setSlugManuallyEdited(true);
                        updateField('slug', e.target.value);
                      }}
                      placeholder="mon-article"
                      className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition font-mono"
                    />
                    {slugManuallyEdited && (
                      <button
                        type="button"
                        onClick={() => {
                          setSlugManuallyEdited(false);
                          setForm((prev) => ({ ...prev, slug: slugify(prev.title) }));
                        }}
                        className="text-xs text-gray-400 hover:text-gray-600"
                      >
                        ↺ Auto
                      </button>
                    )}
                  </div>
                </div>

                {/* Excerpt */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Extrait <span className="font-normal text-gray-400">(résumé affiché dans la liste)</span>
                  </label>
                  <textarea
                    value={form.excerpt}
                    onChange={(e) => updateField('excerpt', e.target.value)}
                    placeholder="Un résumé accrocheur…"
                    rows={3}
                    maxLength={400}
                    className="w-full resize-y rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition"
                  />
                  <p className="text-right text-xs text-gray-400">{form.excerpt.length}/400</p>
                </div>

                {/* Scheduled at */}
                {form.status === 'scheduled' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date de publication programmée
                    </label>
                    <input
                      type="datetime-local"
                      value={form.scheduledAt}
                      onChange={(e) => updateField('scheduledAt', e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition"
                    />
                  </div>
                )}

                {/* Author */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Auteur</label>
                  <select
                    value={form.authorId}
                    onChange={(e) => updateField('authorId', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
                  >
                    {taxonomies.authors.length === 0 && (
                      <option value="">Chargement…</option>
                    )}
                    {taxonomies.authors.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>

                {/* Featured image */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Image à la une</label>
                  {form.featuredImage ? (
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={form.featuredImage.url}
                        alt={form.featuredImage.altText ?? ''}
                        className="h-16 w-24 object-cover rounded border border-gray-200"
                      />
                      <div className="space-y-1">
                        <button
                          type="button"
                          onClick={() => setShowFeaturedMediaPicker(true)}
                          className="text-xs text-emerald-600 hover:underline block"
                        >
                          Changer
                        </button>
                        <button
                          type="button"
                          onClick={() => updateField('featuredImage', null)}
                          className="text-xs text-red-500 hover:underline block"
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowFeaturedMediaPicker(true)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 py-4 text-sm text-gray-500 hover:border-emerald-400 hover:text-emerald-600 transition-colors"
                    >
                      📷 Choisir une image à la une
                    </button>
                  )}
                </div>

                {/* Is featured */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isFeatured}
                    onChange={(e) => updateField('isFeatured', e.target.checked)}
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-gray-700">Article à la une (mis en avant)</span>
                </label>
              </div>
            )}

            {/* SEO TAB */}
            {activeTab === 'seo' && (
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Titre SEO <span className="font-normal text-gray-400">(max 70 car.)</span>
                  </label>
                  <input
                    type="text"
                    value={form.seoTitle}
                    onChange={(e) => updateField('seoTitle', e.target.value)}
                    maxLength={70}
                    placeholder={form.title || 'Titre pour les moteurs de recherche…'}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition"
                  />
                  <p className="text-right text-xs text-gray-400">{form.seoTitle.length}/70</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description SEO <span className="font-normal text-gray-400">(max 170 car.)</span>
                  </label>
                  <textarea
                    value={form.seoDescription}
                    onChange={(e) => updateField('seoDescription', e.target.value)}
                    maxLength={170}
                    placeholder={form.excerpt || 'Description pour les moteurs de recherche…'}
                    rows={3}
                    className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition"
                  />
                  <p className="text-right text-xs text-gray-400">{form.seoDescription.length}/170</p>
                </div>

                {/* Preview */}
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm">
                  <p className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">Aperçu Google</p>
                  <p className="text-blue-700 text-base font-medium leading-tight line-clamp-1">
                    {form.seoTitle || form.title || "Titre de l'article"}
                  </p>
                  <p className="text-xs text-emerald-700 mt-0.5">ricewareci.com/blog/{form.slug || 'slug'}</p>
                  <p className="text-gray-600 text-xs mt-1 line-clamp-2">
                    {form.seoDescription || form.excerpt || "Description de l'article…"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Live Preview ───────────────────────────────────────────── */}
        <div className="hidden lg:flex flex-col min-h-0 rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          <div className="border-b border-gray-100 px-4 py-2.5 flex items-center gap-2 bg-gray-50">
            <span className="flex size-2.5 rounded-full bg-red-400" />
            <span className="flex size-2.5 rounded-full bg-yellow-400" />
            <span className="flex size-2.5 rounded-full bg-green-400" />
            <span className="ml-2 text-xs text-gray-400 font-mono">Aperçu en direct</span>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            {form.featuredImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.featuredImage.url}
                alt={form.featuredImage.altText ?? ''}
                className="w-full h-40 object-cover rounded-xl mb-5 border border-gray-100"
              />
            )}
            {form.title && (
              <h1 className="text-2xl font-bold text-gray-900 leading-tight mb-2">
                {form.title}
              </h1>
            )}
            {form.excerpt && (
              <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                {form.excerpt}
              </p>
            )}
            {(form.title || form.excerpt) && form.content.length > 0 && (
              <hr className="border-gray-100 mb-5" />
            )}
            {form.content.length === 0 ? (
              <p className="text-sm text-gray-300 italic">Ajoutez des blocs pour voir l'aperçu…</p>
            ) : (
              <div className="space-y-4">
                {form.content.map((block) => (
                  <BlockPreview key={block.id} block={block} media={mediaMap} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Featured image media picker */}
      {showFeaturedMediaPicker && (
        <MediaLibrary
          accept="image"
          onSelect={handleFeaturedImageSelect}
          onClose={() => setShowFeaturedMediaPicker(false)}
        />
      )}
    </div>
  );
}
