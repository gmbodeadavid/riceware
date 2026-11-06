import { redirect } from 'next/navigation';
import { requireAdminPage } from '@/lib/admin-guard';
import { can } from '@/lib/rbac';
import { listRizeries } from '@/lib/production/queries';
import { PageHeader } from '@/components/admin/ui';
import LotForm from '@/components/admin/LotForm';

export default async function NewLotPage() {
  const session = await requireAdminPage('lots:view');
  if (!can(session.role, 'lots:write')) redirect('/admin/lots');

  const rizeries = await listRizeries({ activeOnly: false });

  return (
    <div>
      <PageHeader
        title="Saisir un lot de coques"
        breadcrumb={[
          { label: 'Tableau de bord', href: '/admin' },
          { label: 'Lots de coques', href: '/admin/lots' },
          { label: 'Nouveau lot' },
        ]}
      />

      <div className="rounded-panel border border-line bg-surface p-5 sm:p-6">
        <LotForm rizeries={rizeries.map((r) => ({ id: r.id, name: r.name }))} />
      </div>
    </div>
  );
}
