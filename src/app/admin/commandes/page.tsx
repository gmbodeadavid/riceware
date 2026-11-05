import Link from 'next/link';
import { requireAdminPage } from '@/lib/admin-guard';
import { can } from '@/lib/rbac';
import { getOrderStats, listOrders } from '@/lib/data/orders';
import type { OrderStatus, PaymentStatus, SalesChannel } from '@/lib/ricewareModels';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { PageHeader, StatCard, Badge, EmptyState, LinkButton, Section } from '@/components/admin/ui';
import { buttonClassName, inputClassName } from '@/components/admin/fields';
import OrderStatusSelect from '@/components/admin/OrderStatusSelect';
import DeleteButton from '@/components/admin/DeleteButton';

type PageProps = {
  searchParams: Promise<{ status?: string; paymentStatus?: string; channel?: string; q?: string }>;
};

const ORDER_STATUSES: Array<{ value: OrderStatus; label: string }> = [
  { value: 'draft', label: 'Brouillon' },
  { value: 'received', label: 'Reçue' },
  { value: 'pending_confirmation', label: 'À confirmer' },
  { value: 'confirmed', label: 'Confirmée' },
  { value: 'preparing', label: 'En préparation' },
  { value: 'shipped', label: 'Expédiée' },
  { value: 'delivered', label: 'Livrée' },
  { value: 'cancelled', label: 'Annulée' },
];

const PAYMENT_STATUSES: Array<{ value: PaymentStatus; label: string }> = [
  { value: 'pending', label: 'En attente' },
  { value: 'paid', label: 'Payé' },
  { value: 'failed', label: 'Échoué' },
  { value: 'refunded', label: 'Remboursé' },
];

const SALES_CHANNELS: Array<{ value: SalesChannel; label: string }> = [
  { value: 'site', label: 'Site web' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'phone', label: 'Téléphone' },
  { value: 'direct_sale', label: 'Vente directe' },
  { value: 'partner', label: 'Partenaire' },
];

const ORDER_STATUS_LABELS = Object.fromEntries(ORDER_STATUSES.map((item) => [item.value, item.label]));
const PAYMENT_STATUS_LABELS = Object.fromEntries(PAYMENT_STATUSES.map((item) => [item.value, item.label]));

export default async function OrdersPage({ searchParams }: PageProps) {
  const session = await requireAdminPage('orders:view');
  const filters = await searchParams;
  const canWrite = can(session.role, 'orders:write');
  const [{ orders, total }, stats] = await Promise.all([
    listOrders({
      status: filters.status as OrderStatus | undefined,
      paymentStatus: filters.paymentStatus as PaymentStatus | undefined,
      channel: filters.channel as SalesChannel | undefined,
      search: filters.q,
      limit: 200,
    }),
    getOrderStats(),
  ]);

  const exportQuery = new URLSearchParams();
  if (filters.q) exportQuery.set('q', filters.q);
  const exportBase = `/api/admin/exports/orders?${exportQuery.toString()}`;

  return (
    <div>
      <PageHeader
        title="Commandes"
        description="Demandes reçues depuis le site, WhatsApp et les ventes directes. Les prix et les livraisons sont confirmés manuellement."
        breadcrumb={[{ label: 'Tableau de bord', href: '/admin' }, { label: 'Commandes' }]}
        actions={
          <>
            <LinkButton href={`${exportBase}&format=csv`} target="_blank">CSV</LinkButton>
            <LinkButton href={`${exportBase}&format=xls`} target="_blank">Excel</LinkButton>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Commandes suivies" value={stats.total} hint={`${stats.pendingPayment} en attente de paiement`} />
        <StatCard label="À traiter" value={stats.received + stats.confirmed + stats.preparing} hint={`${stats.received} reçue(s) · ${stats.preparing} en préparation`} tone={stats.received ? 'warning' : 'default'} />
        <StatCard label="Livrées" value={stats.delivered} hint={`${stats.shipped} expédiée(s)`} tone="paddy" />
        <StatCard label="Encaissé" value={formatCurrency(stats.totalRevenuePaid)} hint={`${stats.paid} commande(s) payée(s)`} />
      </div>

      <form method="get" className="mb-5 mt-5 grid gap-3 rounded-panel border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <label className="mb-1 block text-xs font-medium text-ink-muted" htmlFor="orders-search">Recherche</label>
          <input id="orders-search" name="q" defaultValue={filters.q ?? ''} placeholder="N° de commande ou client" className={inputClassName} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted" htmlFor="orders-status">Statut</label>
          <select id="orders-status" name="status" defaultValue={filters.status ?? ''} className={inputClassName}>
            <option value="">Tous</option>
            {ORDER_STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted" htmlFor="orders-payment">Paiement</label>
          <select id="orders-payment" name="paymentStatus" defaultValue={filters.paymentStatus ?? ''} className={inputClassName}>
            <option value="">Tous</option>
            {PAYMENT_STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted" htmlFor="orders-channel">Canal</label>
          <select id="orders-channel" name="channel" defaultValue={filters.channel ?? ''} className={inputClassName}>
            <option value="">Tous</option>
            {SALES_CHANNELS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </div>
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-5">
          <button type="submit" className={buttonClassName('primary')}>Filtrer</button>
          <Link href="/admin/commandes" className={buttonClassName('secondary')}>Réinitialiser</Link>
          <span className="ml-auto self-center text-xs text-ink-muted">{orders.length} affichée(s) sur {total}</span>
        </div>
      </form>

      <Section title="Commandes" description="Mettez à jour le statut opérationnel et le paiement directement dans la liste.">
        {orders.length === 0 ? (
          <EmptyState title="Aucune commande" description="Aucune commande ne correspond aux filtres. Les demandes du site apparaissent automatiquement ici." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-ground/40 text-[11px] uppercase tracking-wide text-ink-muted">
                  <th className="px-4 py-3 font-semibold">Commande</th>
                  <th className="px-4 py-3 font-semibold hidden sm:table-cell">Date</th>
                  <th className="px-4 py-3 font-semibold">Client</th>
                  <th className="px-4 py-3 font-semibold hidden md:table-cell">Canal</th>
                  <th className="px-4 py-3 font-semibold hidden lg:table-cell">Articles</th>
                  <th className="px-4 py-3 font-semibold">Total</th>
                  <th className="px-4 py-3 font-semibold">Suivi</th>
                  <th className="px-4 py-3 font-semibold hidden sm:table-cell">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/50">
                {orders.map((order) => (
                  <tr key={order.id} className="group transition-colors hover:bg-paddy/[0.03]">
                    <td className="px-4 py-3 align-top">
                      <Link href={`/admin/commandes/${order.id}`} className="font-mono-brand text-xs font-semibold text-paddy hover:text-paddy-deep hover:underline">{order.orderNumber}</Link>
                      {order.notes ? <p className="mt-1 max-w-48 text-[11px] leading-4 text-ink-muted line-clamp-2">{order.notes}</p> : null}
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-ink-muted whitespace-nowrap hidden sm:table-cell">{formatDateTime(order.createdAt)}</td>
                    <td className="px-4 py-3 align-top">
                      <p className="font-medium">{order.customerName ?? 'Client non renseigné'}</p>
                      <p className="text-xs text-ink-muted">{order.lines.length} ligne(s)</p>
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-ink-muted hidden md:table-cell whitespace-nowrap">{SALES_CHANNELS.find((item) => item.value === order.channel)?.label ?? order.channel}</td>
                    <td className="px-4 py-3 align-top hidden lg:table-cell">
                      <ul className="space-y-0.5 text-xs">
                        {order.lines.slice(0, 3).map((line) => (
                          <li key={line.id} className="text-ink-muted">{line.quantity} × {line.packNameSnapshot}</li>
                        ))}
                        {order.lines.length > 3 ? <li className="text-ink-muted/70">+{order.lines.length - 3} autre(s)</li> : null}
                      </ul>
                    </td>
                    <td className="px-4 py-3 align-top font-semibold whitespace-nowrap">{formatCurrency(order.total.amount)}</td>
                    <td className="px-4 py-3 align-top">
                      {canWrite ? (
                        <OrderStatusSelect orderId={order.id} status={order.status} paymentStatus={order.paymentStatus} />
                      ) : (
                        <div className="flex flex-col gap-1">
                          <Badge tone={order.status === 'delivered' ? 'success' : order.status === 'cancelled' ? 'danger' : 'info'}>
                            {ORDER_STATUS_LABELS[order.status] ?? order.status}
                          </Badge>
                          <Badge tone={order.paymentStatus === 'paid' ? 'success' : order.paymentStatus === 'failed' ? 'danger' : 'warning'}>
                            {PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus}
                          </Badge>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top hidden sm:table-cell">
                      {canWrite ? (
                        <DeleteButton endpoint={`/api/admin/orders/${order.id}`} confirmation={`Supprimer la commande ${order.orderNumber} ?`} label="Suppr." />
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}
