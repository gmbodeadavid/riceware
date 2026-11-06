import Link from 'next/link';
import { requireAdminPage } from '@/lib/admin-guard';
import { listPackLots } from '@/lib/traceability';
import { listRizeries } from '@/lib/production/queries';
import { prisma } from '@/lib/db';
import { formatDateTime, formatNumber } from '@/lib/format';
import { PageHeader, Badge, EmptyState, Section } from '@/components/admin/ui';
import { buttonClassName, inputClassName } from '@/components/admin/fields';
import { PACK_LOT_STATUSES } from '@/lib/enums';

type PageProps = {
  searchParams: Promise<{ status?: string; packId?: string; rizerieId?: string }>;
};

export default async function PacksPage({ searchParams }: PageProps) {
  await requireAdminPage('production:view');
  const filters = await searchParams;

  const [packLots, productPacks, rizeries] = await Promise.all([
    listPackLots({
      status: filters.status || undefined,
      packId: filters.packId || undefined,
      rizerieId: filters.rizerieId || undefined,
    }),
    prisma.productPack.findMany({
      orderBy: { label: 'asc' },
      include: { product: { select: { name: true } } },
    }),
    listRizeries({ activeOnly: false }),
  ]);

  return (
    <div>
      <PageHeader
        title="Lots de packs"
        breadcrumb={[{ label: 'Tableau de bord', href: '/admin' }, { label: 'Lots de packs' }]}
      />

      <form method="get" className="mb-5 grid gap-3 rounded-panel border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted" htmlFor="pack-status">Statut</label>
          <select id="pack-status" name="status" defaultValue={filters.status ?? ''} className={inputClassName}>
            <option value="">Tous les statuts</option>
            {PACK_LOT_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted" htmlFor="pack-pack">Pack</label>
          <select id="pack-pack" name="packId" defaultValue={filters.packId ?? ''} className={inputClassName}>
            <option value="">Tous les packs</option>
            {productPacks.map((p) => (
              <option key={p.id} value={p.id}>{p.product.name} · {p.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted" htmlFor="pack-rizerie">Rizerie d'origine</label>
          <select id="pack-rizerie" name="rizerieId" defaultValue={filters.rizerieId ?? ''} className={inputClassName}>
            <option value="">Toutes les rizeries</option>
            {rizeries.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button type="submit" className={buttonClassName('primary')}>Filtrer</button>
          <Link href="/admin/packs" className={buttonClassName('secondary')}>Réinitialiser</Link>
        </div>
      </form>

      <Section title={`${packLots.length} ${packLots.length === 1 ? 'lot' : 'lots'}`}>
        {packLots.length === 0 ? (
          <EmptyState title="Aucun lot de packs" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-ground/40 text-[11px] uppercase tracking-wide text-ink-muted">
                  <th className="px-4 py-3 font-semibold">Code</th>
                  <th className="px-4 py-3 font-semibold">Pack</th>
                  <th className="px-4 py-3 font-semibold hidden md:table-cell">Batch</th>
                  <th className="px-4 py-3 font-semibold hidden lg:table-cell">Rizerie(s)</th>
                  <th className="px-4 py-3 font-semibold hidden sm:table-cell">Qté</th>
                  <th className="px-4 py-3 font-semibold">Restant</th>
                  <th className="px-4 py-3 font-semibold">Statut</th>
                  <th className="px-4 py-3 font-semibold hidden md:table-cell">Packagé le</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/50">
                {packLots.map((pl) => {
                  const statusEntry = PACK_LOT_STATUSES.find((s) => s.value === pl.status);
                  return (
                    <tr key={pl.id} className="group transition-colors hover:bg-paddy/[0.03]">
                      <td className="px-4 py-3 align-middle">
                        <Link href={`/admin/packs/${pl.id}`} className="font-mono-brand text-xs font-semibold text-paddy hover:text-paddy-deep hover:underline">
                          {pl.code}
                        </Link>
                      </td>
                      <td className="px-4 py-3 align-middle text-xs">
                        <span className="font-medium">{pl.pack.product.name}</span>
                        <span className="text-ink-muted"> · {pl.pack.label}</span>
                      </td>
                      <td className="px-4 py-3 align-middle hidden md:table-cell">
                        <Link href={`/admin/production/${pl.batch.id}`} className="font-mono-brand text-xs text-paddy hover:text-paddy-deep hover:underline">
                          {pl.batch.code}
                        </Link>
                      </td>
                      <td className="px-4 py-3 align-middle text-xs text-ink-muted hidden lg:table-cell">
                        {pl.rizeries.length > 0 ? pl.rizeries.map((r) => r.name).join(', ') : '—'}
                      </td>
                      <td className="px-4 py-3 align-middle hidden sm:table-cell font-medium">{formatNumber(pl.quantity)}</td>
                      <td className={`px-4 py-3 align-middle font-semibold ${pl.remaining === 0 ? 'text-ink-muted' : pl.remaining < 5 ? 'text-danger' : 'text-paddy-deep'}`}>
                        {formatNumber(pl.remaining)}
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <Badge tone={(statusEntry?.badge === 'default' || !statusEntry?.badge ? 'neutral' : statusEntry.badge) as 'success' | 'warning' | 'danger' | 'info' | 'neutral'}>
                          {statusEntry?.label ?? pl.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 align-middle text-xs text-ink-muted hidden md:table-cell whitespace-nowrap">{formatDateTime(pl.packedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}
