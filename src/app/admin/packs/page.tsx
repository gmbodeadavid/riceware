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
        description="Lots de conditionnement créés depuis les batches de production."
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

      <Section title={`${packLots.length} lot(s) de packs`} description="Stock restant = quantité − allocations actives.">
        {packLots.length === 0 ? (
          <EmptyState title="Aucun lot de packs" description="Créez des lots de packs depuis la fiche d'un batch de production." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
                  <th className="pb-2 pr-3">Code</th>
                  <th className="pb-2 pr-3">Pack</th>
                  <th className="pb-2 pr-3">Batch</th>
                  <th className="pb-2 pr-3">Rizerie(s)</th>
                  <th className="pb-2 pr-3">Qté</th>
                  <th className="pb-2 pr-3">Restant</th>
                  <th className="pb-2 pr-3">Statut</th>
                  <th className="pb-2">Packagé le</th>
                </tr>
              </thead>
              <tbody>
                {packLots.map((pl) => {
                  const statusEntry = PACK_LOT_STATUSES.find((s) => s.value === pl.status);
                  return (
                    <tr key={pl.id} className="border-b border-line/60 last:border-0">
                      <td className="py-2.5 pr-3">
                        <Link href={`/admin/packs/${pl.id}`} className="font-mono-brand text-xs font-semibold text-paddy hover:underline">
                          {pl.code}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-3 text-xs">
                        {pl.pack.product.name} · {pl.pack.label}
                      </td>
                      <td className="py-2.5 pr-3">
                        <Link href={`/admin/production/${pl.batch.id}`} className="font-mono-brand text-xs text-paddy hover:underline">
                          {pl.batch.code}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-3 text-xs text-ink-muted">
                        {pl.rizeries.length > 0 ? pl.rizeries.map((r) => r.name).join(', ') : '—'}
                      </td>
                      <td className="py-2.5 pr-3">{formatNumber(pl.quantity)}</td>
                      <td className={`py-2.5 pr-3 font-semibold ${pl.remaining === 0 ? 'text-ink-muted' : pl.remaining < 5 ? 'text-warning' : ''}`}>
                        {formatNumber(pl.remaining)}
                      </td>
                      <td className="py-2.5 pr-3">
                        <Badge tone={(statusEntry?.badge === 'default' || !statusEntry?.badge ? 'neutral' : statusEntry.badge) as 'success' | 'warning' | 'danger' | 'info' | 'neutral'}>
                          {statusEntry?.label ?? pl.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 text-xs text-ink-muted">{formatDateTime(pl.packedAt)}</td>
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
