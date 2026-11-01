import Link from 'next/link';
import { requireAdminPage } from '@/lib/admin-guard';
import { can } from '@/lib/rbac';
import { listRizeries } from '@/lib/production/queries';
import { CONTRACT_TYPES, labelOf } from '@/lib/production/types';
import { formatDate, formatNumber } from '@/lib/format';
import { PageHeader, Badge, EmptyState } from '@/components/admin/ui';
import RizerieForm from '@/components/admin/RizerieForm';
import DeleteButton from '@/components/admin/DeleteButton';

export default async function RizeriesPage() {
  const session = await requireAdminPage('lots:view');
  const rizeries = await listRizeries();
  const canWrite = can(session.role, 'partners:write');

  return (
    <div>
      <PageHeader
        title="Rizeries partenaires"
        description="Origine des coques de riz : contacts, contrats, volumes et conditions qualité."
      />

      {canWrite ? <div className="mb-5"><RizerieForm /></div> : null}

      {rizeries.length === 0 ? (
        <EmptyState title="Aucune rizerie" description="Ajoutez la première rizerie pour pouvoir enregistrer des lots de coques." />
      ) : (
        <div className="space-y-3">
          {rizeries.map((rizerie) => (
            <article key={rizerie.id} className="rounded-panel border border-line bg-surface">
              <div className="flex flex-wrap items-start justify-between gap-3 p-4 sm:p-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-lg font-semibold text-ink">{rizerie.name}</h2>
                    <Badge tone={rizerie.active ? 'success' : 'neutral'}>{rizerie.active ? 'Active' : 'Inactive'}</Badge>
                    <Badge tone="info">{labelOf(CONTRACT_TYPES, rizerie.contractType)}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-ink-muted">{rizerie.location}</p>
                  <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <div><dt className="inline text-ink-muted">Contact : </dt><dd className="inline">{rizerie.contactName ?? '—'}</dd></div>
                    <div><dt className="inline text-ink-muted">Téléphone : </dt><dd className="inline">{rizerie.contactPhone ?? '—'}</dd></div>
                    <div><dt className="inline text-ink-muted">Lots reçus : </dt><dd className="inline">{rizerie._count.lots}</dd></div>
                    <div><dt className="inline text-ink-muted">Volume mensuel : </dt><dd className="inline">{rizerie.monthlyVolumeKg ? formatNumber(rizerie.monthlyVolumeKg, 'kg') : '—'}</dd></div>
                    <div><dt className="inline text-ink-muted">Dernier lot : </dt><dd className="inline">{rizerie.lots[0] ? `${formatDate(rizerie.lots[0].receivedAt)} (${formatNumber(rizerie.lots[0].netWeightKg, 'kg')})` : '—'}</dd></div>
                    <div><dt className="inline text-ink-muted">Email : </dt><dd className="inline">{rizerie.contactEmail ?? '—'}</dd></div>
                  </dl>
                  {rizerie.qualityNotes ? <p className="mt-3 text-sm text-ink-muted">Qualité : {rizerie.qualityNotes}</p> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/admin/lots?rizerieId=${rizerie.id}`} className="rounded-control border border-line px-3 py-1.5 text-xs font-semibold hover:border-paddy hover:text-paddy">
                    Voir les lots
                  </Link>
                  {canWrite ? <DeleteButton endpoint={`/api/admin/rizieries/${rizerie.id}`} confirmation={`Supprimer la rizerie ${rizerie.name} ?`} /> : null}
                </div>
              </div>

              {canWrite ? (
                <details className="border-t border-line">
                  <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-paddy sm:px-5">Modifier la fiche</summary>
                  <div className="border-t border-line px-4 py-5 sm:px-5">
                    <RizerieForm
                      initial={{
                        id: rizerie.id,
                        name: rizerie.name,
                        location: rizerie.location,
                        contactName: rizerie.contactName,
                        contactPhone: rizerie.contactPhone,
                        contactEmail: rizerie.contactEmail,
                        contractType: rizerie.contractType,
                        monthlyVolumeKg: rizerie.monthlyVolumeKg,
                        qualityNotes: rizerie.qualityNotes,
                        notes: rizerie.notes,
                        active: rizerie.active,
                      }}
                    />
                  </div>
                </details>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
