'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { buttonClassName } from '@/components/admin/fields';

export default function ReleasePackLotButton({ packLotId, code }: { packLotId: string; code: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const release = async () => {
    if (!confirm(`Libérer le PackLot ${code} après contrôle qualité conforme ?`)) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/pack-lots/${packLotId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'release' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur.');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur.');
      setLoading(false);
    }
  };

  return (
    <span>
      <button type="button" onClick={release} disabled={loading} className={buttonClassName('primary')}>
        {loading ? 'Libération…' : '✓ Libérer (QC conforme)'}
      </button>
      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
    </span>
  );
}
