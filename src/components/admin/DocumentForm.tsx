'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Field, FormFeedback, buttonClassName, inputClassName, selectClassName, selectStyle } from '@/components/admin/fields';
import { DOCUMENT_CATEGORIES } from '@/lib/production/types';

export default function DocumentForm({
  entityOptions,
}: {
  entityOptions?: Array<{ value: string; label: string }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
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
          name: name || file.name,
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
      setFile(null);
      setName('');
      setNotes('');
      setOpen(false);
      const input = document.getElementById('document-file') as HTMLInputElement | null;
      if (input) input.value = '';
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Import impossible.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-panel border border-line bg-surface">
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left" aria-expanded={open}>
        <span>
          <span className="font-display text-lg font-semibold text-ink">Importer un document</span>
          <span className="ml-2 text-xs text-ink-muted">Certificat, contrat, rapport ou photo</span>
        </span>
        <span className="text-sm font-semibold text-paddy">{open ? 'Réduire' : 'Ouvrir'}</span>
      </button>

      {open ? (
        <form onSubmit={submit} className="grid gap-4 border-t border-line px-5 py-5 sm:grid-cols-2">
          <Field label="Fichier" htmlFor="document-file" hint="JPEG, PNG, WebP, GIF ou PDF — 10 Mo maximum.">
            <input id="document-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif,application/pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} required className="block w-full text-sm text-ink-muted file:mr-3 file:rounded-control file:border-0 file:bg-paddy file:px-3 file:py-2 file:text-sm file:font-semibold file:text-on-paddy" />
          </Field>
          <Field label="Nom du document" htmlFor="document-name" hint="Laissez vide pour reprendre le nom du fichier.">
            <input id="document-name" value={name} onChange={(event) => setName(event.target.value)} className={inputClassName} />
          </Field>
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
          <div className="sm:col-span-2">
            <Field label="Notes" htmlFor="document-notes">
              <textarea id="document-notes" rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} className={inputClassName} />
            </Field>
          </div>

          {error ? <div className="sm:col-span-2"><FormFeedback type="error" message={error} /></div> : null}
          {success ? <div className="sm:col-span-2"><FormFeedback type="success" message={success} /></div> : null}

          <div className="sm:col-span-2">
            <button type="submit" disabled={loading} className={buttonClassName('primary')}>
              {loading ? 'Import…' : 'Importer le document'}
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
