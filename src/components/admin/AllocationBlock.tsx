'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { buttonClassName } from '@/components/admin/fields';
import { PACK_LOT_STATUSES } from '@/lib/enums';
import { Badge } from '@/components/admin/ui';

type AllocationInfo = {
  id: string;
  packLotCode: string;
  packLotId: string;
  packLotStatus: string;
  quantity: number;
  batchCode: string;
  remaining: number;
};

type LineInfo = {
  id: string;
  packNameSnapshot: string;
  quantity: number;
  productPackId: string | null;
  allocated: number;
  allocations: AllocationInfo[];
};

type FifoSuggestion = { packLotId: string; code: string; packId: string; quantity: number };

export default function AllocationBlock({
  orderId,
  lines,
}: {
  orderId: string;
  lines: LineInfo[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fifoSuggestions, setFifoSuggestions] = useState<Record<string, FifoSuggestion[]>>({});
  const [fifoLoading, setFifoLoading] = useState<Record<string, boolean>>({});

  const loadFifo = async (line: LineInfo) => {
    if (!line.productPackId) return;
    setFifoLoading((prev) => ({ ...prev, [line.id]: true }));
    setError('');
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/allocations?orderLineId=${line.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur FIFO.');
      setFifoSuggestions((prev) => ({ ...prev, [line.id]: data }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur.');
    } finally {
      setFifoLoading((prev) => ({ ...prev, [line.id]: false }));
    }
  };

  const applyFifo = async (line: LineInfo) => {
    const suggestions = fifoSuggestions[line.id];
    if (!suggestions?.length) return;
    setLoading(true);
    setError('');
    try {
      for (const s of suggestions) {
        const res = await fetch(`/api/admin/orders/${orderId}/allocations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderLineId: line.id, packLotId: s.packLotId, quantity: s.quantity }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erreur allocation.');
      }
      setFifoSuggestions((prev) => ({ ...prev, [line.id]: [] }));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur.');
    } finally {
      setLoading(false);
    }
  };

  const removeAllocation = async (allocationId: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/allocations`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allocationId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur.');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error ? <p className="text-xs text-danger">{error}</p> : null}

      {lines.map((line) => {
        const remaining = line.quantity - line.allocated;
        const suggestions = fifoSuggestions[line.id] ?? [];
        const isFifoLoading = fifoLoading[line.id] ?? false;
        const isFullyAllocated = !line.productPackId || remaining <= 0;

        return (
          <div key={line.id} className={`rounded-control border p-4 ${isFullyAllocated ? 'border-success/30 bg-success/5' : 'border-warning/30 bg-warning/5'}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-sm">{line.packNameSnapshot}</p>
                <p className="text-xs text-ink-muted">
                  Commandé : {line.quantity} · Alloué : {line.allocated}
                  {!isFullyAllocated ? <span className="ml-2 font-semibold text-warning">Reste : {remaining}</span> : <span className="ml-2 text-success">✓ Alloué</span>}
                </p>
              </div>
              {!isFullyAllocated && line.productPackId ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => loadFifo(line)}
                    disabled={isFifoLoading || loading}
                    className={buttonClassName('secondary')}
                  >
                    {isFifoLoading ? 'Chargement…' : '🔄 FIFO automatique'}
                  </button>
                </div>
              ) : null}
            </div>

            {/* Allocations existantes */}
            {line.allocations.length > 0 ? (
              <ul className="mt-3 space-y-1.5">
                {line.allocations.map((alloc) => {
                  const statusEntry = PACK_LOT_STATUSES.find((s) => s.value === alloc.packLotStatus);
                  return (
                    <li key={alloc.id} className="flex items-center justify-between rounded-control bg-ground/60 px-3 py-2 text-xs">
                      <div className="flex items-center gap-3">
                        <span className="font-mono-brand font-semibold text-paddy">{alloc.packLotCode}</span>
                        <Badge tone={(statusEntry?.badge === 'default' || !statusEntry?.badge ? 'neutral' : statusEntry.badge) as 'success' | 'warning' | 'danger' | 'info' | 'neutral'}>
                          {statusEntry?.label ?? alloc.packLotStatus}
                        </Badge>
                        <span className="text-ink-muted">batch {alloc.batchCode}</span>
                        {alloc.packLotStatus === 'rappel' ? <span className="font-semibold text-danger">⚠️ RAPPEL</span> : null}
                      </div>
                      <div className="flex items-center gap-3">
                        <span>{alloc.quantity} lot(s)</span>
                        <button
                          type="button"
                          onClick={() => removeAllocation(alloc.id)}
                          disabled={loading}
                          className="text-danger hover:underline"
                        >
                          ✕
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : null}

            {/* Suggestions FIFO */}
            {suggestions.length > 0 ? (
              <div className="mt-3 rounded-control border border-paddy/30 bg-paddy/5 p-3">
                <p className="mb-2 text-xs font-semibold text-paddy">Suggestion FIFO</p>
                <ul className="space-y-1 text-xs">
                  {suggestions.map((s) => (
                    <li key={s.packLotId} className="flex justify-between">
                      <span className="font-mono-brand">{s.code}</span>
                      <span>{s.quantity} lot(s)</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => applyFifo(line)}
                    disabled={loading}
                    className={buttonClassName('primary')}
                  >
                    {loading ? 'Allocation…' : 'Valider cette allocation FIFO'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFifoSuggestions((prev) => ({ ...prev, [line.id]: [] }))}
                    className={buttonClassName('secondary')}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : null}

            {suggestions.length === 0 && !isFullyAllocated && !isFifoLoading && fifoSuggestions[line.id] !== undefined ? (
              <p className="mt-2 text-xs text-warning">Aucun PackLot libre disponible pour ce pack.</p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
