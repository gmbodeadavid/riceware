'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { MediaSummary } from '@/lib/blog/types';

type Props = {
  onSelect: (media: MediaSummary) => void;
  onClose: () => void;
  accept?: 'image' | 'video' | 'all';
};

type MediaItem = MediaSummary & {
  type?: string;
  originalName?: string;
};

export default function MediaLibrary({ onSelect, onClose, accept = 'all' }: Props) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'image' | 'video'>('all');
  const [altText, setAltText] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/blog-admin/media', { credentials: 'same-origin' });
      const data = await res.json();
      if (res.ok) setItems(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchMedia();
  }, [fetchMedia]);

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('fichier', file);
      if (altText) formData.append('alt', altText);

      const res = await fetch('/api/blog-admin/media', {
        method: 'POST',
        body: formData,
        credentials: 'same-origin',
      });

      if (res.ok) {
        const media = await res.json() as MediaItem;
        setItems((prev) => [media, ...prev]);
        setAltText('');
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        const err = await res.json();
        alert(err.error || "Erreur lors de l'import.");
      }
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void uploadFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) void uploadFile(file);
  };

  const acceptAttr =
    accept === 'image' ? 'image/jpeg,image/png,image/webp,image/gif'
    : accept === 'video' ? 'video/mp4,video/webm'
    : 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm';

  const filtered = items.filter((item) => {
    if (filter === 'all') return true;
    if (filter === 'image') return item.mimeType?.startsWith('image/') ?? true;
    if (filter === 'video') return item.mimeType?.startsWith('video/') ?? false;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="font-semibold text-gray-900">Médiathèque</h2>
          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Upload zone */}
        <div className="border-b border-gray-200 px-5 py-4 space-y-3 bg-gray-50">
          <div
            className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
              dragOver ? 'border-emerald-400 bg-emerald-50' : 'border-gray-300 hover:border-emerald-400'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptAttr}
              className="hidden"
              onChange={handleFileChange}
            />
            {uploading ? (
              <p className="text-sm text-emerald-600 font-medium">Import en cours…</p>
            ) : (
              <p className="text-sm text-gray-500">
                <span className="text-emerald-600 font-medium">Cliquez</span> ou glissez-déposez une image / vidéo
              </p>
            )}
          </div>
          <input
            type="text"
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            placeholder="Texte alternatif (optionnel)"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 px-5 py-3 border-b border-gray-100">
          {(['all', 'image', 'video'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filter === f ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f === 'all' ? 'Tous' : f === 'image' ? 'Images' : 'Vidéos'}
            </button>
          ))}
          <span className="ml-auto text-xs text-gray-400 self-center">{filtered.length} fichier{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              Aucun média disponible. Importez votre premier fichier.
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {filtered.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onSelect(item)}
                  className="group relative rounded-lg border border-gray-200 overflow-hidden aspect-square hover:border-emerald-400 hover:shadow-md transition-all"
                  title={item.altText ?? item.originalName ?? item.url}
                >
                  {item.mimeType?.startsWith('video/') ? (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                      <span className="text-2xl">🎬</span>
                    </div>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.url}
                      alt={item.altText ?? ''}
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-emerald-600/0 group-hover:bg-emerald-600/10 transition-colors flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white bg-emerald-600 rounded-full px-2 py-0.5 text-xs font-medium shadow">
                      Choisir
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
