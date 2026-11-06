import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdminPage } from '@/lib/admin-guard';
import { can } from '@/lib/rbac';
import { getRizerie } from '@/lib/production/queries';
import { PageHeader } from '@/components/admin/ui';
import RizerieForm from '@/components/admin/RizerieForm';

export default async function EditRizeriePage({ params }: { params: { id: string } }) {
  const session = await requireAdminPage('lots:view');
  const canWrite = can(session.role, 'partners:write');
  const rizerie = await getRizerie(params.id);
  if (!rizerie) notFound();

  return (
    <div>
      <PageHeader
        title={rizerie.name}
        breadcrumb={[
          { label: 'Tableau de bord', href: '/admin' },
          { label: 'Rizeries', href: '/admin/rizieries' },
          { label: rizerie.name },
        ]}
      />

      <div className="rounded-panel border border-line bg-surface p-5 sm:p-6">
        <div className="mb-4">
          <Link
            href={`/admin/lots?rizerieId=${rizerie.id}`}
            className="inline-flex items-center rounded-control border border-line px-3 py-1.5 text-xs font-semibold hover:border-paddy hover:text-paddy transition-colors"
          >
            Voir les lots ({rizerie._count.lots})
          </Link>
        </div>

        {canWrite ? (
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
        ) : (
          <p className="text-sm text-ink-muted">Vous n&apos;avez pas les droits pour modifier cette rizerie.</p>
        )}
      </div>
    </div>
  );
}
