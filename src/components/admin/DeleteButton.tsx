'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DeleteButton({
  endpoint,
  label = 'Supprimer',
  confirmation,
  redirectTo,
  compact = true,
}: {
  endpoint: string;
  label?: string;
  confirmation: string;
  redirectTo?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const remove = async () => {
    if (!window.confirm(confirmation)) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(endpoint, { method: 'DELETE' });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        router.push('/admin/login');
        return;
      }
      if (!response.ok) throw new Error(data.error || 'Suppression impossible.');
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Suppression impossible.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={() => void remove()}
        disabled={busy}
        className={compact
          ? 'rounded-control border border-danger/30 px-2.5 py-1 text-xs font-semibold text-danger hover:bg-danger/5 disabled:opacity-50'
          : 'rounded-control border border-danger/30 px-4 py-2 text-sm font-semibold text-danger hover:bg-danger/5 disabled:opacity-50'}
      >
        {busy ? '…' : label}
      </button>
      {error ? <span className="max-w-xs text-xs text-danger">{error}</span> : null}
    </span>
  );
}
