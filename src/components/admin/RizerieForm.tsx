'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Field, FormFeedback, buttonClassName, inputClassName, selectClassName, selectStyle } from '@/components/admin/fields';
import { CONTRACT_TYPES } from '@/lib/production/types';

export type RizerieInitial = {
  id: string;
  name: string;
  location: string;
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  contractType: string;
  monthlyVolumeKg?: number | null;
  qualityNotes?: string | null;
  notes?: string | null;
  active: boolean;
};

export default function RizerieForm({ initial }: { initial?: RizerieInitial }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initial?.name ?? '');
  const [location, setLocation] = useState(initial?.location ?? '');
  const [contactName, setContactName] = useState(initial?.contactName ?? '');
  const [contactPhone, setContactPhone] = useState(initial?.contactPhone ?? '');
  const [contactEmail, setContactEmail] = useState(initial?.contactEmail ?? '');
  const [contractType, setContractType] = useState(initial?.contractType ?? 'achat');
  const [monthlyVolume, setMonthlyVolume] = useState(initial?.monthlyVolumeKg ? String(initial.monthlyVolumeKg) : '');
  const [qualityNotes, setQualityNotes] = useState(initial?.qualityNotes ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [active, setActive] = useState(initial?.active ?? true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch(initial ? `/api/admin/rizieries/${initial.id}` : '/api/admin/rizieries', {
        method: initial ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          location,
          contactName,
          contactPhone,
          contactEmail,
          contractType,
          monthlyVolumeKg: monthlyVolume ? Number(monthlyVolume) : null,
          qualityNotes,
          notes,
          active,
        }),
      });
      const data = await response.json();
      if (response.status === 401) {
        router.push('/admin/login');
        return;
      }
      if (!response.ok) throw new Error(data.error || 'Enregistrement impossible.');
      setSuccess(initial ? 'Rizerie mise à jour.' : 'Rizerie créée.');
      router.refresh();
      if (!initial) {
        setName('');
        setLocation('');
        setContactName('');
        setContactPhone('');
        setContactEmail('');
        setMonthlyVolume('');
        setQualityNotes('');
        setNotes('');
        setOpen(false);
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Enregistrement impossible.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={initial ? '' : 'rounded-panel border border-line bg-surface'}>
      {!initial ? (
        <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left" aria-expanded={open}>
          <span className="font-display text-lg font-semibold text-ink">Ajouter une rizerie</span>
          <span className="text-sm font-semibold text-paddy">{open ? 'Réduire' : 'Ouvrir'}</span>
        </button>
      ) : null}

      {(open || initial) ? (
        <form onSubmit={submit} className={`grid gap-4 sm:grid-cols-2 ${initial ? '' : 'border-t border-line px-5 py-5'}`}>
          <Field label="Nom de la rizerie" htmlFor={`rizerie-name-${initial?.id ?? 'new'}`}>
            <input id={`rizerie-name-${initial?.id ?? 'new'}`} value={name} onChange={(event) => setName(event.target.value)} required className={inputClassName} />
          </Field>
          <Field label="Localisation" htmlFor={`rizerie-location-${initial?.id ?? 'new'}`}>
            <input id={`rizerie-location-${initial?.id ?? 'new'}`} value={location} onChange={(event) => setLocation(event.target.value)} required className={inputClassName} />
          </Field>
          <Field label="Contact" htmlFor={`rizerie-contact-${initial?.id ?? 'new'}`}>
            <input id={`rizerie-contact-${initial?.id ?? 'new'}`} value={contactName} onChange={(event) => setContactName(event.target.value)} className={inputClassName} />
          </Field>
          <Field label="Téléphone" htmlFor={`rizerie-phone-${initial?.id ?? 'new'}`}>
            <input id={`rizerie-phone-${initial?.id ?? 'new'}`} value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} className={inputClassName} />
          </Field>
          <Field label="Email" htmlFor={`rizerie-email-${initial?.id ?? 'new'}`}>
            <input id={`rizerie-email-${initial?.id ?? 'new'}`} type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} className={inputClassName} />
          </Field>
          <Field label="Type de contrat" htmlFor={`rizerie-contract-${initial?.id ?? 'new'}`}>
            <select id={`rizerie-contract-${initial?.id ?? 'new'}`} value={contractType} onChange={(event) => setContractType(event.target.value)} className={selectClassName} style={selectStyle}>
              {CONTRACT_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </Field>
          <Field label="Volume mensuel estimé (kg)" htmlFor={`rizerie-volume-${initial?.id ?? 'new'}`}>
            <input id={`rizerie-volume-${initial?.id ?? 'new'}`} type="number" min="0" step="1" value={monthlyVolume} onChange={(event) => setMonthlyVolume(event.target.value)} className={inputClassName} />
          </Field>
          <label className="flex items-center gap-2 self-end pb-3 text-sm">
            <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} className="size-4 accent-paddy" />
            Rizerie active
          </label>
          <div className="sm:col-span-2">
            <Field label="Conditions qualité" htmlFor={`rizerie-quality-${initial?.id ?? 'new'}`}>
              <textarea id={`rizerie-quality-${initial?.id ?? 'new'}`} rows={2} value={qualityNotes} onChange={(event) => setQualityNotes(event.target.value)} className={inputClassName} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Notes internes" htmlFor={`rizerie-notes-${initial?.id ?? 'new'}`}>
              <textarea id={`rizerie-notes-${initial?.id ?? 'new'}`} rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} className={inputClassName} />
            </Field>
          </div>

          {error ? <div className="sm:col-span-2"><FormFeedback type="error" message={error} /></div> : null}
          {success ? <div className="sm:col-span-2"><FormFeedback type="success" message={success} /></div> : null}

          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" disabled={loading} className={buttonClassName('primary')}>
              {loading ? 'Enregistrement…' : initial ? 'Enregistrer' : 'Créer la rizerie'}
            </button>
            {initial ? <button type="button" onClick={() => setOpen(false)} className={buttonClassName('secondary')}>Annuler</button> : null}
          </div>
        </form>
      ) : null}
    </section>
  );
}
