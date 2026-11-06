import Link from 'next/link';
import { requireAdminPage } from '@/lib/admin-guard';
import { can } from '@/lib/rbac';
import { getOrderStats, listOrders } from '@/lib/data/orders';
import type { OrderStatus, PaymentStatus, SalesChannel } from '@/lib/ricewareModels';
import { formatCurrency, formatDate } from '@/lib/format';
import { PageHeader, StatCard, Badge, EmptyState, LinkButton, Section } from '@/components/admin/ui';
import { buttonClassName, inputClassName, selectClassName, selectStyle } from '@/components/admin/fields';
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

      <form method="get" className="mb-5 mt-5 grid gap-3 rounded-panel border border-line bg-surface p-4 sm:grid-cols-3 lg:flex lg:flex-wrap lg:items-end">
        <div className="sm:col-span-1 lg:w-44">
          <label className="mb-1 block text-xs font-medium text-ink-muted" htmlFor="orders-search">Recherche</label>
          <input id="orders-search" name="q" defaultValue={filters.q ?? ''} placeholder="N° de commande ou client…" className="block w-full rounded-control border border-line bg-ground px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-paddy focus:outline-none focus:ring-1 focus:ring-paddy" />
        </div>
        <div className="lg:w-32">
          <label className="mb-1 block text-xs font-medium text-ink-muted" htmlFor="orders-status">Statut</label>
          <select id="orders-status" name="status" defaultValue={filters.status ?? ''} className="block w-full rounded-control border border-line bg-ground px-3 py-2 text-sm text-ink appearance-none cursor-pointer focus:border-paddy focus:outline-none focus:ring-1 focus:ring-paddy pr-8" style={selectStyle}>
            <option value="">Tous</option>
            {ORDER_STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </div>
        <div className="lg:w-32">
          <label className="mb-1 block text-xs font-medium text-ink-muted" htmlFor="orders-payment">Paiement</label>
          <select id="orders-payment" name="paymentStatus" defaultValue={filters.paymentStatus ?? ''} className="block w-full rounded-control border border-line bg-ground px-3 py-2 text-sm text-ink appearance-none cursor-pointer focus:border-paddy focus:outline-none focus:ring-1 focus:ring-paddy pr-8" style={selectStyle}>
            <option value="">Tous</option>
            {PAYMENT_STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </div>
        <div className="lg:w-32">
          <label className="mb-1 block text-xs font-medium text-ink-muted" htmlFor="orders-channel">Canal</label>
          <select id="orders-channel" name="channel" defaultValue={filters.channel ?? ''} className="block w-full rounded-control border border-line bg-ground px-3 py-2 text-sm text-ink appearance-none cursor-pointer focus:border-paddy focus:outline-none focus:ring-1 focus:ring-paddy pr-8" style={selectStyle}>
            <option value="">Tous</option>
            {SALES_CHANNELS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </div>
        <div className="flex items-end gap-2 sm:col-span-3 lg:flex-1">
          <button type="submit" className="inline-flex min-h-9 items-center justify-center rounded-control bg-paddy px-4 py-2 text-sm font-semibold text-on-paddy transition-colors hover:bg-paddy-deep">Filtrer</button>
          <Link href="/admin/commandes" className="inline-flex min-h-9 items-center justify-center rounded-control border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-paddy hover:text-paddy">Réinitialiser</Link>
          <span className="ml-auto self-center text-xs text-ink-muted">{orders.length} / {total}</span>
        </div>
      </form>

      <Section title="Commandes">
        {orders.length === 0 ? (
          <EmptyState title="Aucune commande" description="Aucune commande ne correspond aux filtres. Les demandes du site apparaissent automatiquement ici." />
        ) : (
          <div>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-ground/40 text-[11px] uppercase tracking-wide text-ink-muted">
                  <th className="px-3 py-2 font-semibold">N° commande</th>
                  <th className="px-3 py-2 font-semibold">Date</th>
                  <th className="px-3 py-2 font-semibold">Client</th>
                  <th className="px-3 py-2 font-semibold">Total</th>
                  <th className="px-3 py-2 font-semibold">Statut</th>
                  <th className="px-3 py-2 font-semibold">Paiement</th>
                  <th className="px-3 py-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/50">
                {orders.map((order) => (
                  <tr key={order.id} className="group transition-colors hover:bg-paddy/[0.03]">
                    <td className="px-3 py-2 align-middle">
                      <Link href={`/admin/commandes/${order.id}`} className="font-mono-brand text-[11px] font-semibold text-paddy hover:text-paddy-deep hover:underline whitespace-nowrap">
                        {order.orderNumber.slice(0, 18)}…
                      </Link>
                    </td>
                    <td className="px-3 py-2 align-middle text-xs text-ink-muted whitespace-nowrap">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-3 py-2 align-middle w-28">
                      <p className="text-xs font-medium truncate max-w-[110px]">{order.customerName ?? '—'}</p>
                    </td>
                    <td className="px-3 py-2 align-middle font-semibold whitespace-nowrap text-xs">{formatCurrency(order.total.amount)}</td>
                    <td className="px-3 py-2 align-middle">
                      {canWrite ? (
                        <OrderStatusSelect orderId={order.id} field="status" value={order.status} />
                      ) : (
                        <Badge tone={order.status === 'delivered' ? 'success' : order.status === 'cancelled' ? 'danger' : 'info'}>
                          {ORDER_STATUS_LABELS[order.status] ?? order.status}
                        </Badge>
                      )}
                    </td>
                    <td className="px-3 py-2 align-middle">
                      {canWrite ? (
                        <OrderStatusSelect orderId={order.id} field="paymentStatus" value={order.paymentStatus} />
                      ) : (
                        <Badge tone={order.paymentStatus === 'paid' ? 'success' : order.paymentStatus === 'failed' ? 'danger' : 'warning'}>
                          {PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus}
                        </Badge>
                      )}
                    </td>
                    <td className="px-3 py-2 align-middle">
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
