'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Field, FormFeedback, buttonClassName, inputClassName, selectClassName, selectStyle } from '@/components/admin/fields';
import { DOCUMENT_CATEGORIES } from '@/lib/production/types';

export default function DocumentForm({
  entityOptions,
}: {
  entityOptions?: Array<{ value: string; label: string }>;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState('certificat');
  const [entity, setEntity] = useState(entityOptions?.[0]?.value ?? '');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) {
      setError('Sélectionnez un fichier.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadResponse = await fetch('/api/admin/documents/upload', { method: 'POST', body: formData });
      const uploaded = await uploadResponse.json();
      if (uploadResponse.status === 401) {
        router.push('/admin/login');
        return;
      }
      if (!uploadResponse.ok) throw new Error(uploaded.error || 'Import impossible.');

      const [entityType, entityId] = entity ? entity.split(':') : ['', ''];
      const response = await fetch('/api/admin/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: file.name,
          category,
          url: uploaded.url,
          mimeType: uploaded.mimeType,
          sizeBytes: uploaded.sizeBytes,
          entityType: entityType || null,
          entityId: entityId || null,
          notes,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Enregistrement impossible.');

      setSuccess('Document enregistré.');
      router.refresh();
      router.push('/admin/documents');
      setFile(null);
      setNotes('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Import impossible.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      {/* Ligne 1 : fichier */}
      <div className="sm:col-span-2">
        <Field label="Fichier" htmlFor="document-file">
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              id="document-file"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              required
              className="sr-only"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center rounded-control border border-line bg-surface px-3 py-2 text-sm font-semibold text-ink transition-colors hover:border-paddy hover:text-paddy shrink-0"
            >
              Choisir un fichier
            </button>
            {file ? (
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-control border border-line bg-ground/50 px-3 py-2">
                <span className="truncate text-sm text-ink">{file.name}</span>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  aria-label="Retirer le fichier"
                  className="ml-auto shrink-0 text-ink-muted transition-colors hover:text-danger"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>
            ) : (
              <span className="text-sm text-ink-muted">Aucun fichier sélectionné</span>
            )}
          </div>
        </Field>
      </div>

      {/* Ligne 2 : catégorie + rattachement */}
      <Field label="Catégorie" htmlFor="document-category">
        <select id="document-category" value={category} onChange={(event) => setCategory(event.target.value)} className={selectClassName} style={selectStyle}>
          {DOCUMENT_CATEGORIES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </Field>
      {entityOptions?.length ? (
        <Field label="Rattacher à" htmlFor="document-entity">
          <select id="document-entity" value={entity} onChange={(event) => setEntity(event.target.value)} className={selectClassName} style={selectStyle}>
            <option value="">Aucun rattachement</option>
            {entityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </Field>
      ) : null}

      {/* Notes pleine largeur */}
      <div className="sm:col-span-2">
        <Field label="Notes" htmlFor="document-notes">
          <textarea id="document-notes" rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} className={inputClassName} />
        </Field>
      </div>

      {error ? <div className="sm:col-span-2"><FormFeedback type="error" message={error} /></div> : null}
      {success ? <div className="sm:col-span-2"><FormFeedback type="success" message={success} /></div> : null}

      <div className="sm:col-span-2">
        <button type="submit" disabled={loading} className={buttonClassName('primary')}>
          {loading ? 'Import en cours…' : 'Importer le document'}
        </button>
      </div>
    </form>
  );
}
