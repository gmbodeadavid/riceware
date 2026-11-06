import Link from 'next/link';
import { requireAdminPage } from '@/lib/admin-guard';
import { can } from '@/lib/rbac';
import { listPartners } from '@/lib/production/queries';
import { labelOf, PARTNER_TYPES } from '@/lib/production/types';
import { formatDate } from '@/lib/format';
import { PageHeader, Badge, EmptyState, StatCard } from '@/components/admin/ui';
import { ExpandableRow } from '@/components/admin/ExpandableRow';
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
        breadcrumb={[{ label: 'Tableau de bord', href: '/admin' }, { label: 'Partenaires' }]}
        actions={
          canWrite ? (
            <Link
              href="/admin/partenaires/nouveau"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-control bg-paddy px-4 py-2 text-sm font-semibold text-on-paddy transition-colors hover:bg-paddy-deep"
            >
              + Ajouter un partenaire
            </Link>
          ) : null
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatCard label="Partenaires" value={partners.length} hint="Total référencé" />
        <StatCard label="Actifs" value={active} tone="paddy" hint={`${Math.round((active / (partners.length || 1)) * 100)}% d'activité`} />
        <StatCard label="Laboratoires" value={partners.filter((partner) => partner.type === 'laboratoire').length} hint="Analyses & conformité" />
      </div>

      {partners.length === 0 ? (
        <EmptyState title="Aucun partenaire" description="Ajoutez un laboratoire, un client pilote ou une institution." />
      ) : (
        <div className="overflow-x-auto rounded-panel border border-line bg-surface">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-ground/40 text-[11px] uppercase tracking-wide text-ink-muted">
                <th className="px-4 py-3 font-semibold">Nom</th>
                <th className="px-4 py-3 font-semibold hidden sm:table-cell">Type</th>
                <th className="px-4 py-3 font-semibold hidden md:table-cell">Contact</th>
                <th className="px-4 py-3 font-semibold hidden lg:table-cell">Localisation</th>
                <th className="px-4 py-3 font-semibold hidden lg:table-cell">Accord</th>
                <th className="px-4 py-3 font-semibold">Statut</th>
                {canWrite ? <th className="px-4 py-3 font-semibold">Actions</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-line/50">
              {partners.map((partner) =>
                canWrite ? (
                  <ExpandableRow
                    key={partner.id}
                    colSpan={7}
                    editLabel="Modifier"
                    cells={
                      <>
                        <td className="px-4 py-3 align-middle">
                          <p className="font-semibold text-ink">{partner.name}</p>
                          {partner.notes ? <p className="text-xs text-ink-muted line-clamp-1">{partner.notes}</p> : null}
                        </td>
                        <td className="px-4 py-3 align-middle hidden sm:table-cell">
                          <Badge tone="info">{labelOf(PARTNER_TYPES, partner.type)}</Badge>
                        </td>
                        <td className="px-4 py-3 align-middle text-xs text-ink-muted hidden md:table-cell">
                          <p>{partner.contactName ?? '—'}</p>
                          <p>{partner.phone ?? ''}</p>
                        </td>
                        <td className="px-4 py-3 align-middle text-xs text-ink-muted hidden lg:table-cell">
                          {partner.location ?? '—'}
                        </td>
                        <td className="px-4 py-3 align-middle text-xs text-ink-muted hidden lg:table-cell">
                          {partner.contractType ?? '—'}
                          {partner.createdAt ? <p className="text-ink-muted/70">{formatDate(partner.createdAt)}</p> : null}
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <Badge tone={partner.active ? 'success' : 'neutral'}>
                            {partner.active ? 'Actif' : 'Inactif'}
                          </Badge>
                        </td>
                      </>
                    }
                    form={
                      <div>
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
                        <div className="mt-3 pt-3 border-t border-line/60">
                          <DeleteButton
                            endpoint={`/api/admin/partenaires/${partner.id}`}
                            confirmation={`Supprimer le partenaire ${partner.name} ?`}
                            label="Supprimer ce partenaire"
                            compact={false}
                          />
                        </div>
                      </div>
                    }
                  />
                ) : (
                  <tr key={partner.id} className="hover:bg-paddy/[0.03] transition-colors">
                    <td className="px-4 py-3 align-middle">
                      <p className="font-semibold text-ink">{partner.name}</p>
                      {partner.notes ? <p className="text-xs text-ink-muted line-clamp-1">{partner.notes}</p> : null}
                    </td>
                    <td className="px-4 py-3 align-middle hidden sm:table-cell">
                      <Badge tone="info">{labelOf(PARTNER_TYPES, partner.type)}</Badge>
                    </td>
                    <td className="px-4 py-3 align-middle text-xs text-ink-muted hidden md:table-cell">
                      <p>{partner.contactName ?? '—'}</p>
                      <p>{partner.phone ?? ''}</p>
                    </td>
                    <td className="px-4 py-3 align-middle text-xs text-ink-muted hidden lg:table-cell">
                      {partner.location ?? '—'}
                    </td>
                    <td className="px-4 py-3 align-middle text-xs text-ink-muted hidden lg:table-cell">
                      {partner.contractType ?? '—'}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <Badge tone={partner.active ? 'success' : 'neutral'}>
                        {partner.active ? 'Actif' : 'Inactif'}
                      </Badge>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
