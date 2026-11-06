import { redirect } from 'next/navigation';
import { requireAdminPage } from '@/lib/admin-guard';
import { can } from '@/lib/rbac';
import { listBatches } from '@/lib/production/queries';
import { PageHeader } from '@/components/admin/ui';
import ProductForm from '@/components/admin/ProductForm';

export default async function NewProductPage() {
  const session = await requireAdminPage('quality:view');
  if (!can(session.role, 'quality:write')) redirect('/admin/qualite');

  const batches = await listBatches({ limit: 100 });

  return (
    <div>
      <PageHeader
        title="Enregistrer un produit fini"
        breadcrumb={[
          { label: 'Tableau de bord', href: '/admin' },
          { label: 'Qualité', href: '/admin/qualite' },
          { label: 'Nouveau produit' },
        ]}
      />

      <div className="rounded-panel border border-line bg-surface p-5 sm:p-6">
        <ProductForm batches={batches.map((batch) => ({ id: batch.id, code: batch.code }))} />
      </div>
    </div>
  );
}
