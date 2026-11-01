'use client';

import { useEffect, useRef, useState } from 'react';
import type { MediaSummary } from '@/lib/blog/types';

type MediaPickerProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (media: MediaSummary) => void;
  accept?: string;
};

export default function MediaPicker({ open, onClose, onSelect, accept }: MediaPickerProps) {
  const [media, setMedia] = useState<MediaSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch('/api/media/blog');
        if (!res.ok) throw new Error('Impossible de charger les médias.');
        const data = await res.json();
        if (!cancelled) setMedia(data);
      } catch {
        if (!cancelled) setError('Impossible de charger les médias.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (accept && !file.type.match(accept)) {
      setError('Format de fichier non pris en charge.');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('originalName', file.name);
      const res = await fetch('/api/media/blog', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import échoué.');
      setMedia((prev) => [data, ...prev]);
      onSelect(data);
    } catch {
      setError('Erreur lors de l’import du fichier.');
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col bg-surface rounded-lg shadow-2xl border border-line m-4">
        <div className="flex items-center justify-between px-4 py-3 border-b border-line">
          <h2 className="font-semibold text-ink">Insérer un média</h2>
          <button onClick={onClose} className="rounded hover:bg-husk-soft text-ink-muted">
            Fermer
          </button>
        </div>

        <div className="flex flex-col gap-3 p-4 overflow-y-auto max-h-[60vh]">
          <div className="grid gap-2">
            <button
              onClick={() => void fileInput.current?.click()}
              className="flex items-center gap-2 rounded border border-line border-dashed px-4 py-3 text-sm text-ink hover:bg-husk-soft transition"
            >
              <input
                ref={fileInput}
                type="file"
                accept={accept}
                hidden
                onChange={handleUpload}
              />
              {uploading ? 'Import en cours...' : 'Importer un fichier'}
            </button>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32 text-ink-muted">Chargement…</div>
          ) : media.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-ink-muted">Aucun média importé.</div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
              {media.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelect(item);
                    onClose();
                  }}
                  className={`
                    flex flex-col items-center gap-1 rounded border border-line p-2 text-sm
                    transition hover:border-paddy hover:bg-husk-soft/50
                  `}
                >
                  {item.mimeType?.startsWith('video/') ? (
                    <video
                      src={item.url}
                      className="w-full h-32 object-cover rounded"
                      preload="none"
                      poster={item.url}
                    />
                  ) : (
                    <img
                      src={item.url}
                      alt={item.altText ?? ''}
                      className="w-full h-32 object-cover rounded"
                    />
                  )}
                  <span className="text-ink-muted truncate max-w-[140px]">{item.altText ?? item.url.split('/').pop()}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
