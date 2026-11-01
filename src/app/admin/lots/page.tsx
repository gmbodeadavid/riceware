import Link from 'next/link';
import { requireAdminPage } from '@/lib/admin-guard';
import { can } from '@/lib/rbac';
import { listLots, listRizeries } from '@/lib/production/queries';
import { labelOf, LOT_STATUSES, LOT_VISUAL_QUALITIES } from '@/lib/production/types';
import { formatDateTime, formatNumber, formatPercent } from '@/lib/format';
import { PageHeader, Badge, EmptyState, LinkButton } from '@/components/admin/ui';
import { buttonClassName, inputClassName } from '@/components/admin/fields';
import LotForm from '@/components/admin/LotForm';
import DeleteButton from '@/components/admin/DeleteButton';

type PageProps = {
  searchParams: Promise<{ q?: string; rizerieId?: string; status?: string; from?: string; to?: string }>;
};

export default async function LotsPage({ searchParams }: PageProps) {
  const session = await requireAdminPage('lots:view');
  const filters = await searchParams;
  const [lots, rizeries] = await Promise.all([
    listLots({
      search: filters.q,
      rizerieId: filters.rizerieId,
      status: filters.status,
      from: filters.from,
      to: filters.to,
    }),
    listRizeries({ activeOnly: false }),
  ]);

  const exportQuery = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) exportQuery.set(key, value);
  });
  const exportBase = `/api/admin/exports/lots?${exportQuery.toString()}`;
  const canWrite = can(session.role, 'lots:write');

  return (
    <div>
      <PageHeader
        title="Lots de coques"
        description="Traçabilité des matières premières : origine, poids, humidité, qualité visuelle et ID unique."
        actions={
          <>
            <LinkButton href={`${exportBase}&format=csv`} target="_blank">CSV</LinkButton>
            <LinkButton href={`${exportBase}&format=xls`} target="_blank">Excel</LinkButton>
          </>
        }
      />

      <form method="get" className="mb-5 grid gap-3 rounded-panel border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-6">
        <div className="lg:col-span-2">
          <label className="mb-1 block text-xs font-medium text-ink-muted" htmlFor="filter-q">Recherche</label>
          <input id="filter-q" name="q" defaultValue={filters.q ?? ''} placeholder="ID, rizerie, note…" className={inputClassName} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted" htmlFor="filter-rizerie">Rizerie</label>
          <select id="filter-rizerie" name="rizerieId" defaultValue={filters.rizerieId ?? ''} className={inputClassName}>
            <option value="">Toutes</option>
            {rizeries.map((rizerie) => <option key={rizerie.id} value={rizerie.id}>{rizerie.name}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted" htmlFor="filter-status">Statut</label>
          <select id="filter-status" name="status" defaultValue={filters.status ?? ''} className={inputClassName}>
            <option value="">Tous</option>
            {LOT_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted" htmlFor="filter-from">Du</label>
          <input id="filter-from" name="from" type="date" defaultValue={filters.from ?? ''} className={inputClassName} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted" htmlFor="filter-to">Au</label>
          <input id="filter-to" name="to" type="date" defaultValue={filters.to ?? ''} className={inputClassName} />
        </div>
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-6">
          <button type="submit" className={buttonClassName('primary')}>Filtrer</button>
          <Link href="/admin/lots" className={buttonClassName('secondary')}>Réinitialiser</Link>
          <span className="ml-auto self-center text-xs text-ink-muted">{lots.length} lot(s)</span>
        </div>
      </form>

      {canWrite ? <div className="mb-5"><LotForm rizeries={rizeries.map((rizerie) => ({ id: rizerie.id, name: rizerie.name }))} /></div> : null}

      {lots.length === 0 ? (
        <EmptyState
          title="Aucun lot trouvé"
          description={rizeries.length ? 'Ajustez les filtres ou enregistrez un premier lot de coques.' : 'Créez d’abord une rizerie, puis enregistrez un lot de coques.'}
          action={<LinkButton href="/admin/rizieries" variant="primary">Gérer les rizeries</LinkButton>}
        />
      ) : (
        <div className="overflow-x-auto rounded-panel border border-line bg-surface">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-ground/60 text-xs uppercase tracking-wide text-ink-muted">
                <th className="px-4 py-3">ID unique</th>
                <th className="px-4 py-3">Réception</th>
                <th className="px-4 py-3">Rizerie</th>
                <th className="px-4 py-3">Poids net</th>
                <th className="px-4 py-3">Humidité</th>
                <th className="px-4 py-3">État visuel</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Batches</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {lots.map((lot) => (
                <tr key={lot.id} className="border-b border-line/60 last:border-0 hover:bg-husk-soft/20">
                  <td className="px-4 py-3">
                    <Link href={`/admin/lots/${lot.id}`} className="font-mono-brand text-xs font-semibold text-paddy hover:underline">
                      {lot.code}
                    </Link>
                    {lot.photoUrl ? <p className="mt-0.5 text-[11px] text-ink-muted">Photo jointe</p> : null}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{formatDateTime(lot.receivedAt)}</td>
                  <td className="px-4 py-3">{lot.rizerie.name}</td>
                  <td className="px-4 py-3">{formatNumber(lot.netWeightKg, 'kg')}</td>
                  <td className="px-4 py-3">{formatPercent(lot.humidityPct)}</td>
                  <td className="px-4 py-3">{labelOf(LOT_VISUAL_QUALITIES, lot.visualQuality)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={lot.status === 'accepted' ? 'success' : 'danger'}>{labelOf(LOT_STATUSES, lot.status)}</Badge>
                  </td>
                  <td className="px-4 py-3">{lot._count.batches}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/lots/${lot.id}`} className="rounded-control border border-line px-2.5 py-1 text-xs font-semibold hover:border-paddy hover:text-paddy">
                        Voir
                      </Link>
                      {canWrite ? (
                        <DeleteButton endpoint={`/api/admin/lots/${lot.id}`} confirmation={`Supprimer le lot ${lot.code} ?`} />
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
