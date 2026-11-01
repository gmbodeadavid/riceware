import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdminPage } from '@/lib/admin-guard';
import { can } from '@/lib/rbac';
import { getPackLot } from '@/lib/traceability';
import { formatDateTime, formatNumber, formatPercent } from '@/lib/format';
import { PageHeader, Badge, EmptyState, LinkButton, Section } from '@/components/admin/ui';
import { PACK_LOT_STATUSES } from '@/lib/enums';
import ReleasePackLotButton from '@/components/admin/ReleasePackLotButton';
import RecallButton from '@/components/admin/RecallButton';

type PageProps = { params: Promise<{ id: string }> };

export default async function PackLotDetailPage({ params }: PageProps) {
  const session = await requireAdminPage('production:view');
  const { id } = await params;
  const packLot = await getPackLot(id);
  if (!packLot) notFound();

  const canQualityWrite = can(session.role, 'quality:write');
  const canWrite = can(session.role, 'production:write');

  const statusEntry = PACK_LOT_STATUSES.find((s) => s.value === packLot.status);
  const totalKgUsed = packLot.batch.usages.reduce((s, u) => s + (u.kgUsed ?? 0), 0);

  return (
    <div>
      {packLot.deletedAt ? (
        <div className="mb-4 rounded-control border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          ⚠️ Ce lot de packs a été supprimé le {formatDateTime(packLot.deletedAt)}.
        </div>
      ) : null}

      {packLot.status === 'rappel' ? (
        <div className="mb-4 rounded-control border border-danger/30 bg-danger/5 px-4 py-3 text-sm font-semibold text-danger">
          🚨 Ce lot est en RAPPEL — il ne peut plus être alloué.
        </div>
      ) : null}

      <PageHeader
        title={packLot.code}
        description={`PackLot créé le ${formatDateTime(packLot.packedAt)} · ${packLot.pack.product.name} · ${packLot.pack.label}`}
        actions={
          <>
            <LinkButton href={`/tracabilite/${encodeURIComponent(packLot.code)}`} target="_blank">
              Fiche publique
            </LinkButton>
            {canQualityWrite && packLot.status === 'quarantaine' && !packLot.deletedAt ? (
              <ReleasePackLotButton packLotId={packLot.id} code={packLot.code} />
            ) : null}
            {canWrite && packLot.status !== 'rappel' && !packLot.deletedAt ? (
              <RecallButton
                endpoint={`/api/admin/pack-lots/${packLot.id}`}
                label="Marquer en rappel"
                confirmation={`Marquer le PackLot ${packLot.code} en RAPPEL ?`}
              />
            ) : null}
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-panel border border-line bg-surface p-4">
          <p className="text-xs uppercase text-ink-muted">Statut</p>
          <p className="mt-2">
            <Badge tone={(statusEntry?.badge === 'default' || !statusEntry?.badge ? 'neutral' : statusEntry.badge) as 'success' | 'warning' | 'danger' | 'info' | 'neutral'}>
              {statusEntry?.label ?? packLot.status}
            </Badge>
          </p>
        </div>
        <div className="rounded-panel border border-line bg-surface p-4">
          <p className="text-xs uppercase text-ink-muted">Quantité</p>
          <p className="mt-2 font-display text-2xl font-bold">{formatNumber(packLot.quantity)}</p>
          <p className="text-xs text-ink-muted">lots</p>
        </div>
        <div className="rounded-panel border border-line bg-surface p-4">
          <p className="text-xs uppercase text-ink-muted">Restant disponible</p>
          <p className="mt-2 font-display text-2xl font-bold">{formatNumber(packLot.remaining)}</p>
        </div>
        <div className="rounded-panel border border-line bg-surface p-4">
          <p className="text-xs uppercase text-ink-muted">Alloué</p>
          <p className="mt-2 font-display text-2xl font-bold">{formatNumber(packLot.quantity - packLot.remaining)}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Section title="Informations du lot" description="Batch source et pack.">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-ink-muted">Batch de production</dt>
              <dd className="font-medium">
                <Link href={`/admin/production/${packLot.batch.id}`} className="text-paddy hover:underline">
                  {packLot.batch.code}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-ink-muted">Pack</dt>
              <dd className="font-medium">{packLot.pack.product.name} · {packLot.pack.label} ({packLot.pack.quantity} pcs)</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Packagé le</dt>
              <dd className="font-medium">{formatDateTime(packLot.packedAt)}</dd>
            </div>
          </dl>
        </Section>

        <Section title="Origines (rizeries)" description={`${packLot.batch.usages.length} lot(s) de coques · ${totalKgUsed.toFixed(2)} kg`}>
          {packLot.batch.usages.length === 0 ? (
            <p className="text-sm text-ink-muted">Aucun usage de lot enregistré.</p>
          ) : (
            <ul className="divide-y divide-line">
              {packLot.batch.usages.map((u) => {
                const pct = totalKgUsed > 0 && u.kgUsed != null
                  ? formatPercent((u.kgUsed / totalKgUsed) * 100)
                  : null;
                return (
                  <li key={u.id} className="py-2.5 first:pt-0 last:pb-0">
                    <div className="flex justify-between text-sm">
                      <div>
                        <Link href={`/admin/lots/${u.lot.id}`} className="font-semibold text-paddy hover:underline">{u.lot.code}</Link>
                        <span className="ml-2 text-ink-muted">{u.lot.rizerie.name} · {u.lot.rizerie.location}</span>
                      </div>
                      <div className="text-right text-xs text-ink-muted">
                        {u.kgUsed != null ? `${formatNumber(u.kgUsed, 'kg')}` : 'Non renseigné'}
                        {pct ? ` (${pct})` : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>
      </div>

      <div className="mt-6">
        <Section title="Allocations" description={`${packLot.allocations.length} commande(s) allouée(s).`}>
          {packLot.allocations.length === 0 ? (
            <EmptyState title="Aucune allocation" description="Ce lot n'a pas encore été alloué à des commandes." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
                    <th className="pb-2 pr-3">Commande</th>
                    <th className="pb-2 pr-3">Client</th>
                    <th className="pb-2 pr-3">Statut</th>
                    <th className="pb-2">Qté allouée</th>
                  </tr>
                </thead>
                <tbody>
                  {packLot.allocations.map((alloc) => (
                    <tr key={alloc.id} className="border-b border-line/60 last:border-0">
                      <td className="py-2.5 pr-3">
                        <Link href={`/admin/commandes/${alloc.orderLine.order.id}`} className="font-mono-brand text-xs font-semibold text-paddy hover:underline">
                          {alloc.orderLine.order.orderNumber}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-3 text-xs">{alloc.orderLine.order.customer.fullName}</td>
                      <td className="py-2.5 pr-3">
                        <Badge tone={alloc.orderLine.order.status === 'delivered' ? 'success' : alloc.orderLine.order.status === 'cancelled' ? 'danger' : 'info'}>
                          {alloc.orderLine.order.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 font-semibold">{alloc.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}
