import { requireAdminPage } from '@/lib/admin-guard';
import { can } from '@/lib/rbac';
import { PageHeader } from '@/components/admin/ui';
import { StockCreateForm } from '@/components/admin/StockForm';
import { redirect } from 'next/navigation';

export default async function NewStockPage() {
  const session = await requireAdminPage('stocks:view');
  if (!can(session.role, 'stocks:write')) redirect('/admin/stocks');

  return (
    <div>
      <PageHeader
        title="Ajouter une référence de stock"
        breadcrumb={[
          { label: 'Tableau de bord', href: '/admin' },
          { label: 'Stocks', href: '/admin/stocks' },
          { label: 'Nouvelle référence' },
        ]}
      />

      <div className="rounded-panel border border-line bg-surface p-5 sm:p-6">
        <StockCreateForm />
      </div>
    </div>
  );
}
