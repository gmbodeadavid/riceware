import { requireAdminPage } from '@/lib/admin-guard';
import { can } from '@/lib/rbac';
import { listStocks } from '@/lib/production/queries';
import { PageHeader } from '@/components/admin/ui';
import { StockMovementForm } from '@/components/admin/StockForm';
import { redirect } from 'next/navigation';

export default async function StockMouvementPage() {
  const session = await requireAdminPage('stocks:view');
  if (!can(session.role, 'stocks:write')) redirect('/admin/stocks');

  const stocks = await listStocks();

  return (
    <div>
      <PageHeader
        title="Enregistrer un mouvement"
        breadcrumb={[
          { label: 'Tableau de bord', href: '/admin' },
          { label: 'Stocks', href: '/admin/stocks' },
          { label: 'Mouvement' },
        ]}
      />

      <div className="rounded-panel border border-line bg-surface p-5 sm:p-6">
        <StockMovementForm
          stocks={stocks.map((stock) => ({
            id: stock.id,
            label: stock.label,
            quantity: stock.quantity,
            unit: stock.unit,
            itemType: stock.itemType,
            productType: stock.productType,
          }))}
        />
      </div>
    </div>
  );
}
