import Link from 'next/link';
import { requireAdminPage } from '@/lib/admin-guard';
import { can } from '@/lib/rbac';
import { listBatches, listLots } from '@/lib/production/queries';
import {
  computeBatchCost,
  computeCostPerUnit,
  computeRejectRate,
  computeYield,
  labelOf,
  PRODUCT_TYPES,
  REJECT_CAUSES,
} from '@/lib/production/types';
import { getSettings, settingNumber } from '@/lib/production/settings';
import { formatCurrency, formatDateTime, formatPercent } from '@/lib/format';
import { PageHeader, Badge, EmptyState, LinkButton } from '@/components/admin/ui';
import { buttonClassName, inputClassName } from '@/components/admin/fields';
import BatchForm from '@/components/admin/BatchForm';
import DeleteButton from '@/components/admin/DeleteButton';

type PageProps = {
  searchParams: Promise<{ q?: string; lotId?: string; from?: string; to?: string }>;
};

export default async function ProductionPage({ searchParams }: PageProps) {
  const session = await requireAdminPage('production:view');
  const filters = await searchParams;
  const [batches, lots, settings] = await Promise.all([
    listBatches({ search: filters.q, lotId: filters.lotId, from: filters.from, to: filters.to }),
    listLots({ limit: 200 }),
    getSettings(),
  ]);

  const canWrite = can(session.role, 'production:write');
  const exportQuery = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) exportQuery.set(key, value);
  });
  const exportBase = `/api/admin/exports/batches?${exportQuery.toString()}`;
  const rejectAlertPct = settingNumber(settings, 'rejectAlertPct', 10);

  return (
    <div>
      <PageHeader
        title="Suivi de production"
        description="Batches de poudre, liant, pressage et séchage : rendement, rebuts, coûts et traçabilité."
        breadcrumb={[{ label: 'Tableau de bord', href: '/admin' }, { label: 'Production' }]}
        actions={
          <>
            <LinkButton href={`${exportBase}&format=csv`} target="_blank">CSV</LinkButton>
            <LinkButton href={`${exportBase}&format=xls`} target="_blank">Excel</LinkButton>
          </>
        }
      />

      <form method="get" className="mb-5 grid gap-3 rounded-panel border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <label className="mb-1 block text-xs font-medium text-ink-muted" htmlFor="prod-q">Recherche</label>
          <input id="prod-q" name="q" defaultValue={filters.q ?? ''} placeholder="Code batch, lot, observation…" className={inputClassName} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted" htmlFor="prod-lot">Lot</label>
          <select id="prod-lot" name="lotId" defaultValue={filters.lotId ?? ''} className={inputClassName}>
            <option value="">Tous</option>
            {lots.map((lot) => <option key={lot.id} value={lot.id}>{lot.code}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted" htmlFor="prod-from">Du</label>
          <input id="prod-from" name="from" type="date" defaultValue={filters.from ?? ''} className={inputClassName} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted" htmlFor="prod-to">Au</label>
          <input id="prod-to" name="to" type="date" defaultValue={filters.to ?? ''} className={inputClassName} />
        </div>
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-5">
          <button type="submit" className={buttonClassName('primary')}>Filtrer</button>
          <Link href="/admin/production" className={buttonClassName('secondary')}>Réinitialiser</Link>
          <span className="ml-auto self-center text-xs text-ink-muted">{batches.length} batch(es)</span>
        </div>
      </form>

      {canWrite ? (
        <div className="mb-5">
          <BatchForm
            lots={lots.map((lot) => ({ id: lot.id, code: lot.code }))}
            defaults={{
              powderCostPerKg: settingNumber(settings, 'powderCostPerKg', 50),
              binderCostPerKg: settingNumber(settings, 'binderCostPerKg', 1500),
              laborCostPerBatch: settingNumber(settings, 'laborCostPerBatch', 5000),
              energyCostPerBatch: settingNumber(settings, 'energyCostPerBatch', 2500),
              rejectAlertPct,
            }}
          />
        </div>
      ) : null}

      {batches.length === 0 ? (
        <EmptyState title="Aucun batch" description="Enregistrez un batch pour suivre le rendement, les rebuts et le coût de revient." />
      ) : (
        <div className="overflow-x-auto rounded-panel border border-line bg-surface">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-ground/40 text-[11px] uppercase tracking-wide text-ink-muted">
                <th className="px-4 py-3 font-semibold">Batch</th>
                <th className="px-4 py-3 font-semibold hidden sm:table-cell">Date</th>
                <th className="px-4 py-3 font-semibold hidden md:table-cell">Lot</th>
                <th className="px-4 py-3 font-semibold hidden sm:table-cell">Produit</th>
                <th className="px-4 py-3 font-semibold">Pièces</th>
                <th className="px-4 py-3 font-semibold hidden lg:table-cell">Rebuts</th>
                <th className="px-4 py-3 font-semibold">Rendement</th>
                <th className="px-4 py-3 font-semibold hidden lg:table-cell">Coût / pièce</th>
                <th className="px-4 py-3 font-semibold hidden xl:table-cell">Cause</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/50">
              {batches.map((batch) => {
                const rejectRate = computeRejectRate(batch.piecesProduced, batch.rejects);
                return (
                  <tr key={batch.id} className="group transition-colors hover:bg-paddy/[0.03]">
                    <td className="px-4 py-3 align-middle">
                      <Link href={`/admin/production/${batch.id}`} className="font-mono-brand text-xs font-semibold text-paddy hover:text-paddy-deep hover:underline">{batch.code}</Link>
                      {batch.operator ? <p className="mt-0.5 text-[11px] text-ink-muted">{batch.operator.name}</p> : null}
                    </td>
                    <td className="px-4 py-3 align-middle text-ink-muted text-xs hidden sm:table-cell whitespace-nowrap">{formatDateTime(batch.startedAt)}</td>
                    <td className="px-4 py-3 align-middle font-mono-brand text-xs hidden md:table-cell">{batch.lot?.code ?? '—'}</td>
                    <td className="px-4 py-3 align-middle hidden sm:table-cell">{labelOf(PRODUCT_TYPES, batch.productType)}</td>
                    <td className="px-4 py-3 align-middle font-medium">{batch.piecesProduced}</td>
                    <td className="px-4 py-3 align-middle hidden lg:table-cell">
                      <span className={rejectRate > rejectAlertPct ? 'font-semibold text-danger' : ''}>{batch.rejects}</span>
                      {rejectRate > rejectAlertPct ? <p className="text-[11px] text-danger">Alerte &gt; {rejectAlertPct} %</p> : null}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <Badge tone={rejectRate > rejectAlertPct ? 'danger' : 'success'}>{formatPercent(computeYield(batch.piecesProduced, batch.rejects))}</Badge>
                    </td>
                    <td className="px-4 py-3 align-middle hidden lg:table-cell">
                      <span className="font-medium">{formatCurrency(computeCostPerUnit(batch))}</span>
                      <p className="text-[11px] text-ink-muted">Total {formatCurrency(computeBatchCost(batch))}</p>
                    </td>
                    <td className="px-4 py-3 align-middle text-ink-muted text-xs hidden xl:table-cell">{batch.rejectCause ? labelOf(REJECT_CAUSES, batch.rejectCause) : '—'}</td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-2">
                        <Link href={`/admin/production/${batch.id}`} className="rounded-control border border-line px-2.5 py-1 text-xs font-semibold hover:border-paddy hover:text-paddy transition-colors">Voir</Link>
                        {canWrite ? <DeleteButton endpoint={`/api/admin/batches/${batch.id}`} confirmation={`Supprimer le batch ${batch.code} ? Les stocks seront corrigés.`} /> : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
