import { redirect } from 'next/navigation';
import { requireAdminPage } from '@/lib/admin-guard';
import { can } from '@/lib/rbac';
import { getQualityOverview, listBatches } from '@/lib/production/queries';
import { labelOf, PRODUCT_TYPES } from '@/lib/production/types';
import { formatNumber } from '@/lib/format';
import { PageHeader } from '@/components/admin/ui';
import TestForm from '@/components/admin/TestForm';

export default async function NewTestPage() {
  const session = await requireAdminPage('quality:view');
  if (!can(session.role, 'quality:write')) redirect('/admin/qualite');

  const [overview, batches] = await Promise.all([
    getQualityOverview(),
    listBatches({ limit: 100 }),
  ]);

  return (
    <div>
      <PageHeader
        title="Saisir un test qualité"
        breadcrumb={[
          { label: 'Tableau de bord', href: '/admin' },
          { label: 'Qualité', href: '/admin/qualite' },
          { label: 'Nouveau test' },
        ]}
      />

      <div className="rounded-panel border border-line bg-surface p-5 sm:p-6">
        <TestForm
          products={overview.products.map((product) => ({
            id: product.id,
            label: `${labelOf(PRODUCT_TYPES, product.type)} — ${formatNumber(product.weightG, 'g')} (${product.batch.code})`,
          }))}
          batches={batches.map((batch) => ({ id: batch.id, code: batch.code }))}
        />
      </div>
    </div>
  );
}
