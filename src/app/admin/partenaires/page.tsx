import { requireAdminPage } from '@/lib/admin-guard';
import { can } from '@/lib/rbac';
import { listPartners } from '@/lib/production/queries';
import { labelOf, PARTNER_TYPES } from '@/lib/production/types';
import { formatDate } from '@/lib/format';
import { PageHeader, Badge, EmptyState, LinkButton, StatCard } from '@/components/admin/ui';
import PartnerForm from '@/components/admin/PartnerForm';
import DeleteButton from '@/components/admin/DeleteButton';

export default async function PartnersPage() {
  const session = await requireAdminPage('partners:view');
  const partners = await listPartners();
  const canWrite = can(session.role, 'partners:write');

  const active = partners.filter((partner) => partner.active).length;

  return (
    <div>
      <PageHeader
        title="Partenaires"
        description="Laboratoires, clients pilotes, fournisseurs et institutions. Les documents associés sont disponibles dans le module Documents."
        breadcrumb={[{ label: 'Tableau de bord', href: '/admin' }, { label: 'Partenaires' }]}
        actions={<LinkButton href="/admin/documents">Documents</LinkButton>}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatCard label="Partenaires" value={partners.length} hint="Total référencé" />
        <StatCard label="Actifs" value={active} tone="paddy" hint={`${Math.round((active / (partners.length || 1)) * 100)}% d'activité`} />
        <StatCard label="Laboratoires" value={partners.filter((partner) => partner.type === 'laboratoire').length} hint="Analyses & conformité" />
      </div>

      {canWrite ? <div className="mb-5"><PartnerForm /></div> : null}

      {partners.length === 0 ? (
        <EmptyState title="Aucun partenaire" description="Ajoutez un laboratoire, un client pilote ou une institution." />
      ) : (
        <div className="space-y-3">
          {partners.map((partner) => (
            <article key={partner.id} className="rounded-panel border border-line bg-surface">
              <div className="flex flex-wrap items-start justify-between gap-3 p-4 sm:p-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-lg font-semibold">{partner.name}</h2>
                    <Badge tone={partner.active ? 'success' : 'neutral'}>{partner.active ? 'Actif' : 'Inactif'}</Badge>
                    <Badge tone="info">{labelOf(PARTNER_TYPES, partner.type)}</Badge>
                  </div>
                  <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                    <div><dt className="inline text-ink-muted">Contact : </dt><dd className="inline">{partner.contactName ?? '—'}</dd></div>
                    <div><dt className="inline text-ink-muted">Téléphone : </dt><dd className="inline">{partner.phone ?? '—'}</dd></div>
                    <div><dt className="inline text-ink-muted">Email : </dt><dd className="inline">{partner.email ?? '—'}</dd></div>
                    <div><dt className="inline text-ink-muted">Localisation : </dt><dd className="inline">{partner.location ?? '—'}</dd></div>
                    <div><dt className="inline text-ink-muted">Accord : </dt><dd className="inline">{partner.contractType ?? '—'}</dd></div>
                    <div><dt className="inline text-ink-muted">Depuis : </dt><dd className="inline">{formatDate(partner.createdAt)}</dd></div>
                  </dl>
                  {partner.notes ? <p className="mt-3 text-sm text-ink-muted">{partner.notes}</p> : null}
                </div>
                {canWrite ? <DeleteButton endpoint={`/api/admin/partenaires/${partner.id}`} confirmation={`Supprimer le partenaire ${partner.name} ?`} /> : null}
              </div>

              {canWrite ? (
                <details className="border-t border-line">
                  <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-paddy sm:px-5">Modifier la fiche</summary>
                  <div className="border-t border-line px-4 py-5 sm:px-5">
                    <PartnerForm
                      initial={{
                        id: partner.id,
                        name: partner.name,
                        type: partner.type,
                        contactName: partner.contactName,
                        phone: partner.phone,
                        email: partner.email,
                        location: partner.location,
                        contractType: partner.contractType,
                        notes: partner.notes,
                        active: partner.active,
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
