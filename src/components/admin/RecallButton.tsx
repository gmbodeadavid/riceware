'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { buttonClassName, inputClassName } from '@/components/admin/fields';

/**
 * Bouton « Marquer en rappel » avec saisie de motif.
 * Supporte les lots de coques (/api/admin/lots/[id]/recall) et les PackLots (/api/admin/pack-lots/[id]).
 */
export default function RecallButton({
  endpoint,
  label = 'Marquer en rappel',
  confirmation,
  method = 'POST',
  body: extraBody = {},
}: {
  endpoint: string;
  label?: string;
  confirmation: string;
  method?: 'POST' | 'PATCH';
  body?: Record<string, unknown>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [motif, setMotif] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!motif.trim()) { setError('Le motif est obligatoire.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...extraBody, action: method === 'PATCH' ? 'recall' : undefined, motif: motif.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur.');
      setOpen(false);
      setMotif('');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur.');
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={buttonClassName('danger')}>
        🚨 {label}
      </button>
    );
  }

  return (
    <div className="rounded-control border border-danger/40 bg-danger/5 p-4">
      <p className="mb-3 font-semibold text-danger">{confirmation}</p>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">Motif obligatoire</label>
          <input
            type="text"
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            placeholder="Ex : contamination, défaut de fabrication…"
            className={inputClassName}
            autoFocus
          />
        </div>
        {error ? <p className="text-xs text-danger">{error}</p> : null}
        <div className="flex gap-2">
          <button type="submit" disabled={loading} className={buttonClassName('danger')}>
            {loading ? 'Rappel en cours…' : 'Confirmer le rappel'}
          </button>
          <button type="button" onClick={() => setOpen(false)} className={buttonClassName('secondary')}>Annuler</button>
        </div>
      </form>
    </div>
  );
}
