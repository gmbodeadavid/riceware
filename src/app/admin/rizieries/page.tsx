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
        breadcrumb={[{ label: 'Tableau de bord', href: '/admin' }, { label: 'Rizeries' }]}
      />

      {canWrite ? <div className="mb-5"><RizerieForm /></div> : null}

      {rizeries.length === 0 ? (
        <EmptyState title="Aucune rizerie" description="Ajoutez la première rizerie pour pouvoir enregistrer des lots de coques." />
      ) : (
        <div className="space-y-3">
          {rizeries.map((rizerie) => (
            <article key={rizerie.id} className="rounded-panel border border-line bg-surface">
              <div className={`grid gap-6 p-4 sm:p-5 ${canWrite ? 'lg:grid-cols-[1.4fr_1fr]' : ''}`}>
                {/* ── Infos ── */}
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
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link href={`/admin/lots?rizerieId=${rizerie.id}`} className="rounded-control border border-line px-3 py-1.5 text-xs font-semibold hover:border-paddy hover:text-paddy transition-colors">
                      Voir les lots
                    </Link>
                  </div>
                </div>

                {/* ── Formulaire d'édition toujours visible ── */}
                {canWrite ? (
                  <div className="border-t border-line pt-4 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">Modifier la fiche</p>
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
                    <div className="mt-3 pt-3 border-t border-line/60">
                      <DeleteButton endpoint={`/api/admin/rizieries/${rizerie.id}`} confirmation={`Supprimer la rizerie ${rizerie.name} ?`} label="Supprimer cette rizerie" compact={false} />
                    </div>
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
