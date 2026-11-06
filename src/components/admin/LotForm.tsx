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
      if (!initial) {
        router.push('/admin/lots');
      }
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Enregistrement impossible.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-8">

      {rizeries.length === 0 ? (
        <FormFeedback type="error" message="Créez d'abord une rizerie dans le module Rizeries." />
      ) : null}

      {/* ── Provenance ───────────────────────────────────── */}
      <div>
        <p className="mb-4 text-[11px] font-bold uppercase tracking-widest text-ink-muted">Provenance</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Rizerie" htmlFor="lot-rizerie">
            <select id="lot-rizerie" value={rizerieId} onChange={(event) => setRizerieId(event.target.value)} required className={selectClassName} style={selectStyle}>
              {rizeries.map((rizerie) => (
                <option key={rizerie.id} value={rizerie.id}>{rizerie.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Date de réception" htmlFor="lot-date">
            <input id="lot-date" type="datetime-local" value={receivedAt} onChange={(event) => setReceivedAt(event.target.value)} required className={inputClassName} />
          </Field>
        </div>
      </div>

      {/* ── Pesée ────────────────────────────────────────── */}
      <div>
        <p className="mb-4 text-[11px] font-bold uppercase tracking-widest text-ink-muted">Pesée</p>
        <div className="grid gap-4 sm:grid-cols-3 sm:items-start">
          <Field label="Poids brut (kg)" htmlFor="lot-gross">
            <input id="lot-gross" type="number" min="0.01" step="0.01" value={gross} onChange={(event) => setGross(event.target.value)} required className={inputClassName} />
          </Field>
          <Field label="Tare (kg)" htmlFor="lot-tare">
            <input id="lot-tare" type="number" min="0" step="0.01" value={tare} onChange={(event) => setTare(event.target.value)} className={inputClassName} />
          </Field>
          {/* Poids net live */}
          <div className="grid gap-1.5">
            <label className="text-sm font-medium text-ink">Poids net</label>
            <div className="flex w-full items-center gap-2 rounded-control border border-paddy/30 bg-paddy/5 px-3 py-2.5 text-base sm:text-sm">
              <span className="font-mono-brand font-bold text-paddy-deep">{net.toFixed(2)}</span>
              <span className="text-ink-muted">kg</span>
            </div>
            <p className="text-xs text-ink-muted">Calculé automatiquement</p>
          </div>
        </div>
      </div>

      {/* ── Qualité ──────────────────────────────────────── */}
      <div>
        <p className="mb-4 text-[11px] font-bold uppercase tracking-widest text-ink-muted">Qualité</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Humidité (%)" htmlFor="lot-humidity">
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
          <Field label="Statut" htmlFor="lot-status">
            <select id="lot-status" value={status} onChange={(event) => setStatus(event.target.value)} className={selectClassName} style={selectStyle}>
              {LOT_STATUSES.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      {/* ── Photo & observations ─────────────────────────── */}
      <div>
        <p className="mb-4 text-[11px] font-bold uppercase tracking-widest text-ink-muted">Photo &amp; observations</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <label className="text-sm font-medium text-ink">Photo du lot (optionnel)</label>
            <label
              htmlFor="lot-photo"
              className="flex cursor-pointer items-center gap-3 rounded-control border border-dashed border-line bg-ground/60 px-4 py-3 text-sm text-ink-muted transition-colors hover:border-paddy/50 hover:text-paddy"
            >
              <span className="text-base">📎</span>
              <span>{uploading ? 'Import en cours…' : photoUrl ? '✓ Photo jointe' : 'Choisir une image…'}</span>
              <input
                id="lot-photo"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadPhoto(file);
                }}
              />
            </label>
            <p className="text-xs text-ink-muted">JPEG, PNG, WebP · 10 Mo max</p>
            {photoUrl ? (
              <div className="flex items-center justify-between gap-2 rounded-control border border-paddy/20 bg-paddy/5 px-3 py-2 text-xs text-paddy-deep">
                <span className="truncate">{photoUrl.split('/').pop()}</span>
                <button type="button" onClick={() => setPhotoUrl('')} className="shrink-0 text-ink-muted hover:text-danger">✕</button>
              </div>
            ) : null}
          </div>
          <Field label="Observations" htmlFor="lot-notes">
            <textarea id="lot-notes" rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} className={inputClassName} placeholder="Anomalies, conditions de transport, remarques…" />
          </Field>
        </div>
      </div>

      {error ? <FormFeedback type="error" message={error} /> : null}
      {success ? <FormFeedback type="success" message={success} /> : null}

      <div>
        <button type="submit" disabled={loading || uploading || rizeries.length === 0} className={buttonClassName('primary')}>
          {loading ? 'Enregistrement…' : initial ? 'Enregistrer les modifications' : 'Enregistrer le lot'}
        </button>
      </div>
    </form>
  );
}
