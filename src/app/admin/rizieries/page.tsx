import Link from 'next/link';
import { requireAdminPage } from '@/lib/admin-guard';
import { can } from '@/lib/rbac';
import { listRizeries } from '@/lib/production/queries';
import { CONTRACT_TYPES, labelOf } from '@/lib/production/types';
import { formatDate, formatNumber } from '@/lib/format';
import { PageHeader, Badge, EmptyState } from '@/components/admin/ui';

export default async function RizeriesPage() {
  const session = await requireAdminPage('lots:view');
  const rizeries = await listRizeries();
  const canWrite = can(session.role, 'partners:write');

  return (
    <div>
      <PageHeader
        title="Rizeries partenaires"
        breadcrumb={[{ label: 'Tableau de bord', href: '/admin' }, { label: 'Rizeries' }]}
        actions={
          canWrite ? (
            <Link
              href="/admin/rizieries/nouveau"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-control bg-paddy px-4 py-2 text-sm font-semibold text-on-paddy transition-colors hover:bg-paddy-deep"
            >
              + Ajouter une rizerie
            </Link>
          ) : null
        }
      />

      {rizeries.length === 0 ? (
        <EmptyState title="Aucune rizerie" description="Ajoutez la première rizerie pour pouvoir enregistrer des lots de coques." />
      ) : (
        <div className="overflow-x-auto rounded-panel border border-line bg-surface">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-ground/40 text-[11px] uppercase tracking-wide text-ink-muted">
                <th className="px-4 py-3 font-semibold">Rizerie</th>
                <th className="px-4 py-3 font-semibold hidden sm:table-cell">Contrat</th>
                <th className="px-4 py-3 font-semibold hidden md:table-cell">Contact</th>
                <th className="px-4 py-3 font-semibold hidden lg:table-cell">Volume / mois</th>
                <th className="px-4 py-3 font-semibold hidden lg:table-cell">Dernier lot</th>
                <th className="px-4 py-3 font-semibold">Statut</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/50">
              {rizeries.map((rizerie) => (
                <tr key={rizerie.id} className="group transition-colors hover:bg-paddy/[0.03]">
                  <td className="px-4 py-3 align-middle">
                    <p className="font-semibold text-ink">{rizerie.name}</p>
                    <p className="text-xs text-ink-muted">{rizerie.location}</p>
                  </td>
                  <td className="px-4 py-3 align-middle hidden sm:table-cell">
                    <Badge tone="info">{labelOf(CONTRACT_TYPES, rizerie.contractType)}</Badge>
                  </td>
                  <td className="px-4 py-3 align-middle text-xs text-ink-muted hidden md:table-cell">
                    <p>{rizerie.contactName ?? '—'}</p>
                    <p>{rizerie.contactPhone ?? ''}</p>
                  </td>
                  <td className="px-4 py-3 align-middle text-xs text-ink-muted hidden lg:table-cell">
                    {rizerie.monthlyVolumeKg ? formatNumber(rizerie.monthlyVolumeKg, 'kg') : '—'}
                  </td>
                  <td className="px-4 py-3 align-middle text-xs text-ink-muted hidden lg:table-cell whitespace-nowrap">
                    {rizerie.lots[0]
                      ? `${formatDate(rizerie.lots[0].receivedAt)} · ${formatNumber(rizerie.lots[0].netWeightKg, 'kg')}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <Badge tone={rizerie.active ? 'success' : 'neutral'}>
                      {rizerie.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <Link
                      href={`/admin/rizieries/${rizerie.id}`}
                      className="inline-flex items-center gap-1 rounded-control border border-line px-2.5 py-1 text-xs font-semibold text-ink transition-colors hover:border-paddy hover:text-paddy"
                    >
                      ✎ Modifier
                    </Link>
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
