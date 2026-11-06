'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Field, FormFeedback, buttonClassName, inputClassName, selectClassName, selectStyle } from '@/components/admin/fields';
import { toDateInputValue } from '@/lib/format';

export type GoalInitial = {
  id: string;
  label: string;
  description?: string | null;
  metric: string;
  target: number;
  unit: string;
  startDate: string | Date;
  endDate?: string | Date | null;
  status: string;
};

export default function GoalForm({ initial }: { initial?: GoalInitial }) {
  const router = useRouter();
  const [label, setLabel] = useState(initial?.label ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [metric, setMetric] = useState(initial?.metric ?? 'pieces');
  const [target, setTarget] = useState(String(initial?.target ?? ''));
  const [unit, setUnit] = useState(initial?.unit ?? 'pièces');
  const [startDate, setStartDate] = useState(toDateInputValue(initial?.startDate ?? new Date()));
  const [endDate, setEndDate] = useState(initial?.endDate ? toDateInputValue(initial.endDate) : '');
  const [status, setStatus] = useState(initial?.status ?? 'active');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch(initial ? `/api/admin/objectifs/${initial.id}` : '/api/admin/objectifs', {
        method: initial ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label,
          description,
          metric,
          target: Number(target),
          unit,
          startDate,
          endDate: endDate || null,
          status,
        }),
      });
      const data = await response.json();
      if (response.status === 401) {
        router.push('/admin/login');
        return;
      }
      if (!response.ok) throw new Error(data.error || 'Enregistrement impossible.');
      setSuccess(initial ? 'Objectif mis à jour.' : 'Objectif créé.');
      router.refresh();
      if (!initial) {
        setLabel('');
        setDescription('');
        setTarget('');
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Enregistrement impossible.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <Field label="Libellé" htmlFor={`goal-label-${initial?.id ?? 'new'}`}>
            <input id={`goal-label-${initial?.id ?? 'new'}`} value={label} onChange={(event) => setLabel(event.target.value)} required className={inputClassName} />
          </Field>
          <Field label="Métrique" htmlFor={`goal-metric-${initial?.id ?? 'new'}`}>
            <select id={`goal-metric-${initial?.id ?? 'new'}`} value={metric} onChange={(event) => setMetric(event.target.value)} className={selectClassName} style={selectStyle}>
              <option value="pieces">Pièces produites</option>
              <option value="lots">Lots réceptionnés</option>
              <option value="partners">Partenaires actifs</option>
              <option value="custom">Personnalisé</option>
            </select>
          </Field>
          <Field label="Cible" htmlFor={`goal-target-${initial?.id ?? 'new'}`}>
            <input id={`goal-target-${initial?.id ?? 'new'}`} type="number" min="0.01" step="1" value={target} onChange={(event) => setTarget(event.target.value)} required className={inputClassName} />
          </Field>
          <Field label="Unité" htmlFor={`goal-unit-${initial?.id ?? 'new'}`}>
            <input id={`goal-unit-${initial?.id ?? 'new'}`} value={unit} onChange={(event) => setUnit(event.target.value)} className={inputClassName} />
          </Field>
          <Field label="Date de début" htmlFor={`goal-start-${initial?.id ?? 'new'}`}>
            <input id={`goal-start-${initial?.id ?? 'new'}`} type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className={inputClassName} />
          </Field>
          <Field label="Échéance" htmlFor={`goal-end-${initial?.id ?? 'new'}`}>
            <input id={`goal-end-${initial?.id ?? 'new'}`} type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className={inputClassName} />
          </Field>
          <Field label="Statut" htmlFor={`goal-status-${initial?.id ?? 'new'}`}>
            <select id={`goal-status-${initial?.id ?? 'new'}`} value={status} onChange={(event) => setStatus(event.target.value)} className={selectClassName} style={selectStyle}>
              <option value="active">Actif</option>
              <option value="achieved">Atteint</option>
              <option value="archived">Archivé</option>
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description" htmlFor={`goal-description-${initial?.id ?? 'new'}`}>
              <textarea id={`goal-description-${initial?.id ?? 'new'}`} rows={2} value={description} onChange={(event) => setDescription(event.target.value)} className={inputClassName} />
            </Field>
          </div>

          {error ? <div className="sm:col-span-2"><FormFeedback type="error" message={error} /></div> : null}
          {success ? <div className="sm:col-span-2"><FormFeedback type="success" message={success} /></div> : null}

          <div className="sm:col-span-2">
            <button type="submit" disabled={loading} className={buttonClassName('primary')}>
              {loading ? 'Enregistrement…' : initial ? 'Enregistrer' : 'Créer l’objectif'}
            </button>
          </div>
    </form>
  );
}
