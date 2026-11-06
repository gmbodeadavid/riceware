'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Field, FormFeedback, buttonClassName, inputClassName, selectClassName, selectStyle } from '@/components/admin/fields';
import { computeRejectRate, computeYield, PRODUCT_TYPES, REJECT_CAUSES, toNumber } from '@/lib/production/types';
import { formatCurrency, formatPercent, toDateTimeInputValue } from '@/lib/format';

export type BatchFormInitial = {
  id: string;
  code?: string;
  lotId?: string | null;
  startedAt: string | Date;
  productType: string;
  powderKg: number;
  binderKg: number;
  mixHumidityPct: number;
  pressingTempC: number;
  pressureMpa: number;
  cycleTimeMin: number;
  piecesProduced: number;
  rejects: number;
  rejectCause?: string | null;
  observations?: string | null;
  powderCostFcfa: number;
  binderCostFcfa: number;
  laborCostFcfa: number;
  energyCostFcfa: number;
};

export type BatchDefaults = {
  powderCostPerKg: number;
  binderCostPerKg: number;
  laborCostPerBatch: number;
  energyCostPerBatch: number;
  rejectAlertPct: number;
};

type LotUsageLine = { lotId: string; kgUsed: string; motifEstimation: string };

export default function BatchForm({
  lots,
  initial,
  defaults,
  defaultLotId,
  batchId,
}: {
  lots: Array<{ id: string; code: string; netWeightKg?: number }>;
  initial?: BatchFormInitial;
  defaults: BatchDefaults;
  defaultLotId?: string;
  /** batchId — si fourni, section « Lots utilisés » (BMU) activée */
  batchId?: string;
}) {
  const router = useRouter();
  const [lotId, setLotId] = useState(initial?.lotId ?? defaultLotId ?? '');
  const [startedAt, setStartedAt] = useState(toDateTimeInputValue(initial?.startedAt ?? new Date()));
  const [productType, setProductType] = useState(initial?.productType ?? 'assiette');
  const [powderKg, setPowderKg] = useState(String(initial?.powderKg ?? ''));
  const [binderKg, setBinderKg] = useState(String(initial?.binderKg ?? ''));
  const [mixHumidity, setMixHumidity] = useState(String(initial?.mixHumidityPct ?? ''));
  const [temperature, setTemperature] = useState(String(initial?.pressingTempC ?? ''));
  const [pressure, setPressure] = useState(String(initial?.pressureMpa ?? ''));
  const [cycleTime, setCycleTime] = useState(String(initial?.cycleTimeMin ?? ''));
  const [pieces, setPieces] = useState(String(initial?.piecesProduced ?? ''));
  const [rejects, setRejects] = useState(String(initial?.rejects ?? 0));
  const [rejectCause, setRejectCause] = useState(initial?.rejectCause ?? '');
  const [observations, setObservations] = useState(initial?.observations ?? '');
  const [powderCost, setPowderCost] = useState(String(initial?.powderCostFcfa ?? ''));
  const [binderCost, setBinderCost] = useState(String(initial?.binderCostFcfa ?? ''));
  const [laborCost, setLaborCost] = useState(String(initial?.laborCostFcfa ?? defaults.laborCostPerBatch));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ─── Section lots utilisés (BMU) ─────────────────────────────────────────
  const [usageLines, setUsageLines] = useState<LotUsageLine[]>([{ lotId: '', kgUsed: '', motifEstimation: '' }]);
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageError, setUsageError] = useState('');
  const [usageSuccess, setUsageSuccess] = useState('');

  const addUsageLine = useCallback(() => {
    setUsageLines((lines) => [...lines, { lotId: '', kgUsed: '', motifEstimation: '' }]);
  }, []);

  const removeUsageLine = useCallback((index: number) => {
    setUsageLines((lines) => lines.filter((_, i) => i !== index));
  }, []);

  const updateUsageLine = useCallback((index: number, field: keyof LotUsageLine, value: string) => {
    setUsageLines((lines) => lines.map((line, i) => (i === index ? { ...line, [field]: value } : line)));
  }, []);

  const usedLotIds = useMemo(() => new Set(usageLines.map((l) => l.lotId).filter(Boolean)), [usageLines]);

  const totalKgUsed = useMemo(
    () => usageLines.reduce((sum, l) => sum + Math.max(0, toNumber(l.kgUsed)), 0),
    [usageLines],
  );

  const submitUsages = async () => {
    if (!batchId) return;
    const validLines = usageLines.filter((l) => l.lotId);
    if (validLines.length === 0) {
      setUsageError('Ajoutez au moins un lot.');
      return;
    }
    setUsageLoading(true);
    setUsageError('');
    setUsageSuccess('');
    try {
      for (const line of validLines) {
        const response = await fetch(`/api/admin/batches/${batchId}/usages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lotCoquesId: line.lotId,
            kgUsed: toNumber(line.kgUsed) || null,
            motifEstimation: line.motifEstimation || undefined,
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Erreur lors de l\'enregistrement.');
      }
      setUsageSuccess(`${validLines.length} usage(s) enregistré(s).`);
      setUsageLines([{ lotId: '', kgUsed: '', motifEstimation: '' }]);
      router.refresh();
    } catch (e) {
      setUsageError(e instanceof Error ? e.message : 'Erreur.');
    } finally {
      setUsageLoading(false);
    }
  };

  // ─── Calculs ─────────────────────────────────────────────────────────────
  const numbers = useMemo(() => {
    const piecesValue = Math.max(0, Math.trunc(toNumber(pieces)));
    const rejectsValue = Math.max(0, Math.min(piecesValue, Math.trunc(toNumber(rejects))));
    const powder = Math.max(0, toNumber(powderKg));
    const binder = Math.max(0, toNumber(binderKg));
    return {
      pieces: piecesValue,
      rejects: rejectsValue,
      yield: computeYield(piecesValue, rejectsValue),
      rejectRate: computeRejectRate(piecesValue, rejectsValue),
      powderCost: Math.max(0, toNumber(powderCost)) || powder * defaults.powderCostPerKg,
      binderCost: Math.max(0, toNumber(binderCost)) || binder * defaults.binderCostPerKg,
      totalCost:
        (Math.max(0, toNumber(powderCost)) || powder * defaults.powderCostPerKg) +
        (Math.max(0, toNumber(binderCost)) || binder * defaults.binderCostPerKg) +
        Math.max(0, toNumber(laborCost)),
    };
  }, [pieces, rejects, powderKg, binderKg, powderCost, binderCost, laborCost, defaults]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(initial ? `/api/admin/batches/${initial.id}` : '/api/admin/batches', {
        method: initial ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lotId: lotId || null,
          startedAt,
          productType,
          powderKg: toNumber(powderKg),
          binderKg: toNumber(binderKg),
          mixHumidityPct: toNumber(mixHumidity),
          pressingTempC: toNumber(temperature),
          pressureMpa: toNumber(pressure),
          cycleTimeMin: toNumber(cycleTime),
          piecesProduced: numbers.pieces,
          rejects: numbers.rejects,
          rejectCause: rejectCause || null,
          observations,
          powderCostFcfa: numbers.powderCost,
          binderCostFcfa: numbers.binderCost,
          laborCostFcfa: Math.max(0, toNumber(laborCost)),
          energyCostFcfa: 0,
        }),
      });
      const data = await response.json();
      if (response.status === 401) {
        router.push('/admin/login');
        return;
      }
      if (!response.ok) throw new Error(data.error || 'Enregistrement impossible.');

      setSuccess(initial ? 'Batch mis à jour.' : `Batch ${data.code} enregistré.`);
      if (!initial) {
        router.push('/admin/production');
      }
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Enregistrement impossible.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={submit} className="space-y-8">

        {/* ── Identification ───────────────────────────────── */}
        <div>
          <p className="mb-4 text-[11px] font-bold uppercase tracking-widest text-ink-muted">Identification</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Produit fabriqué" htmlFor="batch-product">
              <select id="batch-product" value={productType} onChange={(event) => setProductType(event.target.value)} className={selectClassName} style={selectStyle}>
                {PRODUCT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Date de début" htmlFor="batch-date">
              <input id="batch-date" type="datetime-local" value={startedAt} onChange={(event) => setStartedAt(event.target.value)} required className={inputClassName} />
            </Field>
            <Field label="Lot de coques (optionnel)" htmlFor="batch-lot">
              <select id="batch-lot" value={lotId} onChange={(event) => setLotId(event.target.value)} className={selectClassName} style={selectStyle}>
                <option value="">Non rattaché</option>
                {lots.map((lot) => (
                  <option key={lot.id} value={lot.id}>{lot.code}</option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        {/* ── Matières premières ───────────────────────────── */}
        <div>
          <p className="mb-4 text-[11px] font-bold uppercase tracking-widest text-ink-muted">Matières premières</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Poudre de coques (kg)" htmlFor="batch-powder">
              <input id="batch-powder" type="number" min="0.01" step="0.01" value={powderKg} onChange={(event) => setPowderKg(event.target.value)} required className={inputClassName} />
            </Field>
            <Field label="Liant (kg)" htmlFor="batch-binder">
              <input id="batch-binder" type="number" min="0" step="0.01" value={binderKg} onChange={(event) => setBinderKg(event.target.value)} required className={inputClassName} />
            </Field>
            <Field label="Humidité du mélange (%)" htmlFor="batch-humidity">
              <input id="batch-humidity" type="number" min="0" max="100" step="0.1" value={mixHumidity} onChange={(event) => setMixHumidity(event.target.value)} required className={inputClassName} />
            </Field>
          </div>
        </div>

        {/* ── Paramètres de pressage ───────────────────────── */}
        <div>
          <p className="mb-4 text-[11px] font-bold uppercase tracking-widest text-ink-muted">Pressage</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Température (°C)" htmlFor="batch-temp">
              <input id="batch-temp" type="number" min="0" max="400" step="0.1" value={temperature} onChange={(event) => setTemperature(event.target.value)} required className={inputClassName} />
            </Field>
            <Field label="Pression (MPa)" htmlFor="batch-pressure">
              <input id="batch-pressure" type="number" min="0" max="200" step="0.01" value={pressure} onChange={(event) => setPressure(event.target.value)} required className={inputClassName} />
            </Field>
            <Field label="Temps de cycle (min)" htmlFor="batch-cycle">
              <input id="batch-cycle" type="number" min="0.01" step="0.1" value={cycleTime} onChange={(event) => setCycleTime(event.target.value)} required className={inputClassName} />
            </Field>
          </div>
        </div>

        {/* ── Production & rebuts ──────────────────────────── */}
        <div>
          <p className="mb-4 text-[11px] font-bold uppercase tracking-widest text-ink-muted">Production &amp; rebuts</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Pièces produites" htmlFor="batch-pieces">
              <input id="batch-pieces" type="number" min="1" step="1" value={pieces} onChange={(event) => setPieces(event.target.value)} required className={inputClassName} />
            </Field>
            <Field label="Rebuts" htmlFor="batch-rejects">
              <input id="batch-rejects" type="number" min="0" step="1" max={numbers.pieces} value={rejects} onChange={(event) => setRejects(event.target.value)} className={inputClassName} />
            </Field>
            <Field label="Cause des rebuts" htmlFor="batch-cause">
              <select id="batch-cause" value={rejectCause} onChange={(event) => setRejectCause(event.target.value)} className={selectClassName} style={selectStyle}>
                <option value="">Non renseignée</option>
                {REJECT_CAUSES.map((cause) => (
                  <option key={cause.value} value={cause.value}>{cause.label}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* Live KPIs */}
          <div className="mt-4 grid gap-3 rounded-control border border-line bg-ground/60 p-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-ink-muted">Rendement</p>
              <p className="mt-1 font-display text-2xl font-bold text-paddy-deep">{formatPercent(numbers.yield)}</p>
            </div>
            <div>
              <p className="text-xs text-ink-muted">Taux de rebut</p>
              <p className={`mt-1 font-display text-2xl font-bold ${numbers.rejectRate > defaults.rejectAlertPct ? 'text-danger' : 'text-ink'}`}>
                {formatPercent(numbers.rejectRate)}
              </p>
            </div>
            <div>
              <p className="text-xs text-ink-muted">Coût / pièce valide</p>
              <p className="mt-1 font-display text-2xl font-bold text-ink">
                {formatCurrency(numbers.pieces - numbers.rejects > 0 ? numbers.totalCost / (numbers.pieces - numbers.rejects) : 0)}
              </p>
            </div>
            {numbers.rejectRate > defaults.rejectAlertPct ? (
              <div className="sm:col-span-3">
                <p className="rounded-control border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
                  Taux de rebut &gt; {defaults.rejectAlertPct} % — vérifiez les paramètres.
                </p>
              </div>
            ) : null}
          </div>
        </div>

        {/* ── Coûts ────────────────────────────────────────── */}
        <div>
          <p className="mb-4 text-[11px] font-bold uppercase tracking-widest text-ink-muted">Coûts (FCFA)</p>
          <div className="grid gap-4 sm:grid-cols-3 sm:items-start">
            <Field label="Poudre" htmlFor="batch-powder-cost" hint={`Défaut : ${defaults.powderCostPerKg} FCFA/kg`}>
              <input id="batch-powder-cost" type="number" min="0" step="1" value={powderCost} onChange={(event) => setPowderCost(event.target.value)} placeholder={String(numbers.powderCost)} className={inputClassName} />
            </Field>
            <Field label="Liant" htmlFor="batch-binder-cost" hint={`Défaut : ${defaults.binderCostPerKg} FCFA/kg`}>
              <input id="batch-binder-cost" type="number" min="0" step="1" value={binderCost} onChange={(event) => setBinderCost(event.target.value)} placeholder={String(numbers.binderCost)} className={inputClassName} />
            </Field>
            <Field label="Main-d'œuvre" htmlFor="batch-labor-cost">
              <input id="batch-labor-cost" type="number" min="0" step="1" value={laborCost} onChange={(event) => setLaborCost(event.target.value)} className={inputClassName} />
            </Field>
          </div>
        </div>

        {/* ── Observations ─────────────────────────────────── */}
        <div>
          <Field label="Observations" htmlFor="batch-observations">
            <textarea id="batch-observations" rows={3} value={observations} onChange={(event) => setObservations(event.target.value)} className={inputClassName} placeholder="Anomalies constatées, conditions particulières…" />
          </Field>
        </div>

        {error ? <FormFeedback type="error" message={error} /> : null}
        {success ? <FormFeedback type="success" message={success} /> : null}

        <div>
          <button type="submit" disabled={loading} className={buttonClassName('primary')}>
            {loading ? 'Enregistrement…' : initial ? 'Enregistrer les modifications' : 'Enregistrer le batch'}
          </button>
        </div>
      </form>

      {/* Section lots de coques utilisés (BMU) — uniquement sur un batch existant */}
      {batchId ? (
        <div className="mt-6 border-t border-line pt-6">
          <p className="mb-3 font-semibold text-ink">Lots de coques utilisés</p>
          <p className="mb-4 text-xs text-ink-muted">
            Total saisi : <strong>{totalKgUsed.toFixed(2)} kg</strong>
          </p>

          <div className="space-y-3">
            {usageLines.map((line, index) => (
              <div key={index} className="grid gap-3 rounded-control border border-line bg-ground/40 p-3 sm:grid-cols-[1fr_1fr_auto]">
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink-muted">Lot de coques</label>
                  <select
                    value={line.lotId}
                    onChange={(e) => updateUsageLine(index, 'lotId', e.target.value)}
                    className={selectClassName}
                    style={selectStyle}
                  >
                    <option value="">— Choisir un lot —</option>
                    {lots
                      .filter((lot) => !usedLotIds.has(lot.id) || lot.id === line.lotId)
                      .map((lot) => (
                        <option key={lot.id} value={lot.id}>
                          {lot.code}{lot.netWeightKg != null ? ` (${lot.netWeightKg} kg net)` : ''}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink-muted">Kg utilisés</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={line.kgUsed}
                    onChange={(e) => updateUsageLine(index, 'kgUsed', e.target.value)}
                    placeholder="kg"
                    className={inputClassName}
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => removeUsageLine(index)}
                    className={buttonClassName('danger')}
                    aria-label="Supprimer cette ligne"
                  >
                    ✕
                  </button>
                </div>
                {line.motifEstimation !== undefined && toNumber(line.kgUsed) > 0 ? null : (
                  <div className="sm:col-span-3">
                    <label className="mb-1 block text-xs font-medium text-ink-muted">Motif d'estimation</label>
                    <input
                      type="text"
                      value={line.motifEstimation}
                      onChange={(e) => updateUsageLine(index, 'motifEstimation', e.target.value)}
                      placeholder="Optionnel"
                      className={inputClassName}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={addUsageLine} className={buttonClassName('secondary')}>
              + Ajouter un lot
            </button>
            <button type="button" onClick={submitUsages} disabled={usageLoading} className={buttonClassName('primary')}>
              {usageLoading ? 'Enregistrement…' : 'Enregistrer les usages'}
            </button>
          </div>
          {usageError ? <p className="mt-2 text-xs text-danger">{usageError}</p> : null}
          {usageSuccess ? <p className="mt-2 text-xs text-success">{usageSuccess}</p> : null}
        </div>
      ) : null}
    </>
  );
}
