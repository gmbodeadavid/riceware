'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Field, FormFeedback, buttonClassName, inputClassName, selectClassName, selectStyle } from '@/components/admin/fields';
import { PRODUCT_STATUSES, PRODUCT_TYPES, toNumber } from '@/lib/production/types';

export default function ProductForm({
  batches,
  defaultBatchId,
}: {
  batches: Array<{ id: string; code: string }>;
  defaultBatchId?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [batchId, setBatchId] = useState(defaultBatchId ?? batches[0]?.id ?? '');
  const [type, setType] = useState('assiette');
  const [weightG, setWeightG] = useState('');
  const [points, setPoints] = useState(['', '', '', '', '']);
  const [manualThickness, setManualThickness] = useState('');
  const [leakTest, setLeakTest] = useState('');
  const [loadTestKg, setLoadTestKg] = useState('');
  const [status, setStatus] = useState('valide');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const average = useMemo(() => {
    const values = points.map((point) => toNumber(point)).filter((point) => point > 0);
    if (!values.length) return 0;
    return values.reduce((total, value) => total + value, 0) / values.length;
  }, [points]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/produits-finis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId,
          type,
          weightG: toNumber(weightG),
          thicknessPoints: points.filter((point) => point.trim()),
          thicknessMm: average || toNumber(manualThickness),
          leakTest: leakTest === '' ? null : leakTest === 'oui',
          loadTestKg: loadTestKg ? toNumber(loadTestKg) : null,
          status,
          notes,
        }),
      });
      const data = await response.json();
      if (response.status === 401) {
        router.push('/admin/login');
        return;
      }
      if (!response.ok) throw new Error(data.error || 'Enregistrement impossible.');

      setSuccess('Produit fini enregistré.');
      router.refresh();
      setOpen(false);
      setWeightG('');
      setPoints(['', '', '', '', '']);
      setManualThickness('');
      setLeakTest('');
      setLoadTestKg('');
      setNotes('');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Enregistrement impossible.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-panel border border-line bg-surface">
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left" aria-expanded={open}>
        <span>
          <span className="font-display text-lg font-semibold text-ink">Enregistrer un produit fini</span>
          <span className="ml-2 text-xs text-ink-muted">Épaisseur, poids, étanchéité</span>
        </span>
        <span className="text-sm font-semibold text-paddy">{open ? 'Réduire' : 'Ouvrir'}</span>
      </button>

      {open ? (
        <form onSubmit={submit} className="grid gap-4 border-t border-line px-5 py-5 sm:grid-cols-2">
          {batches.length === 0 ? (
            <div className="sm:col-span-2">
              <FormFeedback type="error" message="Créez d’abord un batch de production." />
            </div>
          ) : null}

          <Field label="Batch" htmlFor="product-batch">
            <select id="product-batch" value={batchId} onChange={(event) => setBatchId(event.target.value)} required className={selectClassName} style={selectStyle}>
              {batches.map((batch) => (
                <option key={batch.id} value={batch.id}>{batch.code}</option>
              ))}
            </select>
          </Field>

          <Field label="Type de produit" htmlFor="product-type">
            <select id="product-type" value={type} onChange={(event) => setType(event.target.value)} className={selectClassName} style={selectStyle}>
              {PRODUCT_TYPES.map((productType) => (
                <option key={productType.value} value={productType.value}>{productType.label}</option>
              ))}
            </select>
          </Field>

          <Field label="Poids (g)" htmlFor="product-weight">
            <input id="product-weight" type="number" min="0.01" step="0.1" value={weightG} onChange={(event) => setWeightG(event.target.value)} required className={inputClassName} />
          </Field>

          <Field label="Statut" htmlFor="product-status">
            <select id="product-status" value={status} onChange={(event) => setStatus(event.target.value)} className={selectClassName} style={selectStyle}>
              {PRODUCT_STATUSES.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </Field>

          <div className="sm:col-span-2">
            <Field label="Épaisseur mesurée en 5 points (mm)" htmlFor="product-point-1" hint="La moyenne est calculée automatiquement.">
              <div className="grid grid-cols-5 gap-2">
                {points.map((point, index) => (
                  <input
                    key={index}
                    id={`product-point-${index + 1}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={point}
                    onChange={(event) => setPoints((current) => current.map((value, position) => (position === index ? event.target.value : value)))}
                    className={inputClassName}
                    aria-label={`Point ${index + 1}`}
                  />
                ))}
              </div>
            </Field>
            {average > 0 ? <p className="mt-1 text-xs text-ink-muted">Moyenne : {average.toFixed(2)} mm</p> : null}
          </div>

          {average === 0 ? (
            <Field label="Épaisseur moyenne manuelle (mm)" htmlFor="product-thickness">
              <input id="product-thickness" type="number" min="0.01" step="0.01" value={manualThickness} onChange={(event) => setManualThickness(event.target.value)} className={inputClassName} />
            </Field>
          ) : null}

          <Field label="Test d’étanchéité" htmlFor="product-leak">
            <select id="product-leak" value={leakTest} onChange={(event) => setLeakTest(event.target.value)} className={selectClassName} style={selectStyle}>
              <option value="">Non testé</option>
              <option value="oui">Réussi</option>
              <option value="non">Échec</option>
            </select>
          </Field>

          <Field label="Charge testée (kg)" htmlFor="product-load">
            <input id="product-load" type="number" min="0" step="0.1" value={loadTestKg} onChange={(event) => setLoadTestKg(event.target.value)} className={inputClassName} />
          </Field>

          <div className="sm:col-span-2">
            <Field label="Notes" htmlFor="product-notes">
              <textarea id="product-notes" rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} className={inputClassName} />
            </Field>
          </div>

          {error ? <div className="sm:col-span-2"><FormFeedback type="error" message={error} /></div> : null}
          {success ? <div className="sm:col-span-2"><FormFeedback type="success" message={success} /></div> : null}

          <div className="sm:col-span-2">
            <button type="submit" disabled={loading || batches.length === 0} className={buttonClassName('primary')}>
              {loading ? 'Enregistrement…' : 'Enregistrer le produit'}
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
