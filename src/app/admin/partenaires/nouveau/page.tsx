import { requireAdminPage } from '@/lib/admin-guard';
import { PageHeader } from '@/components/admin/ui';
import PartnerForm from '@/components/admin/PartnerForm';

export default async function NewPartnerPage() {
  await requireAdminPage('partners:write');

  return (
    <div>
      <PageHeader
        title="Ajouter un partenaire"
        breadcrumb={[
          { label: 'Tableau de bord', href: '/admin' },
          { label: 'Partenaires', href: '/admin/partenaires' },
          { label: 'Nouveau' },
        ]}
      />

      <div className="rounded-panel border border-line bg-surface p-5 sm:p-6">
        <PartnerForm />
      </div>
    </div>
  );
}
