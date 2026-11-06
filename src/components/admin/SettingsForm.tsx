'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Field, FormFeedback, buttonClassName, inputClassName } from '@/components/admin/fields';
import type { AppSettings } from '@/lib/production/settings';

export default function SettingsForm({ settings }: { settings: AppSettings }) {
  const router = useRouter();
  const [values, setValues] = useState<AppSettings>(settings);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const update = (key: keyof AppSettings, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch('/api/admin/parametres', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await response.json();
      if (response.status === 401) {
        router.push('/admin/login');
        return;
      }
      if (!response.ok) throw new Error(data.error || 'Enregistrement impossible.');
      setSuccess('Paramètres enregistrés.');
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Enregistrement impossible.');
    } finally {
      setLoading(false);
    }
  };

  const sendTest = async () => {
    setTesting(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch('/api/admin/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: 'Test de notification RiceWare CI : le canal d’alerte est opérationnel.' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Test impossible.');
      setSuccess('Notification de test créée. Elle apparaît sur le tableau de bord.');
      router.refresh();
    } catch (testError) {
      setError(testError instanceof Error ? testError.message : 'Test impossible.');
    } finally {
      setTesting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* ── Entreprise ── */}
      <section className="rounded-panel border border-line bg-surface p-5 sm:p-6">
        <h2 className="mb-4 font-display text-base font-semibold text-ink">Entreprise</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom affiché" htmlFor="settings-company">
            <input id="settings-company" value={values.companyName} onChange={(event) => update('companyName', event.target.value)} className={inputClassName} />
          </Field>
          <Field label="Numéro WhatsApp d'alerte" htmlFor="settings-whatsapp">
            <input id="settings-whatsapp" value={values.whatsappNumber} onChange={(event) => update('whatsappNumber', event.target.value)} placeholder="225XXXXXXXXXX" className={inputClassName} />
          </Field>
        </div>
      </section>

      {/* ── Coûts de production ── */}
      <section className="rounded-panel border border-line bg-surface p-5 sm:p-6">
        <h2 className="mb-4 font-display text-base font-semibold text-ink">Coûts de production</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Poudre (FCFA/kg)" htmlFor="settings-powder">
            <input id="settings-powder" type="number" min="0" step="1" value={values.powderCostPerKg} onChange={(event) => update('powderCostPerKg', event.target.value)} className={inputClassName} />
          </Field>
          <Field label="Liant (FCFA/kg)" htmlFor="settings-binder">
            <input id="settings-binder" type="number" min="0" step="1" value={values.binderCostPerKg} onChange={(event) => update('binderCostPerKg', event.target.value)} className={inputClassName} />
          </Field>
          <Field label="Main-d'œuvre / batch" htmlFor="settings-labor">
            <input id="settings-labor" type="number" min="0" step="1" value={values.laborCostPerBatch} onChange={(event) => update('laborCostPerBatch', event.target.value)} className={inputClassName} />
          </Field>
          <Field label="Énergie / batch" htmlFor="settings-energy">
            <input id="settings-energy" type="number" min="0" step="1" value={values.energyCostPerBatch} onChange={(event) => update('energyCostPerBatch', event.target.value)} className={inputClassName} />
          </Field>
        </div>
      </section>

      {/* ── Seuils et alertes ── */}
      <section className="rounded-panel border border-line bg-surface p-5 sm:p-6">
        <h2 className="mb-4 font-display text-base font-semibold text-ink">Seuils d'alerte stock</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Rebut max (%)" htmlFor="settings-reject">
            <input id="settings-reject" type="number" min="0" max="100" step="0.1" value={values.rejectAlertPct} onChange={(event) => update('rejectAlertPct', event.target.value)} className={inputClassName} />
          </Field>
          <Field label="Coques min (kg)" htmlFor="settings-coques">
            <input id="settings-coques" type="number" min="0" step="1" value={values.stockCoquesMinKg} onChange={(event) => update('stockCoquesMinKg', event.target.value)} className={inputClassName} />
          </Field>
          <Field label="Poudre min (kg)" htmlFor="settings-powder-min">
            <input id="settings-powder-min" type="number" min="0" step="1" value={values.stockPoudreMinKg} onChange={(event) => update('stockPoudreMinKg', event.target.value)} className={inputClassName} />
          </Field>
          <Field label="Liant min (kg)" htmlFor="settings-binder-min">
            <input id="settings-binder-min" type="number" min="0" step="1" value={values.stockLiantMinKg} onChange={(event) => update('stockLiantMinKg', event.target.value)} className={inputClassName} />
          </Field>
        </div>
      </section>

      {/* ── Objectif Greenpreneur ── */}
      <section className="rounded-panel border border-line bg-surface p-5 sm:p-6">
        <h2 className="mb-4 font-display text-base font-semibold text-ink">Objectif Greenpreneur</h2>
        <div className="flex items-center gap-4">
          <div className="w-56 shrink-0">
            <Field label="Cible cumulée (pièces)" htmlFor="settings-target" hint="Utilisée si aucun objectif actif n'est défini.">
              <input id="settings-target" type="number" min="1" step="1" value={values.greenpreneurTargetPieces} onChange={(event) => update('greenpreneurTargetPieces', event.target.value)} className={inputClassName} />
            </Field>
          </div>
          <button
            type="button"
            onClick={() => void sendTest()}
            disabled={testing}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-control bg-husk px-4 py-2 text-sm font-semibold text-husk-text transition-colors hover:bg-husk-deep hover:text-husk-text disabled:opacity-60 shrink-0"
          >
            {testing ? 'Envoi…' : 'Tester le canal d\'alerte'}
          </button>
        </div>
      </section>

      {/* ── Feedback + actions ── */}
      {error ? <FormFeedback type="error" message={error} /> : null}
      {success ? <FormFeedback type="success" message={success} /> : null}

      <div>
        <button type="submit" disabled={loading} className={buttonClassName('primary')}>
          {loading ? 'Enregistrement…' : 'Enregistrer les paramètres'}
        </button>
      </div>
    </form>
  );
}
