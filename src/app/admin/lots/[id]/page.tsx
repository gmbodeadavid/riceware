import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdminPage } from '@/lib/admin-guard';
import { can } from '@/lib/rbac';
import { getLot, listRizeries } from '@/lib/production/queries';
import { traceForwardFromLot } from '@/lib/traceability';
import { labelOf, LOT_STATUSES, LOT_VISUAL_QUALITIES, computeRejectRate, computeYield } from '@/lib/production/types';
import { formatDateTime, formatNumber, formatPercent } from '@/lib/format';
import { PageHeader, Badge, EmptyState, LinkButton, Section } from '@/components/admin/ui';
import LotForm from '@/components/admin/LotForm';
import DeleteButton from '@/components/admin/DeleteButton';
import RecallButton from '@/components/admin/RecallButton';

type PageProps = { params: Promise<{ id: string }> };

export default async function LotDetailPage({ params }: PageProps) {
  const session = await requireAdminPage('lots:view');
  const { id } = await params;
  const [lot, rizeries] = await Promise.all([getLot(id), listRizeries({ activeOnly: false })]);
  if (!lot) notFound();

  const canWrite = can(session.role, 'lots:write');
  const canProductionWrite = can(session.role, 'production:write');

  // Traçabilité descendante (packs et clients)
  let forwardTrace: Awaited<ReturnType<typeof traceForwardFromLot>> | null = null;
  try {
    forwardTrace = await traceForwardFromLot(lot.id);
  } catch {
    // Lot sans usages — pas d'erreur critique
  }

  return (
    <div>
      {lot.deletedAt ? (
        <div className="mb-4 rounded-control border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          ⚠️ Ce lot a été supprimé le {formatDateTime(lot.deletedAt)} et est en lecture seule.
        </div>
      ) : null}
      <PageHeader
        title={lot.code}
        description={`Lot réceptionné le ${formatDateTime(lot.receivedAt)} — ${lot.rizerie.name}, ${lot.rizerie.location}.`}
        actions={
          <>
            <LinkButton href={`/tracabilite/${encodeURIComponent(lot.code)}`} target="_blank">Fiche publique</LinkButton>
            {canProductionWrite && lot.status !== 'recalled' && !lot.deletedAt ? (
              <RecallButton
                endpoint={`/api/admin/lots/${lot.id}/recall`}
                label="Marquer en rappel"
                confirmation={`Déclencher un rappel produit pour le lot ${lot.code} ?`}
              />
            ) : null}
            {canWrite ? <DeleteButton endpoint={`/api/admin/lots/${lot.id}`} confirmation={`Supprimer le lot ${lot.code} ?`} label="Supprimer le lot" compact={false} redirectTo="/admin/lots" /> : null}
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-panel border border-line bg-surface p-4">
          <p className="text-xs uppercase text-ink-muted">Poids brut / tare / net</p>
          <p className="mt-2 font-display text-lg font-bold">
            {formatNumber(lot.grossWeightKg, 'kg')} / {formatNumber(lot.tareWeightKg, 'kg')} / {formatNumber(lot.netWeightKg, 'kg')}
          </p>
        </div>
        <div className="rounded-panel border border-line bg-surface p-4">
          <p className="text-xs uppercase text-ink-muted">Humidité</p>
          <p className="mt-2 font-display text-lg font-bold">{formatPercent(lot.humidityPct)}</p>
        </div>
        <div className="rounded-panel border border-line bg-surface p-4">
          <p className="text-xs uppercase text-ink-muted">État visuel</p>
          <p className="mt-2 font-display text-lg font-bold">{labelOf(LOT_VISUAL_QUALITIES, lot.visualQuality)}</p>
        </div>
        <div className="rounded-panel border border-line bg-surface p-4">
          <p className="text-xs uppercase text-ink-muted">Statut</p>
          <p className="mt-2"><Badge tone={lot.status === 'accepted' ? 'success' : 'danger'}>{labelOf(LOT_STATUSES, lot.status)}</Badge></p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Section title="Informations de réception" description={lot.notes || 'Aucune observation.'}>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-ink-muted">Rizerie</dt><dd className="font-medium">{lot.rizerie.name}</dd></div>
            <div><dt className="text-ink-muted">Localisation</dt><dd className="font-medium">{lot.rizerie.location}</dd></div>
            <div><dt className="text-ink-muted">Contrat</dt><dd className="font-medium">{lot.rizerie.contractType}</dd></div>
            <div><dt className="text-ink-muted">Contact</dt><dd className="font-medium">{lot.rizerie.contactName ?? '—'} {lot.rizerie.contactPhone ?? ''}</dd></div>
            <div><dt className="text-ink-muted">Saisi par</dt><dd className="font-medium">{lot.createdBy?.name ?? 'système'}</dd></div>
            <div><dt className="text-ink-muted">Dernière mise à jour</dt><dd className="font-medium">{formatDateTime(lot.updatedAt)}</dd></div>
          </dl>
          {lot.photoUrl ? (
            <a href={lot.photoUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex text-sm font-semibold text-paddy hover:underline">
              Ouvrir la photo du lot →
            </a>
          ) : null}
        </Section>

        <Section title="Batches issus de ce lot" description={`${lot.batches.length} batch(es) de production.`}>
          {lot.batches.length === 0 ? (
            <EmptyState title="Aucun batch" description="Ce lot n’a pas encore été transformé." action={<LinkButton href="/admin/production" variant="primary">Saisir un batch</LinkButton>} />
          ) : (
            <ul className="divide-y divide-line">
              {lot.batches.map((batch) => (
                <li key={batch.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link href={`/admin/production/${batch.id}`} className="font-mono-brand text-xs font-semibold text-paddy hover:underline">{batch.code}</Link>
                    <span className="text-xs text-ink-muted">{formatDateTime(batch.startedAt)}</span>
                  </div>
                  <p className="mt-1 text-xs text-ink-muted">
                    {batch.piecesProduced} pièces · rendement {formatPercent(computeYield(batch.piecesProduced, batch.rejects))} · rebut {formatPercent(computeRejectRate(batch.piecesProduced, batch.rejects))}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      {canWrite && !lot.deletedAt ? (
        <div className="mt-6">
          <LotForm
            rizeries={rizeries.map((rizerie) => ({ id: rizerie.id, name: rizerie.name }))}
            initial={{
              id: lot.id,
              rizerieId: lot.rizerieId,
              receivedAt: lot.receivedAt,
              grossWeightKg: lot.grossWeightKg,
              tareWeightKg: lot.tareWeightKg,
              humidityPct: lot.humidityPct,
              visualQuality: lot.visualQuality,
              status: lot.status,
              photoUrl: lot.photoUrl,
              notes: lot.notes,
            }}
          />
        </div>
      ) : null}

      {/* ─── Traçabilité descendante ─── */}
      {forwardTrace && (forwardTrace.batches.length > 0 || forwardTrace.affectedOrders.length > 0) ? (
        <div className="mt-6">
          <Section title="Clients livrés (traçabilité descendante)" description={`${forwardTrace.affectedOrders.length} commande(s) concernée(s).`}>
            {forwardTrace.affectedOrders.length === 0 ? (
              <p className="text-sm text-ink-muted">Aucune commande liée à ce lot.</p>
            ) : (
              <ul className="divide-y divide-line">
                {forwardTrace.affectedOrders.map((o) => (
                  <li key={o.orderId} className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                    <div>
                      <Link href={`/admin/commandes/${o.orderId}`} className="font-mono-brand text-xs font-semibold text-paddy hover:underline">{o.orderNumber}</Link>
                      <span className="ml-2 text-xs text-ink-muted">{o.customer.fullName} · {o.customer.phone}</span>
                    </div>
                    <Badge tone={o.status === 'delivered' ? 'success' : o.status === 'cancelled' ? 'danger' : 'info'}>{o.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      ) : null}
    </div>
  );
}
