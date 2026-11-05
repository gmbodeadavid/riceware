import { requireAdminPage } from '@/lib/admin-guard';
import { can } from '@/lib/rbac';
import { listDocuments, listLots, listPartners, listRizeries } from '@/lib/production/queries';
import { DOCUMENT_CATEGORIES, labelOf } from '@/lib/production/types';
import { formatDateTime, formatNumber } from '@/lib/format';
import { PageHeader, Badge, EmptyState } from '@/components/admin/ui';
import DocumentForm from '@/components/admin/DocumentForm';
import DeleteButton from '@/components/admin/DeleteButton';

export default async function DocumentsPage() {
  const session = await requireAdminPage('documents:view');
  const [documents, lots, partners, rizeries] = await Promise.all([
    listDocuments(),
    listLots({ limit: 100 }),
    listPartners(),
    listRizeries(),
  ]);
  const canWrite = can(session.role, 'documents:write');

  const entityLabels = new Map<string, string>();
  lots.forEach((lot) => entityLabels.set(`lot:${lot.id}`, `Lot ${lot.code}`));
  partners.forEach((partner) => entityLabels.set(`partner:${partner.id}`, `Partenaire ${partner.name}`));
  rizeries.forEach((rizerie) => entityLabels.set(`rizerie:${rizerie.id}`, `Rizerie ${rizerie.name}`));

  const entityOptions = [
    ...lots.map((lot) => ({ value: `lot:${lot.id}`, label: `Lot ${lot.code}` })),
    ...partners.map((partner) => ({ value: `partner:${partner.id}`, label: `Partenaire ${partner.name}` })),
    ...rizeries.map((rizerie) => ({ value: `rizerie:${rizerie.id}`, label: `Rizerie ${rizerie.name}` })),
  ];

  return (
    <div>
      <PageHeader
        title="Documents et justificatifs"
        description="Certificats, contrats, rapports et photos. Les fichiers sont stockés hors du dossier public et servis uniquement aux utilisateurs connectés."
        breadcrumb={[{ label: 'Tableau de bord', href: '/admin' }, { label: 'Documents' }]}
      />

      {canWrite ? <div className="mb-5"><DocumentForm entityOptions={entityOptions} /></div> : null}

      {documents.length === 0 ? (
        <EmptyState title="Aucun document" description="Importez un certificat, un contrat ou une photo de lot." />
      ) : (
        <div className="overflow-x-auto rounded-panel border border-line bg-surface">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-ground/60 text-xs uppercase tracking-wide text-ink-muted">
                <th className="px-4 py-3">Document</th>
                <th className="px-4 py-3">Catégorie</th>
                <th className="px-4 py-3">Rattachement</th>
                <th className="px-4 py-3">Fichier</th>
                <th className="px-4 py-3">Ajouté par</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((document) => (
                <tr key={document.id} className="border-b border-line/60 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium">{document.name}</p>
                    {document.notes ? <p className="text-xs text-ink-muted">{document.notes}</p> : null}
                  </td>
                  <td className="px-4 py-3"><Badge tone="info">{labelOf(DOCUMENT_CATEGORIES, document.category)}</Badge></td>
                  <td className="px-4 py-3 text-ink-muted">
                    {document.entityType && document.entityId
                      ? entityLabels.get(`${document.entityType}:${document.entityId}`) ?? `${document.entityType} · ${document.entityId}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-muted">
                    {document.mimeType ?? '—'}
                    {document.sizeBytes ? <><br />{formatNumber(Math.round(document.sizeBytes / 1024), 'Ko')}</> : null}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{document.uploadedBy?.name ?? 'système'}</td>
                  <td className="px-4 py-3 text-ink-muted">{formatDateTime(document.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <a href={document.url} target="_blank" rel="noreferrer" className="rounded-control border border-line px-2.5 py-1 text-xs font-semibold hover:border-paddy hover:text-paddy">
                        Ouvrir
                      </a>
                      {canWrite ? <DeleteButton endpoint={`/api/admin/documents/${document.id}`} confirmation={`Supprimer le document ${document.name} ?`} label="Suppr." /> : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
