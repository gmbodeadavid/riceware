'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { buttonClassName, inputClassName, selectClassName, selectStyle } from '@/components/admin/fields';

type ProductPackOption = {
  id: string;
  label: string;
  quantity: number;
  product: { id: string; name: string };
};

export default function CreatePackLotForm({
  batchId,
  availablePieces,
  packs,
}: {
  batchId: string;
  availablePieces: number;
  packs: ProductPackOption[];
}) {
  const router = useRouter();
  const [packId, setPackId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const selectedPack = packs.find((p) => p.id === packId);
  const piecesNeeded = selectedPack ? (parseInt(quantity, 10) || 0) * selectedPack.quantity : 0;
  const maxQty = selectedPack ? Math.floor(availablePieces / selectedPack.quantity) : 0;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!packId) { setError('Choisissez un pack.'); return; }
    const qty = parseInt(quantity, 10);
    if (!qty || qty < 1) { setError('La quantité doit être positive.'); return; }
    if (piecesNeeded > availablePieces) {
      setError(`${piecesNeeded} pièces nécessaires mais seulement ${availablePieces} disponibles.`);
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch('/api/admin/pack-lots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId, packId, quantity: qty }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erreur.');
      setSuccess(`PackLot ${data.code} créé en quarantaine.`);
      setPackId('');
      setQuantity('');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
      <div className="min-w-[200px] flex-1">
        <label className="mb-1 block text-xs font-medium text-ink-muted">Pack</label>
        <select value={packId} onChange={(e) => setPackId(e.target.value)} className={selectClassName} style={selectStyle}>
          <option value="">— Choisir un pack —</option>
          {packs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.product.name} · {p.label} ({p.quantity} pcs)
            </option>
          ))}
        </select>
      </div>
      <div className="w-32">
        <label className="mb-1 block text-xs font-medium text-ink-muted">Quantité (lots)</label>
        <input
          type="number"
          min="1"
          max={maxQty || undefined}
          step="1"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder={maxQty ? `max ${maxQty}` : ''}
          className={inputClassName}
        />
      </div>
      {selectedPack && quantity ? (
        <p className="self-center text-xs text-ink-muted">
          = {piecesNeeded} pièce(s) · {availablePieces - piecesNeeded} restantes
        </p>
      ) : null}
      <div className="self-end">
        <button type="submit" disabled={loading} className={buttonClassName('primary')}>
          {loading ? 'Création…' : 'Créer le lot'}
        </button>
      </div>
      {error ? <p className="w-full text-xs text-danger">{error}</p> : null}
      {success ? <p className="w-full text-xs text-success">{success}</p> : null}
    </form>
  );
}
