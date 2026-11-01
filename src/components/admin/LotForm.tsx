'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Field, FormFeedback, buttonClassName, inputClassName, selectClassName, selectStyle } from '@/components/admin/fields';
import { LOT_STATUSES, LOT_VISUAL_QUALITIES, toNumber } from '@/lib/production/types';
import { toDateTimeInputValue } from '@/lib/format';

export type LotFormInitial = {
  id: string;
  rizerieId: string;
  receivedAt: string | Date;
  grossWeightKg: number;
  tareWeightKg: number;
  humidityPct: number;
  visualQuality: string;
  status: string;
  photoUrl?: string | null;
  notes?: string | null;
};

export default function LotForm({
  rizeries,
  initial,
}: {
  rizeries: Array<{ id: string; name: string }>;
  initial?: LotFormInitial;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(!initial);
  const [rizerieId, setRizerieId] = useState(initial?.rizerieId ?? rizeries[0]?.id ?? '');
  const [receivedAt, setReceivedAt] = useState(toDateTimeInputValue(initial?.receivedAt ?? new Date()));
  const [gross, setGross] = useState(String(initial?.grossWeightKg ?? ''));
  const [tare, setTare] = useState(String(initial?.tareWeightKg ?? 0));
  const [humidity, setHumidity] = useState(String(initial?.humidityPct ?? ''));
  const [visualQuality, setVisualQuality] = useState(initial?.visualQuality ?? 'conforme');
  const [status, setStatus] = useState(initial?.status ?? 'accepted');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [photoUrl, setPhotoUrl] = useState(initial?.photoUrl ?? '');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const net = useMemo(() => Math.max(0, toNumber(gross) - toNumber(tare)), [gross, tare]);

  const uploadPhoto = async (file: File) => {
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/admin/documents/upload', { method: 'POST', body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Import impossible.');
      setPhotoUrl(data.url);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Import impossible.');
    } finally {
      setUploading(false);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(initial ? `/api/admin/lots/${initial.id}` : '/api/admin/lots', {
        method: initial ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rizerieId,
          receivedAt,
          grossWeightKg: toNumber(gross),
          tareWeightKg: toNumber(tare),
          netWeightKg: net,
          humidityPct: toNumber(humidity),
          visualQuality,
          status,
          notes,
          photoUrl: photoUrl || null,
        }),
      });
      const data = await response.json();
      if (response.status === 401) {
        router.push('/admin/login');
        return;
      }
      if (!response.ok) throw new Error(data.error || 'Enregistrement impossible.');

      setSuccess(initial ? 'Lot mis à jour.' : `Lot ${data.code} enregistré.`);
      router.refresh();
      if (!initial) {
        setGross('');
        setTare('0');
        setHumidity('');
        setNotes('');
        setPhotoUrl('');
        setVisualQuality('conforme');
        setStatus('accepted');
        setReceivedAt(toDateTimeInputValue(new Date()));
        setOpen(false);
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Enregistrement impossible.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-panel border border-line bg-surface">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
        aria-expanded={open}
      >
        <span>
          <span className="font-display text-lg font-semibold text-ink">{initial ? 'Modifier le lot' : 'Saisir un lot de coques'}</span>
          <span className="ml-2 text-xs text-ink-muted">{initial ? initial.id : 'Traçabilité à la réception'}</span>
        </span>
        <span className="text-sm font-semibold text-paddy">{open ? 'Réduire' : 'Ouvrir'}</span>
      </button>

      {open ? (
        <form onSubmit={submit} className="grid gap-4 border-t border-line px-5 py-5 sm:grid-cols-2">
          {rizeries.length === 0 ? (
            <div className="sm:col-span-2">
              <FormFeedback type="error" message="Créez d’abord une rizerie dans le module Rizeries." />
            </div>
          ) : null}

          <Field label="Rizerie" htmlFor="lot-rizerie">
            <select id="lot-rizerie" value={rizerieId} onChange={(event) => setRizerieId(event.target.value)} required className={selectClassName} style={selectStyle}>
              {rizeries.map((rizerie) => (
                <option key={rizerie.id} value={rizerie.id}>{rizerie.name}</option>
              ))}
            </select>
          </Field>

          <Field label="Date et heure de réception" htmlFor="lot-date">
            <input id="lot-date" type="datetime-local" value={receivedAt} onChange={(event) => setReceivedAt(event.target.value)} required className={inputClassName} />
          </Field>

          <Field label="Poids brut (kg)" htmlFor="lot-gross">
            <input id="lot-gross" type="number" min="0.01" step="0.01" value={gross} onChange={(event) => setGross(event.target.value)} required className={inputClassName} />
          </Field>

          <Field label="Tare (kg)" htmlFor="lot-tare" hint="Le poids net est calculé automatiquement.">
            <input id="lot-tare" type="number" min="0" step="0.01" value={tare} onChange={(event) => setTare(event.target.value)} className={inputClassName} />
          </Field>

          <Field label="Poids net calculé (kg)" htmlFor="lot-net">
            <input id="lot-net" value={net.toFixed(2)} readOnly className={`${inputClassName} font-mono-brand`} />
          </Field>

          <Field label="Humidité mesurée (%)" htmlFor="lot-humidity">
            <input id="lot-humidity" type="number" min="0" max="100" step="0.1" value={humidity} onChange={(event) => setHumidity(event.target.value)} required className={inputClassName} />
          </Field>

          <Field label="État visuel" htmlFor="lot-visual">
            <select id="lot-visual" value={visualQuality} onChange={(event) => {
              setVisualQuality(event.target.value);
              setStatus(event.target.value === 'refuse' ? 'refused' : 'accepted');
            }} className={selectClassName} style={selectStyle}>
              {LOT_VISUAL_QUALITIES.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </Field>

          <Field label="Statut du lot" htmlFor="lot-status">
            <select id="lot-status" value={status} onChange={(event) => setStatus(event.target.value)} className={selectClassName} style={selectStyle}>
              {LOT_STATUSES.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </Field>

          <Field label="Photo du lot (optionnel)" htmlFor="lot-photo" hint="JPEG, PNG, WebP ou GIF — 10 Mo maximum.">
            <input
              id="lot-photo"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadPhoto(file);
              }}
              className="block w-full text-sm text-ink-muted file:mr-3 file:rounded-control file:border-0 file:bg-paddy file:px-3 file:py-2 file:text-sm file:font-semibold file:text-on-paddy"
            />
            {uploading ? <p className="mt-1 text-xs text-ink-muted">Import en cours…</p> : null}
            {photoUrl ? <p className="mt-1 break-all text-xs text-paddy">Photo prête : {photoUrl}</p> : null}
          </Field>

          <div className="sm:col-span-2">
            <Field label="Observations" htmlFor="lot-notes">
              <textarea id="lot-notes" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} className={inputClassName} />
            </Field>
          </div>

          {error ? <div className="sm:col-span-2"><FormFeedback type="error" message={error} /></div> : null}
          {success ? <div className="sm:col-span-2"><FormFeedback type="success" message={success} /></div> : null}

          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button type="submit" disabled={loading || uploading || rizeries.length === 0} className={buttonClassName('primary')}>
              {loading ? 'Enregistrement…' : initial ? 'Enregistrer les modifications' : 'Enregistrer le lot'}
            </button>
            {initial ? (
              <button type="button" onClick={() => setOpen(false)} className={buttonClassName('secondary')}>
                Fermer
              </button>
            ) : null}
          </div>
        </form>
      ) : null}
    </section>
  );
}
