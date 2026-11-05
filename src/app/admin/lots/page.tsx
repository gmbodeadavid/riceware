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
        breadcrumb={[{ label: 'Tableau de bord', href: '/admin' }, { label: 'Lots de coques' }]}
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
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-ground/40 text-[11px] uppercase tracking-wide text-ink-muted">
                  <th className="px-4 py-3 font-semibold">ID unique</th>
                  <th className="px-4 py-3 font-semibold hidden sm:table-cell">Réception</th>
                  <th className="px-4 py-3 font-semibold">Rizerie</th>
                  <th className="px-4 py-3 font-semibold hidden md:table-cell">Poids net</th>
                  <th className="px-4 py-3 font-semibold hidden lg:table-cell">Humidité</th>
                  <th className="px-4 py-3 font-semibold hidden lg:table-cell">État visuel</th>
                  <th className="px-4 py-3 font-semibold">Statut</th>
                  <th className="px-4 py-3 font-semibold hidden xl:table-cell">Batches</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/50">
                {lots.map((lot) => (
                  <tr key={lot.id} className="group transition-colors hover:bg-paddy/[0.03]">
                    <td className="px-4 py-3 align-middle">
                      <Link href={`/admin/lots/${lot.id}`} className="font-mono-brand text-xs font-semibold text-paddy hover:text-paddy-deep hover:underline">
                        {lot.code}
                      </Link>
                      {lot.photoUrl ? <p className="mt-0.5 text-[11px] text-ink-muted">Photo jointe</p> : null}
                    </td>
                    <td className="px-4 py-3 align-middle text-ink-muted text-xs hidden sm:table-cell whitespace-nowrap">{formatDateTime(lot.receivedAt)}</td>
                    <td className="px-4 py-3 align-middle text-sm">{lot.rizerie.name}</td>
                    <td className="px-4 py-3 align-middle font-medium hidden md:table-cell whitespace-nowrap">{formatNumber(lot.netWeightKg, 'kg')}</td>
                    <td className="px-4 py-3 align-middle text-ink-muted hidden lg:table-cell">{formatPercent(lot.humidityPct)}</td>
                    <td className="px-4 py-3 align-middle text-ink-muted hidden lg:table-cell">{labelOf(LOT_VISUAL_QUALITIES, lot.visualQuality)}</td>
                    <td className="px-4 py-3 align-middle">
                      <Badge tone={lot.status === 'accepted' ? 'success' : 'danger'}>{labelOf(LOT_STATUSES, lot.status)}</Badge>
                    </td>
                    <td className="px-4 py-3 align-middle text-ink-muted hidden xl:table-cell">{lot._count.batches}</td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-2">
                        <Link href={`/admin/lots/${lot.id}`} className="rounded-control border border-line px-2.5 py-1 text-xs font-semibold hover:border-paddy hover:text-paddy transition-colors">
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
