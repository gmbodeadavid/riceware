'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { EDITOR_STATUSES, BLOG_STATUS_LABELS, BLOG_STATUS_HINTS } from '@/lib/blog/status';
import type { ArticleFormValues, ArticleTaxonomies } from '@/lib/blog/types';
import type { AnyBlogBlock, BlogPostStatus } from '@/lib/ricewareModels';
import MediaPicker from '@/components/admin/MediaPicker';
import type { MediaSummary } from '@/lib/blog/types';

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

function htmlToText(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent ?? '';
}

type EditableBlockProps = {
  block: AnyBlogBlock;
  isFocused: boolean;
  onFocus: (id: string) => void;
  onUpdate: (id: string, patch: Partial<AnyBlogBlock['content']>) => void;
  onRemove: (id: string) => void;
  onTypeChange: (type: AnyBlogBlock['type']) => void;
  registerRef: (id: string, element: HTMLDivElement | null) => void;
};

function blockText(block: AnyBlogBlock): string {
  return (block.content as { text?: string }).text ?? '';
}

function EditableBlock({ block, isFocused, onFocus, onUpdate, onRemove, onTypeChange, registerRef }: EditableBlockProps) {
  const elRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    registerRef(block.id, elRef.current);
    return () => registerRef(block.id, null);
  }, [block.id, registerRef]);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    // Ne pas écraser la saisie en cours, sauf si le bloc vient d'être recréé
    // (changement de type) et que son contenu est encore vide.
    if (isFocused && el.innerHTML !== '') return;
    const html = blockText(block);
    if (el.innerHTML !== html.replace(/\n/g, '<br />')) {
      el.innerHTML = html.replace(/\n/g, '<br />');
    }
  }, [block, isFocused]);

  useEffect(() => {
    if (isFocused && elRef.current) {
      elRef.current.focus();
    }
  }, [isFocused]);

  const handleInput = () => {
    const el = elRef.current;
    if (el) onUpdate(block.id, { text: el.innerHTML });
  };

  const handleBlur = () => {
    const el = elRef.current;
    if (el) onUpdate(block.id, { text: el.innerHTML });
  };

  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    onFocus(block.id);
  };

  if (block.type === 'paragraph') {
    return (
      <div className="relative group" onClick={handleClick}>
        <div
          ref={elRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onBlur={handleBlur}
          className="min-h-[60px] leading-relaxed text-ink/90 whitespace-pre-line outline-none focus:outline-none"
        />
        <div className="absolute -top-6 left-0 right-0 flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onTypeChange('heading')}
            className="rounded border border-line bg-surface px-1.5 py-1 text-xs text-ink hover:bg-husk-soft"
            title="Convertir en titre"
          >
            Titre
          </button>
          <button
            onClick={() => onRemove(block.id)}
            className="rounded border border-line bg-surface px-1.5 py-1 text-xs text-red-600 hover:bg-red-50"
            title="Supprimer le bloc"
          >
            Suppr
          </button>
        </div>
      </div>
    );
  }

  if (block.type === 'heading') {
    return (
      <div className="relative group" onClick={handleClick}>
        <h2
          ref={elRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onBlur={handleBlur}
          className="text-xl font-bold font-display text-ink leading-tight outline-none focus:outline-none"
        />
        <div className="absolute -top-6 left-0 right-0 flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onTypeChange('paragraph')}
            className="rounded border border-line bg-surface px-1.5 py-1 text-xs text-ink hover:bg-husk-soft"
            title="Convertir en paragraphe"
          >
            Paragraphe
          </button>
          <button
            onClick={() => onRemove(block.id)}
            className="rounded border border-line bg-surface px-1.5 py-1 text-xs text-red-600 hover:bg-red-50"
            title="Supprimer le bloc"
          >
            Suppr
          </button>
        </div>
      </div>
    );
  }

  if (block.type === 'quote') {
    return (
      <div className="relative group border-l-4 border-paddy pl-4 italic text-ink-muted my-2" onClick={handleClick}>
        <div
          ref={elRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onBlur={handleBlur}
          className="leading-relaxed whitespace-pre-line outline-none focus:outline-none"
        />
        <div className="absolute -top-6 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onRemove(block.id)}
            className="rounded border border-line bg-surface px-1.5 py-1 text-xs text-red-600 hover:bg-red-50"
            title="Supprimer le bloc"
          >
            Suppr
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export default function ArticleEditor({ initialData, onSubmit, isSubmitting, submitLabel }: ArticleEditorProps) {
  const [taxonomies, setTaxonomies] = useState<ArticleTaxonomies>(emptyTaxonomies);
  const [taxonomyError, setTaxonomyError] = useState('');
  const [form, setForm] = useState({
    title: initialData?.title ?? '',
    slug: initialData?.slug ?? '',
    excerpt: initialData?.excerpt ?? '',
    status: initialData?.status ?? 'published',
    scheduledAt: initialData?.scheduledAt ?? '',
    authorId: initialData?.authorId ?? '',
    categoryIds: initialData?.categoryIds ?? [],
    tagIds: initialData?.tagIds ?? [],
    seoTitle: initialData?.seoTitle ?? '',
    seoDescription: initialData?.seoDescription ?? '',
    isFeatured: initialData?.isFeatured ?? false,
  });

  const [blocks, setBlocks] = useState<AnyBlogBlock[]>(initialData?.content ?? []);
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  const blockRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const registerBlockRef = useCallback((id: string, element: HTMLDivElement | null) => {
    if (element) blockRefs.current.set(id, element);
    else blockRefs.current.delete(id);
  }, []);

  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [insertType, setInsertType] = useState<'image' | 'video' | null>(null);
  const [media, setMedia] = useState<MediaSummary[]>([]);

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

    async function loadMedia() {
      try {
        const res = await fetch('/api/media/blog');
        if (!res.ok) throw new Error('Chargement impossible.');
        const data = await res.json() as MediaSummary[];
        if (!cancelled) setMedia(data);
      } catch {
        // La médiathèque reste optionnelle : l'éditeur fonctionne sans.
      }
    }

    loadTaxonomies();
    loadMedia();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (focusedBlockId) {
      const el = blockRefs.current.get(focusedBlockId);
      el?.focus();
    }
  }, [focusedBlockId]);

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

  /* ---------- Blocs ---------- */

  function updateBlockText(blockId: string, patch: Partial<AnyBlogBlock['content']>) {
    setBlocks((prev) =>
      prev.map((block) => {
        if (block.id !== blockId) return block;
        return { ...block, content: { ...block.content, ...patch } } as AnyBlogBlock;
      }),
    );
  }

  function insertBlockAfter(block: AnyBlogBlock, afterId: string | null) {
    setBlocks((prev) => {
      if (afterId === null) return [block, ...prev];
      const index = prev.findIndex((b) => b.id === afterId);
      if (index === -1) return [...prev, block];
      return [...prev.slice(0, index + 1), block, ...prev.slice(index + 1)];
    });
  }

  function removeBlock(blockId: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
    setFocusedBlockId((current) => (current === blockId ? null : current));
  }

  function setBlockType(type: AnyBlogBlock['type']) {
    if (!focusedBlockId) return;
    setBlocks((prev) =>
      prev.map((block) => {
        if (block.id !== focusedBlockId) return block;
        if (block.type === type) return block;
        switch (type) {
          case 'paragraph':
            return { id: block.id, type: 'paragraph', order: block.order, content: { text: htmlToText(blockText(block)) } };
          case 'heading':
            return { id: block.id, type: 'heading', order: block.order, content: { level: 2, text: htmlToText(blockText(block)) } };
          case 'quote':
            return { id: block.id, type: 'quote', order: block.order, content: { text: htmlToText(blockText(block)) } };
          default:
            return block;
        }
      }),
    );
  }

  /* ---------- Mise en forme en ligne ---------- */

  function applyInlineFormat(command: 'bold' | 'italic' | 'link') {
    if (!focusedBlockId) return;
    const el = blockRefs.current.get(focusedBlockId);
    if (!el) return;
    el.focus();

    if (command === 'link') {
      const url = window.prompt('URL du lien :');
      if (!url) return;
      document.execCommand('createLink', false, url);
    } else {
      document.execCommand(command === 'bold' ? 'bold' : 'italic', false, undefined);
    }

    const block = blocks.find((b) => b.id === focusedBlockId);
    if (block && (block.type === 'paragraph' || block.type === 'heading' || block.type === 'quote')) {
      updateBlockText(focusedBlockId, { text: el.innerHTML });
    }
  }

  /* ---------- Insertion média ---------- */

  const handleMediaSelect = useCallback(
    (item: MediaSummary) => {
      if (!insertType) return;
      const block: AnyBlogBlock =
        insertType === 'image'
          ? {
              id: crypto.randomUUID(),
              type: 'image',
              order: 0,
              content: { mediaId: item.id, caption: item.altText ?? undefined },
            }
          : {
              id: crypto.randomUUID(),
              type: 'video',
              order: 0,
              content: { mediaId: item.id, caption: item.altText ?? undefined },
            };
      insertBlockAfter(block, focusedBlockId ?? null);
      setInsertType(null);
      setMediaPickerOpen(false);
    },
    [focusedBlockId, insertType],
  );

  /* ---------- Soumission ---------- */

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTaxonomyError('');

    try {
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
        content: blocks,
      });
    } catch {
      // géré par onSubmit côté page (setError)
    }
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

      {/* Barre d’outils de mise en forme */}
      <div className="rounded-lg border border-line bg-surface p-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => applyInlineFormat('bold')}
          className="rounded border border-line px-2 py-1 text-xs font-semibold text-ink hover:bg-husk-soft transition disabled:opacity-50"
          disabled={!focusedBlockId}
        >
          Gras
        </button>
        <button
          type="button"
          onClick={() => applyInlineFormat('italic')}
          className="rounded border border-line px-2 py-1 text-xs font-semibold text-ink hover:bg-husk-soft transition disabled:opacity-50"
          disabled={!focusedBlockId}
        >
          Italique
        </button>
        <button
          type="button"
          onClick={() => applyInlineFormat('link')}
          className="rounded border border-line px-2 py-1 text-xs font-semibold text-ink hover:bg-husk-soft transition disabled:opacity-50"
          disabled={!focusedBlockId}
        >
          Lien
        </button>
        <button
          type="button"
          onClick={() => setBlockType('heading')}
          className="rounded border border-line px-2 py-1 text-xs font-semibold text-ink hover:bg-husk-soft transition disabled:opacity-50"
          disabled={!focusedBlockId}
        >
          Titre
        </button>
        <button
          type="button"
          onClick={() => setBlockType('quote')}
          className="rounded border border-line px-2 py-1 text-xs font-semibold text-ink hover:bg-husk-soft transition disabled:opacity-50"
          disabled={!focusedBlockId}
        >
          Citation
        </button>
        <button
          type="button"
          onClick={() => insertBlockAfter({ id: crypto.randomUUID(), type: 'divider', order: 0, content: {} }, focusedBlockId ?? null)}
          className="rounded border border-line px-2 py-1 text-xs font-semibold text-ink hover:bg-husk-soft transition"
        >
          Séparateur
        </button>
        <button
          type="button"
          onClick={() => {
            setInsertType('image');
            setMediaPickerOpen(true);
          }}
          className="rounded border border-line px-2 py-1 text-xs font-semibold text-ink hover:bg-husk-soft transition"
        >
          Image
        </button>
        <button
          type="button"
          onClick={() => {
            setInsertType('video');
            setMediaPickerOpen(true);
          }}
          className="rounded border border-line px-2 py-1 text-xs font-semibold text-ink hover:bg-husk-soft transition"
        >
          Vidéo
        </button>
        <span className="ml-auto text-xs text-ink-muted">{focusedBlockId ? 'Bloc sélectionné' : 'Cliquez sur un bloc pour l’éditer'}</span>
      </div>

      {/* Blocs de contenu */}
      <div className="rounded-lg border border-line bg-ground p-3 max-h-[60vh] overflow-y-auto">
        {blocks.length === 0 ? (
          <div className="text-center py-8 text-ink-muted">
            Cliquez sur « Gras », « Image » ou « Vidéo » pour commencer, ou cliquez dans la zone vide pour ajouter un paragraphe.
          </div>
        ) : (
          <div className="space-y-3">
            {blocks.map((block) => {
              const isFocused = focusedBlockId === block.id;
              const isEditable = block.type === 'paragraph' || block.type === 'heading' || block.type === 'quote';

              if (isEditable) {
                return (
                  <EditableBlock
                    key={block.id}
                    block={block}
                    isFocused={isFocused}
                    onFocus={setFocusedBlockId}
                    onUpdate={updateBlockText}
                    onRemove={removeBlock}
                    onTypeChange={setBlockType}
                    registerRef={registerBlockRef}
                  />
                );
              }

              if (block.type === 'image') {
                const content = block.content as { mediaId?: string; caption?: string };
                const item = media.find((m) => m.id === content.mediaId);
                return (
                  <div key={block.id} className="relative group flex flex-col items-center my-2" onClick={(e) => {
                    e.stopPropagation();
                    setFocusedBlockId(block.id);
                  }}>
                    {item ? (
                      <img src={item.url} alt={item.altText ?? ''} className="max-w-full max-h-[400px] object-cover rounded border border-line" />
                    ) : (
                      <div className="w-48 h-48 rounded border border-dashed border-line flex items-center justify-center text-ink-muted">
                        Média introuvable
                      </div>
                    )}
                    {content.caption && <p className="mt-1 text-xs text-ink-muted text-center">{content.caption}</p>}
                    <div className="absolute -right-2 top-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }} className="rounded border border-line bg-red-50 px-1.5 py-1 text-xs text-red-600 hover:bg-red-100">
                        Suppr
                      </button>
                    </div>
                  </div>
                );
              }

              if (block.type === 'video') {
                const content = block.content as { mediaId?: string; caption?: string };
                const item = media.find((m) => m.id === content.mediaId);
                return (
                  <div key={block.id} className="relative group flex flex-col items-center my-2" onClick={(e) => {
                    e.stopPropagation();
                    setFocusedBlockId(block.id);
                  }}>
                    {item ? (
                      <video
                        src={item.url}
                        controls
                        className="max-w-full max-h-[300px] rounded border border-line"
                      />
                    ) : (
                      <div className="w-64 h-36 rounded border border-dashed border-line flex items-center justify-center text-ink-muted">
                        Média introuvable
                      </div>
                    )}
                    {content.caption && <p className="mt-1 text-xs text-ink-muted text-center">{content.caption}</p>}
                    <div className="absolute -right-2 top-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }} className="rounded border border-line bg-red-50 px-1.5 py-1 text-xs text-red-600 hover:bg-red-100">
                        Suppr
                      </button>
                    </div>
                  </div>
                );
              }

              if (block.type === 'divider') {
                return (
                  <div key={block.id} className="my-4 flex justify-center" onClick={(e) => {
                    e.stopPropagation();
                    setFocusedBlockId(block.id);
                  }}>
                    <hr className="w-full border-line" />
                    <div className="absolute -top-6 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }} className="rounded border border-line bg-red-50 px-1.5 py-1 text-xs text-red-600 hover:bg-red-100">
                        Suppr
                      </button>
                    </div>
                  </div>
                );
              }

              return null;
            })}
            <div
              className="min-h-[80px] cursor-text"
              onClick={() => {
                const newBlock: AnyBlogBlock = {
                  id: crypto.randomUUID(),
                  type: 'paragraph',
                  order: blocks.length,
                  content: { text: '' },
                };
                insertBlockAfter(newBlock, blocks[blocks.length - 1]?.id ?? null);
                setFocusedBlockId(newBlock.id);
              }}
            />
          </div>
        )}
      </div>

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

      <MediaPicker
        open={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={handleMediaSelect}
        accept="image/*,video/*"
      />
    </form>
  );
}
