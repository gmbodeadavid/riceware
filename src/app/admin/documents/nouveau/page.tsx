import { requireAdminPage } from '@/lib/admin-guard';
import { listLots, listPartners, listRizeries } from '@/lib/production/queries';
import { PageHeader } from '@/components/admin/ui';
import DocumentForm from '@/components/admin/DocumentForm';

export default async function NewDocumentPage() {
  await requireAdminPage('documents:write');
  const [lots, partners, rizeries] = await Promise.all([
    listLots({ limit: 100 }),
    listPartners(),
    listRizeries(),
  ]);

  const entityOptions = [
    ...lots.map((lot) => ({ value: `lot:${lot.id}`, label: `Lot ${lot.code}` })),
    ...partners.map((partner) => ({ value: `partner:${partner.id}`, label: `Partenaire ${partner.name}` })),
    ...rizeries.map((rizerie) => ({ value: `rizerie:${rizerie.id}`, label: `Rizerie ${rizerie.name}` })),
  ];

  return (
    <div>
      <PageHeader
        title="Importer un document"
        breadcrumb={[
          { label: 'Tableau de bord', href: '/admin' },
          { label: 'Documents', href: '/admin/documents' },
          { label: 'Nouveau' },
        ]}
      />

      <div className="rounded-panel border border-line bg-surface p-5 sm:p-6">
        <DocumentForm entityOptions={entityOptions} />
      </div>
    </div>
  );
}
