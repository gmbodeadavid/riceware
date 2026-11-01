'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Field, FormFeedback, buttonClassName, inputClassName, selectClassName, selectStyle } from '@/components/admin/fields';
import { PARTNER_TYPES } from '@/lib/production/types';

export type PartnerInitial = {
  id: string;
  name: string;
  type: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  location?: string | null;
  contractType?: string | null;
  notes?: string | null;
  active: boolean;
};

export default function PartnerForm({ initial }: { initial?: PartnerInitial }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initial?.name ?? '');
  const [type, setType] = useState(initial?.type ?? 'laboratoire');
  const [contactName, setContactName] = useState(initial?.contactName ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [location, setLocation] = useState(initial?.location ?? '');
  const [contractType, setContractType] = useState(initial?.contractType ?? '');
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
      const response = await fetch(initial ? `/api/admin/partenaires/${initial.id}` : '/api/admin/partenaires', {
        method: initial ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type, contactName, phone, email, location, contractType, notes, active }),
      });
      const data = await response.json();
      if (response.status === 401) {
        router.push('/admin/login');
        return;
      }
      if (!response.ok) throw new Error(data.error || 'Enregistrement impossible.');
      setSuccess(initial ? 'Partenaire mis à jour.' : 'Partenaire créé.');
      router.refresh();
      if (!initial) {
        setName('');
        setContactName('');
        setPhone('');
        setEmail('');
        setLocation('');
        setContractType('');
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
          <span className="font-display text-lg font-semibold text-ink">Ajouter un partenaire</span>
          <span className="text-sm font-semibold text-paddy">{open ? 'Réduire' : 'Ouvrir'}</span>
        </button>
      ) : null}

      {(open || initial) ? (
        <form onSubmit={submit} className={`grid gap-4 sm:grid-cols-2 ${initial ? '' : 'border-t border-line px-5 py-5'}`}>
          <Field label="Nom" htmlFor={`partner-name-${initial?.id ?? 'new'}`}>
            <input id={`partner-name-${initial?.id ?? 'new'}`} value={name} onChange={(event) => setName(event.target.value)} required className={inputClassName} />
          </Field>
          <Field label="Type" htmlFor={`partner-type-${initial?.id ?? 'new'}`}>
            <select id={`partner-type-${initial?.id ?? 'new'}`} value={type} onChange={(event) => setType(event.target.value)} className={selectClassName} style={selectStyle}>
              {PARTNER_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </Field>
          <Field label="Contact" htmlFor={`partner-contact-${initial?.id ?? 'new'}`}>
            <input id={`partner-contact-${initial?.id ?? 'new'}`} value={contactName} onChange={(event) => setContactName(event.target.value)} className={inputClassName} />
          </Field>
          <Field label="Téléphone" htmlFor={`partner-phone-${initial?.id ?? 'new'}`}>
            <input id={`partner-phone-${initial?.id ?? 'new'}`} value={phone} onChange={(event) => setPhone(event.target.value)} className={inputClassName} />
          </Field>
          <Field label="Email" htmlFor={`partner-email-${initial?.id ?? 'new'}`}>
            <input id={`partner-email-${initial?.id ?? 'new'}`} type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClassName} />
          </Field>
          <Field label="Localisation" htmlFor={`partner-location-${initial?.id ?? 'new'}`}>
            <input id={`partner-location-${initial?.id ?? 'new'}`} value={location} onChange={(event) => setLocation(event.target.value)} className={inputClassName} />
          </Field>
          <Field label="Contrat / accord" htmlFor={`partner-contract-${initial?.id ?? 'new'}`}>
            <input id={`partner-contract-${initial?.id ?? 'new'}`} value={contractType} onChange={(event) => setContractType(event.target.value)} placeholder="Ex. convention de test" className={inputClassName} />
          </Field>
          <label className="flex items-center gap-2 self-end pb-3 text-sm">
            <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} className="size-4 accent-paddy" />
            Partenaire actif
          </label>
          <div className="sm:col-span-2">
            <Field label="Notes" htmlFor={`partner-notes-${initial?.id ?? 'new'}`}>
              <textarea id={`partner-notes-${initial?.id ?? 'new'}`} rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} className={inputClassName} />
            </Field>
          </div>

          {error ? <div className="sm:col-span-2"><FormFeedback type="error" message={error} /></div> : null}
          {success ? <div className="sm:col-span-2"><FormFeedback type="success" message={success} /></div> : null}

          <div className="sm:col-span-2">
            <button type="submit" disabled={loading} className={buttonClassName('primary')}>
              {loading ? 'Enregistrement…' : initial ? 'Enregistrer' : 'Créer le partenaire'}
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
