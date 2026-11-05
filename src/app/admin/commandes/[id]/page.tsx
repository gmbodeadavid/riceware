import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdminPage } from '@/lib/admin-guard';
import { can } from '@/lib/rbac';
import { getOrderWithAllocations } from '@/lib/production/queries';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { PageHeader, Badge, EmptyState, Section, LinkButton } from '@/components/admin/ui';
import { ORDER_STATUSES, PAYMENT_STATUSES, PACK_LOT_STATUSES } from '@/lib/enums';
import AllocationBlock from '@/components/admin/AllocationBlock';

type PageProps = { params: Promise<{ id: string }> };

const labelOf = (list: readonly { value: string; label: string }[], value: string) =>
  list.find((item) => item.value === value)?.label ?? value;

export default async function OrderDetailPage({ params }: PageProps) {
  const session = await requireAdminPage('orders:view');
  const { id } = await params;
  const order = await getOrderWithAllocations(id);
  if (!order) notFound();

  const canWrite = can(session.role, 'orders:write');
  const canStocksWrite = can(session.role, 'stocks:write');
  const canAllocate = canWrite && canStocksWrite;

  // Calculer l'état d'allocation par ligne
  const linesWithAlloc = order.lines.map((line) => {
    const allocated = line.allocations.reduce((s, a) => s + a.quantity, 0);
    // Une ligne SANS productPackId ne peut pas être tracée — elle est "hors-traçabilité".
    // On la marque isFullyAllocated=true pour ne pas bloquer, mais hasNoPackLink=true
    // pour afficher un avertissement explicite.
    const hasNoPackLink = !line.productPackId;
    const isFullyAllocated = hasNoPackLink || allocated >= line.quantity;
    return { ...line, allocated, isFullyAllocated, hasNoPackLink };
  });

  const allAllocated = linesWithAlloc.every((l) => l.isFullyAllocated);

  return (
    <div>
      <PageHeader
        title={order.orderNumber}
        description={`${order.customer.fullName} · ${labelOf(ORDER_STATUSES, order.status)} · ${formatDateTime(order.createdAt)}`}
        breadcrumb={[
          { label: 'Tableau de bord', href: '/admin' },
          { label: 'Commandes', href: '/admin/commandes' },
          { label: order.orderNumber },
        ]}
        actions={
          <LinkButton href="/admin/commandes">← Retour aux commandes</LinkButton>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-panel border border-line bg-surface p-4">
          <p className="text-xs uppercase text-ink-muted">Statut</p>
          <p className="mt-2">
            <Badge tone={order.status === 'delivered' ? 'success' : order.status === 'cancelled' ? 'danger' : 'info'}>
              {labelOf(ORDER_STATUSES, order.status)}
            </Badge>
          </p>
        </div>
        <div className="rounded-panel border border-line bg-surface p-4">
          <p className="text-xs uppercase text-ink-muted">Paiement</p>
          <p className="mt-2">
            <Badge tone={order.paymentStatus === 'paid' ? 'success' : order.paymentStatus === 'failed' ? 'danger' : 'warning'}>
              {labelOf(PAYMENT_STATUSES, order.paymentStatus)}
            </Badge>
          </p>
        </div>
        <div className="rounded-panel border border-line bg-surface p-4">
          <p className="text-xs uppercase text-ink-muted">Total</p>
          <p className="mt-2 font-display text-xl font-bold">{formatCurrency(order.totalAmount)}</p>
        </div>
        <div className="rounded-panel border border-line bg-surface p-4">
          <p className="text-xs uppercase text-ink-muted">Allocation</p>
          <p className="mt-2">
            <Badge tone={allAllocated ? 'success' : 'warning'}>
              {allAllocated ? 'Entièrement allouée' : 'Incomplète'}
            </Badge>
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Section title="Client" description="Coordonnées du client et adresse de livraison.">
          <dl className="grid gap-3 text-sm">
            <div><dt className="text-ink-muted">Nom</dt><dd className="font-medium">{order.customer.fullName}</dd></div>
            <div><dt className="text-ink-muted">Téléphone</dt><dd className="font-medium">{order.customer.phone}</dd></div>
            {order.customer.email ? <div><dt className="text-ink-muted">Email</dt><dd className="font-medium">{order.customer.email}</dd></div> : null}
            <div><dt className="text-ink-muted">Ville</dt><dd className="font-medium">{order.deliveryAddress.city}{order.deliveryAddress.district ? ` · ${order.deliveryAddress.district}` : ''}</dd></div>
            {order.deliveryAddress.details ? <div><dt className="text-ink-muted">Adresse</dt><dd className="font-medium">{order.deliveryAddress.details}</dd></div> : null}
          </dl>
        </Section>

        <Section title="Lignes de commande" description={`${order.lines.length} ligne(s) · ${formatCurrency(order.totalAmount)}`}>
          {order.lines.length === 0 ? (
            <EmptyState title="Aucune ligne" description="Cette commande est vide." />
          ) : (
            <ul className="divide-y divide-line">
              {order.lines.map((line) => (
                <li key={line.id} className="py-2.5 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{line.packNameSnapshot}</p>
                      <p className="text-xs text-ink-muted">{line.quantity} × {formatCurrency(line.unitPriceAmount)}</p>
                    </div>
                    <p className="font-semibold text-sm">{formatCurrency(line.lineTotalAmount)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      {/* ─── Avertissement lignes hors-traçabilité ─── */}
      {linesWithAlloc.some((l) => l.hasNoPackLink) && (
        <div className="mt-4 rounded-control border border-warning bg-warning/10 p-4 text-sm">
          <p className="font-semibold text-ink">⚠️ Lignes hors traçabilité</p>
          <p className="mt-1 text-ink-muted">
            Cette commande contient {linesWithAlloc.filter((l) => l.hasNoPackLink).length} ligne(s) sans
            lien vers un pack produit (<code>productPackId</code> absent). Ces lignes ne peuvent pas
            être allouées à un PackLot de production. La traçabilité lot → commande est incomplète
            pour ces articles.
          </p>
          <ul className="mt-2 list-disc list-inside text-ink-muted">
            {linesWithAlloc.filter((l) => l.hasNoPackLink).map((l) => (
              <li key={l.id}>{l.packNameSnapshot} — {l.quantity} unité(s)</li>
            ))}
          </ul>
        </div>
      )}

      {/* ─── Bloc d'allocation ─── */}
      <div className="mt-6">
        <Section
          title="Lots alloués"
          description={`Allocations des PackLots aux lignes de commande.${!allAllocated ? ' ⚠️ Allocation incomplète — expédition bloquée.' : ''}`}
        >
          {canAllocate && !['delivered', 'cancelled'].includes(order.status) ? (
            <AllocationBlock
              orderId={order.id}
              lines={linesWithAlloc.map((line) => ({
                id: line.id,
                packNameSnapshot: line.packNameSnapshot,
                quantity: line.quantity,
                productPackId: line.productPackId,
                allocated: line.allocated,
                allocations: line.allocations.map((a) => ({
                  id: a.id,
                  packLotCode: a.packLot.code,
                  packLotId: a.packLot.id,
                  packLotStatus: a.packLot.status,
                  quantity: a.quantity,
                  batchCode: a.packLot.batch.code,
                  remaining: a.packLot.quantity - a.packLot.allocations.reduce((s, al) => s + al.quantity, 0),
                })),
              }))}
            />
          ) : (
            linesWithAlloc.every((l) => l.allocations.length === 0) ? (
              <EmptyState title="Aucune allocation" description="Aucun lot de packs alloué à cette commande." />
            ) : (
              <ul className="divide-y divide-line">
                {linesWithAlloc.map((line) => (
                  line.allocations.length > 0 ? (
                    <li key={line.id} className="py-3 first:pt-0 last:pb-0">
                      <p className="text-sm font-semibold">{line.packNameSnapshot}</p>
                      <ul className="mt-1 space-y-1">
                        {line.allocations.map((a) => {
                          const statusEntry = PACK_LOT_STATUSES.find((s) => s.value === a.packLot.status);
                          return (
                            <li key={a.id} className="flex items-center gap-3 text-xs text-ink-muted">
                              <span className="font-mono-brand text-paddy">{a.packLot.code}</span>
                              <Badge tone={(statusEntry?.badge === 'default' || !statusEntry?.badge ? 'neutral' : statusEntry.badge) as 'success' | 'warning' | 'danger' | 'info' | 'neutral'}>{statusEntry?.label ?? a.packLot.status}</Badge>
                              <span>· {a.quantity} alloué(s)</span>
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  ) : null
                ))}
              </ul>
            )
          )}
        </Section>
      </div>

      {order.notes ? (
        <div className="mt-4 rounded-control border border-line bg-surface p-4 text-sm text-ink-muted">
          <p className="font-semibold text-ink">Notes</p>
          <p className="mt-1">{order.notes}</p>
        </div>
      ) : null}
    </div>
  );
}
