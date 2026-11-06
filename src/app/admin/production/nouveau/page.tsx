import { redirect } from 'next/navigation';
import { requireAdminPage } from '@/lib/admin-guard';
import { can } from '@/lib/rbac';
import { listLots } from '@/lib/production/queries';
import { getSettings, settingNumber } from '@/lib/production/settings';
import { PageHeader } from '@/components/admin/ui';
import BatchForm from '@/components/admin/BatchForm';

export default async function NewBatchPage() {
  const session = await requireAdminPage('production:view');
  if (!can(session.role, 'production:write')) redirect('/admin/production');

  const [lots, settings] = await Promise.all([
    listLots({ limit: 200 }),
    getSettings(),
  ]);

  const defaults = {
    powderCostPerKg: settingNumber(settings, 'powderCostPerKg', 50),
    binderCostPerKg: settingNumber(settings, 'binderCostPerKg', 1500),
    laborCostPerBatch: settingNumber(settings, 'laborCostPerBatch', 5000),
    energyCostPerBatch: settingNumber(settings, 'energyCostPerBatch', 2500),
    rejectAlertPct: settingNumber(settings, 'rejectAlertPct', 10),
  };

  return (
    <div>
      <PageHeader
        title="Saisir un batch de production"
        breadcrumb={[
          { label: 'Tableau de bord', href: '/admin' },
          { label: 'Production', href: '/admin/production' },
          { label: 'Nouveau batch' },
        ]}
      />

      <div className="rounded-panel border border-line bg-surface p-5 sm:p-6">
        <BatchForm
          lots={lots.map((lot: { id: string; code: string; netWeightKg?: number | null }) => ({ id: lot.id, code: lot.code, netWeightKg: lot.netWeightKg ?? undefined }))}
          defaults={defaults}
        />
      </div>
    </div>
  );
}
