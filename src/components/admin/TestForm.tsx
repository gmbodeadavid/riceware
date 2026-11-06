'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Field, FormFeedback, buttonClassName, inputClassName, selectClassName, selectStyle } from '@/components/admin/fields';
import { TEST_RESULTS, TEST_TYPES, toNumber } from '@/lib/production/types';
import { toDateTimeInputValue } from '@/lib/format';

export default function TestForm({
  products,
  batches,
}: {
  products: Array<{ id: string; label: string }>;
  batches: Array<{ id: string; code: string }>;
}) {
  const router = useRouter();
  const [target, setTarget] = useState(products[0] ? `product:${products[0].id}` : batches[0] ? `batch:${batches[0].id}` : '');
  const [typeTest, setTypeTest] = useState('charge');
  const [result, setResult] = useState('succes');
  const [loadKg, setLoadKg] = useState('');
  const [durationMin, setDurationMin] = useState('');
  const [waterMl, setWaterMl] = useState('');
  const [waterTempC, setWaterTempC] = useState('');
  const [thickness, setThickness] = useState('');
  const [cracks, setCracks] = useState(false);
  const [bubbles, setBubbles] = useState(false);
  const [deformations, setDeformations] = useState(false);
  const [testedAt, setTestedAt] = useState(toDateTimeInputValue());
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showVisual, setShowVisual] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const [targetType, targetId] = target.split(':');

    try {
      const response = await fetch('/api/admin/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          produitFiniId: targetType === 'product' ? targetId : null,
          batchId: targetType === 'batch' ? targetId : null,
          typeTest,
          result,
          loadKg: loadKg ? toNumber(loadKg) : null,
          durationMin: durationMin ? toNumber(durationMin) : null,
          waterMl: waterMl ? toNumber(waterMl) : null,
          waterTempC: waterTempC ? toNumber(waterTempC) : null,
          thicknessAvgMm: thickness ? toNumber(thickness) : null,
          cracks: showVisual ? cracks : null,
          bubbles: showVisual ? bubbles : null,
          deformations: showVisual ? deformations : null,
          testedAt,
          notes,
        }),
      });
      const data = await response.json();
      if (response.status === 401) {
        router.push('/admin/login');
        return;
      }
      if (!response.ok) throw new Error(data.error || 'Enregistrement impossible.');

      setSuccess(`Test ${result === 'succes' ? 'réussi' : 'en échec'} enregistré.`);
      router.push('/admin/qualite');
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Enregistrement impossible.');
    } finally {
      setLoading(false);
    }
  };

  const noTargets = products.length === 0 && batches.length === 0;

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      {noTargets ? (
        <div className="sm:col-span-2">
          <FormFeedback type="error" message="Créez d'abord un batch ou un produit fini à contrôler." />
        </div>
      ) : null}

      <Field label="Élément contrôlé" htmlFor="test-target">
        <select id="test-target" value={target} onChange={(event) => setTarget(event.target.value)} required className={selectClassName} style={selectStyle}>
          {products.length ? (
            <optgroup label="Produits finis">
              {products.map((product) => (
                <option key={product.id} value={`product:${product.id}`}>{product.label}</option>
              ))}
            </optgroup>
          ) : null}
          {batches.length ? (
            <optgroup label="Batches entiers">
              {batches.map((batch) => (
                <option key={batch.id} value={`batch:${batch.id}`}>{batch.code}</option>
              ))}
            </optgroup>
          ) : null}
        </select>
      </Field>

      <Field label="Type de test" htmlFor="test-type">
        <select id="test-type" value={typeTest} onChange={(event) => {
          setTypeTest(event.target.value);
          setShowVisual(event.target.value === 'visuel');
        }} className={selectClassName} style={selectStyle}>
          {TEST_TYPES.map((type) => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>
      </Field>

      <Field label="Résultat" htmlFor="test-result">
        <select id="test-result" value={result} onChange={(event) => setResult(event.target.value)} className={selectClassName} style={selectStyle}>
          {TEST_RESULTS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </Field>

      <Field label="Date du test" htmlFor="test-date">
        <input id="test-date" type="datetime-local" value={testedAt} onChange={(event) => setTestedAt(event.target.value)} className={inputClassName} />
      </Field>

      {typeTest === 'charge' ? (
        <>
          <Field label="Poids supporté (kg)" htmlFor="test-load">
            <input id="test-load" type="number" min="0" step="0.1" value={loadKg} onChange={(event) => setLoadKg(event.target.value)} className={inputClassName} />
          </Field>
          <Field label="Durée (min)" htmlFor="test-duration">
            <input id="test-duration" type="number" min="0" step="1" value={durationMin} onChange={(event) => setDurationMin(event.target.value)} className={inputClassName} />
          </Field>
        </>
      ) : null}

      {typeTest === 'etancheite' ? (
        <>
          <Field label="Volume d'eau (mL)" htmlFor="test-water">
            <input id="test-water" type="number" min="0" step="1" value={waterMl} onChange={(event) => setWaterMl(event.target.value)} className={inputClassName} />
          </Field>
          <Field label="Durée (min)" htmlFor="test-water-duration">
            <input id="test-water-duration" type="number" min="0" step="1" value={durationMin} onChange={(event) => setDurationMin(event.target.value)} className={inputClassName} />
          </Field>
          <Field label="Température (°C)" htmlFor="test-water-temp">
            <input id="test-water-temp" type="number" min="0" step="0.1" value={waterTempC} onChange={(event) => setWaterTempC(event.target.value)} className={inputClassName} />
          </Field>
        </>
      ) : null}

      {typeTest === 'visuel' ? (
        <div className="sm:col-span-2 grid gap-2 rounded-control border border-line bg-ground/60 p-3 sm:grid-cols-3">
          {[
            { label: 'Fissures', value: cracks, set: setCracks },
            { label: 'Bulles', value: bubbles, set: setBubbles },
            { label: 'Déformations', value: deformations, set: setDeformations },
          ].map((item) => (
            <label key={item.label} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={item.value} onChange={(event) => item.set(event.target.checked)} className="size-4 accent-paddy" />
              {item.label}
            </label>
          ))}
        </div>
      ) : null}

      <Field label="Épaisseur moyenne (mm)" htmlFor="test-thickness">
        <input id="test-thickness" type="number" min="0" step="0.01" value={thickness} onChange={(event) => setThickness(event.target.value)} className={inputClassName} />
      </Field>

      <div className="sm:col-span-2">
        <Field label="Notes" htmlFor="test-notes">
          <textarea id="test-notes" rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} className={inputClassName} />
        </Field>
      </div>

      {error ? <div className="sm:col-span-2"><FormFeedback type="error" message={error} /></div> : null}
      {success ? <div className="sm:col-span-2"><FormFeedback type="success" message={success} /></div> : null}

      <div className="sm:col-span-2">
        <button type="submit" disabled={loading || noTargets || !target} className={buttonClassName('primary')}>
          {loading ? 'Enregistrement…' : 'Enregistrer le test'}
        </button>
      </div>
    </form>
  );
}
