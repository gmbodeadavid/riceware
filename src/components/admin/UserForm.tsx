'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Field, FormFeedback, buttonClassName, inputClassName, selectClassName, selectStyle } from '@/components/admin/fields';
import { ROLE_OPTIONS } from '@/lib/rbac';

export type UserInitial = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
};

export default function UserForm({ initial }: { initial?: UserInitial }) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(initial?.role ?? 'reader');
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
      const response = await fetch(initial ? `/api/admin/utilisateurs/${initial.id}` : '/api/admin/utilisateurs', {
        method: initial ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password: password || undefined, role, active }),
      });
      const data = await response.json();
      if (response.status === 401) {
        router.push('/admin/login');
        return;
      }
      if (!response.ok) throw new Error(data.error || 'Enregistrement impossible.');
      setSuccess(initial ? 'Compte mis à jour.' : 'Compte créé.');
      if (initial) {
        setPassword('');
        router.refresh();
      } else {
        // Après création, retour à la liste
        router.push('/admin/utilisateurs');
        router.refresh();
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Enregistrement impossible.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <Field label="Nom complet" htmlFor={`user-name-${initial?.id ?? 'new'}`}>
        <input id={`user-name-${initial?.id ?? 'new'}`} value={name} onChange={(event) => setName(event.target.value)} required className={inputClassName} />
      </Field>
      <Field label="Email" htmlFor={`user-email-${initial?.id ?? 'new'}`}>
        <input id={`user-email-${initial?.id ?? 'new'}`} type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className={inputClassName} />
      </Field>
      <Field label={initial ? 'Nouveau mot de passe (optionnel)' : 'Mot de passe'} htmlFor={`user-password-${initial?.id ?? 'new'}`} hint="8 caractères minimum.">
        <input id={`user-password-${initial?.id ?? 'new'}`} type="password" value={password} onChange={(event) => setPassword(event.target.value)} required={!initial} minLength={8} className={inputClassName} />
      </Field>
      <Field label="Rôle" htmlFor={`user-role-${initial?.id ?? 'new'}`} hint={ROLE_OPTIONS.find((option) => option.value === role)?.description}>
        <select id={`user-role-${initial?.id ?? 'new'}`} value={role} onChange={(event) => setRole(event.target.value)} className={selectClassName} style={selectStyle}>
          {ROLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </Field>
      <label className="flex items-center gap-2 self-end pb-3 text-sm">
        <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} className="size-4 accent-paddy" />
        Compte actif
      </label>

      {error ? <div className="sm:col-span-2"><FormFeedback type="error" message={error} /></div> : null}
      {success ? <div className="sm:col-span-2"><FormFeedback type="success" message={success} /></div> : null}

      <div className="sm:col-span-2">
        <button type="submit" disabled={loading} className={buttonClassName('primary')}>
          {loading ? 'Enregistrement…' : initial ? 'Enregistrer' : 'Créer le compte'}
        </button>
      </div>
    </form>
  );
}
