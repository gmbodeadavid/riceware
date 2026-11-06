'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Field, FormFeedback, buttonClassName, inputClassName, selectClassName, selectStyle } from '@/components/admin/fields';
import {
  PRODUCT_TYPES,
  STOCK_ITEM_TYPES,
  STOCK_MOVEMENT_TYPES,
  stockUnitFor,
  toNumber,
} from '@/lib/production/types';
import { formatNumber } from '@/lib/format';

type StockOption = {
  id: string;
  label: string;
  quantity: number;
  unit: string;
  itemType: string;
  productType: string;
};

export function StockMovementForm({ stocks }: { stocks: StockOption[] }) {
  const router = useRouter();
  const [stockId, setStockId] = useState(stocks[0]?.id ?? '');
  const [type, setType] = useState('entree');
  const [quantity, setQuantity] = useState('');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const selected = stocks.find((stock) => stock.id === stockId);
  const resulting = useMemo(() => {
    if (!selected) return 0;
    const amount = toNumber(quantity);
    if (type === 'ajustement') return amount;
    if (type === 'entree') return selected.quantity + amount;
    return selected.quantity - amount;
  }, [selected, quantity, type]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch('/api/admin/stocks/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stockId,
          type,
          quantity: toNumber(quantity),
          reference: reference || null,
          note: note || null,
        }),
      });
      const data = await response.json();
      if (response.status === 401) {
        router.push('/admin/login');
        return;
      }
      if (!response.ok) throw new Error(data.error || 'Mouvement impossible.');
      setSuccess('Mouvement enregistré.');
      router.push('/admin/stocks');
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Mouvement impossible.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      {stocks.length === 0 ? (
        <div className="sm:col-span-2"><FormFeedback type="error" message="Créez d'abord une référence de stock." /></div>
      ) : null}

      <Field label="Stock concerné" htmlFor="movement-stock">
        <select id="movement-stock" value={stockId} onChange={(event) => setStockId(event.target.value)} className={selectClassName} style={selectStyle}>
          {stocks.map((stock) => (
            <option key={stock.id} value={stock.id}>{stock.label} — {formatNumber(stock.quantity, stock.unit)}</option>
          ))}
        </select>
      </Field>

      <Field label="Type de mouvement" htmlFor="movement-type">
        <select id="movement-type" value={type} onChange={(event) => setType(event.target.value)} className={selectClassName} style={selectStyle}>
          {STOCK_MOVEMENT_TYPES.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </Field>

      <Field
        label={type === 'ajustement' ? 'Quantité finale' : 'Quantité'}
        htmlFor="movement-quantity"
        hint={selected ? `Stock actuel : ${formatNumber(selected.quantity, selected.unit)} — après mouvement : ${formatNumber(Math.max(0, resulting), selected.unit)}` : undefined}
      >
        <input id="movement-quantity" type="number" min="0" step="0.01" value={quantity} onChange={(event) => setQuantity(event.target.value)} required className={inputClassName} />
      </Field>

      <Field label="Référence (lot, batch, bon…)" htmlFor="movement-reference">
        <input id="movement-reference" value={reference} onChange={(event) => setReference(event.target.value)} className={inputClassName} />
      </Field>

      <div className="sm:col-span-2">
        <Field label="Note" htmlFor="movement-note">
          <textarea id="movement-note" rows={2} value={note} onChange={(event) => setNote(event.target.value)} className={inputClassName} />
        </Field>
      </div>

      {resulting < 0 && type !== 'ajustement' ? (
        <div className="sm:col-span-2"><FormFeedback type="error" message="Le stock ne peut pas devenir négatif." /></div>
      ) : null}
      {error ? <div className="sm:col-span-2"><FormFeedback type="error" message={error} /></div> : null}
      {success ? <div className="sm:col-span-2"><FormFeedback type="success" message={success} /></div> : null}

      <div className="sm:col-span-2">
        <button type="submit" disabled={loading || stocks.length === 0} className={buttonClassName('primary')}>
          {loading ? 'Enregistrement…' : 'Enregistrer le mouvement'}
        </button>
      </div>
    </form>
  );
}

export function StockCreateForm() {
  const router = useRouter();
  const [itemType, setItemType] = useState('coques');
  const [productType, setProductType] = useState('assiette');
  const [label, setLabel] = useState('');
  const [quantity, setQuantity] = useState('0');
  const [minThreshold, setMinThreshold] = useState('0');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const unit = stockUnitFor(itemType);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch('/api/admin/stocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemType,
          productType: itemType === 'produit_fini' ? productType : '',
          label: label || `${STOCK_ITEM_TYPES.find((item) => item.value === itemType)?.label ?? itemType}${itemType === 'produit_fini' ? ` — ${PRODUCT_TYPES.find((product) => product.value === productType)?.label}` : ''}`,
          quantity: toNumber(quantity),
          unit,
          minThreshold: toNumber(minThreshold),
          location,
        }),
      });
      const data = await response.json();
      if (response.status === 401) {
        router.push('/admin/login');
        return;
      }
      if (!response.ok) throw new Error(data.error || 'Création impossible.');
      setSuccess('Référence de stock créée.');
      router.push('/admin/stocks');
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Création impossible.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <Field label="Type d'article" htmlFor="stock-type">
        <select id="stock-type" value={itemType} onChange={(event) => setItemType(event.target.value)} className={selectClassName} style={selectStyle}>
          {STOCK_ITEM_TYPES.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </Field>

      {itemType === 'produit_fini' ? (
        <Field label="Produit" htmlFor="stock-product">
          <select id="stock-product" value={productType} onChange={(event) => setProductType(event.target.value)} className={selectClassName} style={selectStyle}>
            {PRODUCT_TYPES.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </Field>
      ) : null}

      <Field label="Libellé" htmlFor="stock-label" hint="Laissez vide pour utiliser le libellé par défaut.">
        <input id="stock-label" value={label} onChange={(event) => setLabel(event.target.value)} className={inputClassName} />
      </Field>

      <Field label={`Quantité initiale (${unit})`} htmlFor="stock-quantity">
        <input id="stock-quantity" type="number" min="0" step="0.01" value={quantity} onChange={(event) => setQuantity(event.target.value)} className={inputClassName} />
      </Field>

      <Field label={`Seuil minimum (${unit})`} htmlFor="stock-threshold">
        <input id="stock-threshold" type="number" min="0" step="0.01" value={minThreshold} onChange={(event) => setMinThreshold(event.target.value)} className={inputClassName} />
      </Field>

      <Field label="Emplacement" htmlFor="stock-location">
        <input id="stock-location" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Entrepôt, atelier…" className={inputClassName} />
      </Field>

      {error ? <div className="sm:col-span-2"><FormFeedback type="error" message={error} /></div> : null}
      {success ? <div className="sm:col-span-2"><FormFeedback type="success" message={success} /></div> : null}

      <div className="sm:col-span-2">
        <button type="submit" disabled={loading} className={buttonClassName('primary')}>
          {loading ? 'Création…' : 'Créer la référence'}
        </button>
      </div>
    </form>
  );
}
