import { requireAdminPage } from '@/lib/admin-guard';
import { PageHeader } from '@/components/admin/ui';
import RizerieForm from '@/components/admin/RizerieForm';

export default async function NewRizeriePage() {
  await requireAdminPage('partners:write');

  return (
    <div>
      <PageHeader
        title="Ajouter une rizerie"
        breadcrumb={[
          { label: 'Tableau de bord', href: '/admin' },
          { label: 'Rizeries', href: '/admin/rizieries' },
          { label: 'Nouveau' },
        ]}
      />

      <div className="rounded-panel border border-line bg-surface p-5 sm:p-6">
        <RizerieForm />
      </div>
    </div>
  );
}
