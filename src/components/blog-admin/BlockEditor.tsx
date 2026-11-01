'use client';

import { useCallback, useRef, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { AnyBlogBlock } from '@/lib/ricewareModels';
import type { MediaSummary } from '@/lib/blog/types';
import MediaLibrary from '@/components/blog-admin/MediaLibrary';

type BlockType = AnyBlogBlock['type'];

/** Only the block types we expose in the blog editor UI. */
type EditorBlockType = 'paragraph' | 'heading' | 'quote' | 'callout' | 'image' | 'video' | 'divider';

const EDITOR_BLOCK_TYPES: EditorBlockType[] = ['paragraph', 'heading', 'quote', 'callout', 'image', 'video', 'divider'];

const BLOCK_TYPE_LABELS: Record<EditorBlockType, string> = {
  paragraph: 'Paragraphe',
  heading: 'Titre',
  quote: 'Citation',
  callout: 'Encadre',
  image: 'Image',
  video: 'Video',
  divider: 'Separateur',
};

const CALLOUT_VARIANTS = ['info', 'tip', 'success', 'warning', 'danger'] as const;

function createBlock(type: EditorBlockType): AnyBlogBlock {
  const id = crypto.randomUUID();
  switch (type) {
    case 'heading': return { id, type: 'heading', order: 0, content: { text: '', level: 2 as const } };
    case 'quote': return { id, type: 'quote', order: 0, content: { text: '' } };
    case 'callout': return { id, type: 'callout', order: 0, content: { variant: 'info' as const, text: '' } };
    case 'image': return { id, type: 'image', order: 0, content: { mediaId: '' } };
    case 'video': return { id, type: 'video', order: 0, content: { mediaId: '', autoplay: false, loop: false, muted: true } };
    case 'divider': return { id, type: 'divider', order: 0, content: {} };
    default: return { id, type: 'paragraph', order: 0, content: { text: '' } };
  }
}

// ─── Single block editor row ─────────────────────────────────────────────────

type BlockRowProps = {
  block: AnyBlogBlock;
  onUpdate: (id: string, patch: Record<string, unknown>) => void;
  onRemove: (id: string) => void;
  onOpenMedia: (blockId: string, accept: 'image' | 'video') => void;
  media: Record<string, MediaSummary>;
};

function BlockRow({ block, onUpdate, onRemove, onOpenMedia, media }: BlockRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const content = block.content as Record<string, unknown>;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative flex gap-2 rounded-xl border border-gray-200 bg-white px-3 py-3 shadow-sm hover:border-emerald-300 transition-colors"
    >
      {/* Drag handle */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="flex-shrink-0 mt-1 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 transition-colors touch-none"
        title="Réordonner"
      >
        ⠿
      </button>

      {/* Block content */}
      <div className="flex-1 min-w-0">
        {/* Type badge */}
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
            {BLOCK_TYPE_LABELS[block.type as keyof typeof BLOCK_TYPE_LABELS] ?? block.type}
          </span>
        </div>

        {block.type === 'paragraph' && (
          <textarea
            value={(content.text as string) || ''}
            onChange={(e) => onUpdate(block.id, { text: e.target.value })}
            placeholder="Saisissez votre paragraphe…"
            rows={3}
            className="w-full resize-y rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition"
          />
        )}

        {block.type === 'heading' && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <select
                value={(content.level as number) || 2}
                onChange={(e) => onUpdate(block.id, { level: Number(e.target.value) as 1 | 2 | 3 | 4 })}
                className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-emerald-400"
              >
                <option value={2}>H2</option>
                <option value={3}>H3</option>
                <option value={4}>H4</option>
              </select>
              <input
                type="text"
                value={(content.text as string) || ''}
                onChange={(e) => onUpdate(block.id, { text: e.target.value })}
                placeholder="Titre…"
                className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-bold outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition"
              />
            </div>
          </div>
        )}

        {block.type === 'quote' && (
          <div className="space-y-2 border-l-4 border-emerald-300 pl-3">
            <textarea
              value={(content.text as string) || ''}
              onChange={(e) => onUpdate(block.id, { text: e.target.value })}
              placeholder="Texte de la citation…"
              rows={2}
              className="w-full resize-y rounded-lg border border-gray-200 px-3 py-2 text-sm italic outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition"
            />
            <input
              type="text"
              value={(content.author as string) || ''}
              onChange={(e) => onUpdate(block.id, { author: e.target.value })}
              placeholder="Auteur de la citation (optionnel)"
              className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs outline-none focus:border-emerald-400"
            />
          </div>
        )}

        {block.type === 'callout' && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <select
                value={(content.variant as string) || 'info'}
                onChange={(e) => onUpdate(block.id, { variant: e.target.value })}
                className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-emerald-400"
              >
                {CALLOUT_VARIANTS.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
              <input
                type="text"
                value={(content.title as string) || ''}
                onChange={(e) => onUpdate(block.id, { title: e.target.value })}
                placeholder="Titre (optionnel)"
                className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-emerald-400"
              />
            </div>
            <textarea
              value={(content.text as string) || ''}
              onChange={(e) => onUpdate(block.id, { text: e.target.value })}
              placeholder="Contenu de l'encadré…"
              rows={2}
              className="w-full resize-y rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition"
            />
          </div>
        )}

        {block.type === 'image' && (
          <div className="space-y-2">
            {(content.mediaId as string) ? (
              <div className="flex items-center gap-3">
                {media[(content.mediaId as string)] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={media[(content.mediaId as string)].url}
                    alt=""
                    className="h-16 w-16 rounded object-cover border border-gray-200"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 truncate">{(content.mediaId as string).slice(0, 20)}…</p>
                  <button
                    type="button"
                    onClick={() => onOpenMedia(block.id, 'image')}
                    className="mt-1 text-xs text-emerald-600 hover:underline"
                  >
                    Changer d'image
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onOpenMedia(block.id, 'image')}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 py-5 text-sm text-gray-500 hover:border-emerald-400 hover:text-emerald-600 transition-colors"
              >
                📷 Choisir une image
              </button>
            )}
            <input
              type="text"
              value={(content.caption as string) || ''}
              onChange={(e) => onUpdate(block.id, { caption: e.target.value })}
              placeholder="Légende (optionnelle)"
              className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs outline-none focus:border-emerald-400"
            />
          </div>
        )}

        {block.type === 'video' && (
          <div className="space-y-2">
            {(content.mediaId as string) ? (
              <div className="flex items-center gap-3">
                <div className="flex size-16 items-center justify-center rounded bg-gray-100 border border-gray-200">
                  <span className="text-2xl">🎬</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 truncate">{(content.mediaId as string).slice(0, 20)}…</p>
                  <button
                    type="button"
                    onClick={() => onOpenMedia(block.id, 'video')}
                    className="mt-1 text-xs text-emerald-600 hover:underline"
                  >
                    Changer de vidéo
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onOpenMedia(block.id, 'video')}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 py-5 text-sm text-gray-500 hover:border-emerald-400 hover:text-emerald-600 transition-colors"
              >
                🎬 Choisir une vidéo
              </button>
            )}
            <input
              type="text"
              value={(content.caption as string) || ''}
              onChange={(e) => onUpdate(block.id, { caption: e.target.value })}
              placeholder="Légende (optionnelle)"
              className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs outline-none focus:border-emerald-400"
            />
          </div>
        )}

        {block.type === 'divider' && (
          <div className="flex items-center gap-2">
            <hr className="flex-1 border-gray-300" />
            <span className="text-xs text-gray-400">Séparateur</span>
            <hr className="flex-1 border-gray-300" />
          </div>
        )}
      </div>

      {/* Remove */}
      <button
        type="button"
        onClick={() => onRemove(block.id)}
        className="flex-shrink-0 mt-1 flex size-7 items-center justify-center rounded-full text-gray-300 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 transition-all"
        title="Supprimer ce bloc"
      >
        ✕
      </button>
    </div>
  );
}

// ─── InsertZone — thin "+ insert" strip between blocks ───────────────────────

type InsertZoneProps = {
  afterIndex: number; // insert AFTER this index (-1 = prepend before all)
  onInsert: (afterIndex: number, type: EditorBlockType) => void;
};

function InsertZone({ afterIndex, onInsert }: InsertZoneProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  const handleBlur = useCallback((e: React.FocusEvent<HTMLDivElement>) => {
    if (!ref.current?.contains(e.relatedTarget as Node)) setOpen(false);
  }, []);

  return (
    <div
      ref={ref}
      className="group relative flex items-center"
      onBlur={handleBlur}
    >
      {/* The thin line + centered button */}
      <div className="flex-1 h-px bg-gray-200 group-hover:bg-emerald-300 transition-colors" />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`
          mx-2 flex size-6 flex-shrink-0 items-center justify-center rounded-full border text-xs font-bold
          transition-all
          ${open
            ? 'border-emerald-400 bg-emerald-50 text-emerald-600'
            : 'border-gray-200 bg-white text-gray-300 opacity-0 group-hover:opacity-100 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-600'
          }
        `}
        title="Insérer un bloc ici"
      >
        +
      </button>
      <div className="flex-1 h-px bg-gray-200 group-hover:bg-emerald-300 transition-colors" />

      {/* Block type popover */}
      {open && (
        <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 z-30 rounded-xl border border-gray-200 bg-white shadow-xl p-2 grid grid-cols-4 sm:grid-cols-7 gap-1 min-w-[260px]">
          {EDITOR_BLOCK_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => { onInsert(afterIndex, type); setOpen(false); }}
              className="flex flex-col items-center gap-0.5 rounded-lg px-1.5 py-2 text-[10px] font-medium text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
            >
              <span className="text-sm">
                {type === 'paragraph' ? '¶' : type === 'heading' ? 'H' : type === 'quote' ? '"' : type === 'callout' ? '!' : type === 'image' ? '📷' : type === 'video' ? '🎬' : '—'}
              </span>
              {BLOCK_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── BlockEditor (main export) ───────────────────────────────────────────────

type BlockEditorProps = {
  blocks: AnyBlogBlock[];
  onChange: (blocks: AnyBlogBlock[]) => void;
  media: Record<string, MediaSummary>;
  onMediaSelect: (blockId: string, media: MediaSummary) => void;
};

export default function BlockEditor({ blocks, onChange, media, onMediaSelect }: BlockEditorProps) {
  const [mediaPickerState, setMediaPickerState] = useState<{ blockId: string; accept: 'image' | 'video' } | null>(null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = blocks.findIndex((b) => b.id === active.id);
      const newIndex = blocks.findIndex((b) => b.id === over.id);
      onChange(arrayMove(blocks, oldIndex, newIndex));
    }
  }, [blocks, onChange]);

  const updateBlock = useCallback((id: string, patch: Record<string, unknown>) => {
    onChange(
      blocks.map((b) => b.id === id ? { ...b, content: { ...b.content, ...patch } } : b) as AnyBlogBlock[]
    );
  }, [blocks, onChange]);

  const removeBlock = useCallback((id: string) => {
    onChange(blocks.filter((b) => b.id !== id));
  }, [blocks, onChange]);

  /** Insert a new block AFTER position `afterIndex` (-1 = prepend). */
  const insertBlock = useCallback((afterIndex: number, type: EditorBlockType) => {
    const newBlock = createBlock(type);
    const updated = [...blocks];
    updated.splice(afterIndex + 1, 0, newBlock);
    onChange(updated);
  }, [blocks, onChange]);

  const addBlock = useCallback((type: EditorBlockType) => {
    insertBlock(blocks.length - 1, type);
    setAddMenuOpen(false);
  }, [blocks.length, insertBlock]);

  const openMedia = useCallback((blockId: string, accept: 'image' | 'video') => {
    setMediaPickerState({ blockId, accept });
  }, []);

  const handleMediaSelect = useCallback((selectedMedia: MediaSummary) => {
    if (!mediaPickerState) return;
    onMediaSelect(mediaPickerState.blockId, selectedMedia);
    setMediaPickerState(null);
  }, [mediaPickerState, onMediaSelect]);

  return (
    <div className="space-y-0">
      {/* Prepend zone — before first block */}
      {blocks.length > 0 && (
        <InsertZone afterIndex={-1} onInsert={insertBlock} />
      )}

      {/* Blocks list */}
      {blocks.length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <div>
              {blocks.map((block, index) => (
                <div key={block.id}>
                  <BlockRow
                    block={block}
                    onUpdate={updateBlock}
                    onRemove={removeBlock}
                    onOpenMedia={openMedia}
                    media={media}
                  />
                  {/* Insert zone after each block */}
                  <InsertZone afterIndex={index} onInsert={insertBlock} />
                </div>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-400">
          Aucun bloc. Ajoutez votre premier bloc ci-dessous.
        </div>
      )}

      {/* Add block at end — only shown when no blocks */}
      {blocks.length === 0 && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setAddMenuOpen((v) => !v)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-3 text-sm font-medium text-gray-400 hover:border-emerald-400 hover:text-emerald-600 transition-colors"
          >
            <span className="text-lg leading-none">+</span>
            Ajouter un bloc
          </button>

          {addMenuOpen && (
            <div className="absolute bottom-full mb-2 left-0 right-0 z-20 rounded-xl border border-gray-200 bg-white shadow-xl p-3 grid grid-cols-4 sm:grid-cols-7 gap-1.5">
              {EDITOR_BLOCK_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => addBlock(type)}
                  className="flex flex-col items-center gap-1 rounded-lg px-2 py-2.5 text-xs font-medium text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                >
                  <span className="text-base">
                    {type === 'paragraph' ? '¶' : type === 'heading' ? 'H' : type === 'quote' ? '"' : type === 'callout' ? '!' : type === 'image' ? '📷' : type === 'video' ? '🎬' : '—'}
                  </span>
                  {BLOCK_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Media picker modal */}
      {mediaPickerState && (
        <MediaLibrary
          accept={mediaPickerState.accept}
          onSelect={handleMediaSelect}
          onClose={() => setMediaPickerState(null)}
        />
      )}
    </div>
  );
}
