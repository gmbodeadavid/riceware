import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdminPage } from '@/lib/admin-guard';
import { can } from '@/lib/rbac';
import { getBatch, listLots } from '@/lib/production/queries';
import { prisma } from '@/lib/db';
import {
  computeBatchCost,
  computeCostPerUnit,
  computeRejectRate,
  computeYield,
  labelOf,
  PRODUCT_TYPES,
  REJECT_CAUSES,
  TEST_RESULTS,
  TEST_TYPES,
} from '@/lib/production/types';
import { getSettings, settingNumber } from '@/lib/production/settings';
import { formatCurrency, formatDateTime, formatNumber, formatPercent } from '@/lib/format';
import { PageHeader, Badge, EmptyState, LinkButton, Section } from '@/components/admin/ui';
import BatchForm from '@/components/admin/BatchForm';
import ProductForm from '@/components/admin/ProductForm';
import TestForm from '@/components/admin/TestForm';
import DeleteButton from '@/components/admin/DeleteButton';
import { PACK_LOT_STATUSES } from '@/lib/enums';
import CreatePackLotForm from '@/components/admin/CreatePackLotForm';

type PageProps = { params: Promise<{ id: string }> };

export default async function BatchDetailPage({ params }: PageProps) {
  const session = await requireAdminPage('production:view');
  const { id } = await params;
  const [batch, lots, settings] = await Promise.all([
    getBatch(id),
    listLots({ limit: 200 }),
    getSettings(),
  ]);
  if (!batch) notFound();

  // Charger les packs disponibles pour ce type de produit
  const productPacks = await prisma.productPack.findMany({
    where: { product: { isPublished: true } },
    orderBy: { label: 'asc' },
    include: { product: { select: { id: true, name: true } } },
  });

  const canWrite = can(session.role, 'production:write');
  const canQualityWrite = can(session.role, 'quality:write');
  const rejectRate = computeRejectRate(batch.piecesProduced, batch.rejects);
  const rejectAlertPct = settingNumber(settings, 'rejectAlertPct', 10);

  // Calcul pièces conformes disponibles pour packaging
  const alreadyPacked = batch.packLots.reduce(
    (sum, pl) => sum + pl.quantity * pl.pack.quantity, 0,
  );
  const validPieces = Math.max(0, batch.piecesProduced - batch.rejects);
  const availableForPacking = validPieces - alreadyPacked;

  // Total kg coques utilisés
  const totalKgUsed = batch.usages.reduce((sum, u) => sum + (u.kgUsed ?? 0), 0);
  const totalKgLot = batch.lot?.netWeightKg ?? null;

  return (
    <div>
      {batch.deletedAt ? (
        <div className="mb-4 rounded-control border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          ⚠️ Ce batch a été supprimé le {formatDateTime(batch.deletedAt)} et est en lecture seule.
        </div>
      ) : null}
      <PageHeader
        title={batch.code}
        description={`Batch de production du ${formatDateTime(batch.startedAt)} — ${labelOf(PRODUCT_TYPES, batch.productType)}${batch.lot ? ` — lot ${batch.lot.code}` : ''}.`}
        breadcrumb={[
          { label: 'Tableau de bord', href: '/admin' },
          { label: 'Production', href: '/admin/production' },
          { label: batch.code },
        ]}
        actions={
          <>
            <LinkButton href={`/admin/exports/quality/${batch.id}`} target="_blank">
              Rapport qualité PDF
            </LinkButton>
            {canWrite ? (
              <DeleteButton
                endpoint={`/api/admin/batches/${batch.id}`}
                confirmation={`Supprimer le batch ${batch.code} ? Les stocks seront corrigés.`}
                label="Supprimer le batch"
                compact={false}
                redirectTo="/admin/production"
              />
            ) : null}
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-panel border border-line bg-surface p-4">
          <p className="text-xs uppercase text-ink-muted">Pièces produites</p>
          <p className="mt-2 font-display text-2xl font-bold">{formatNumber(batch.piecesProduced)}</p>
          <p className="text-xs text-ink-muted">{batch.rejects} rebut(s)</p>
        </div>
        <div className={`rounded-panel border p-4 ${rejectRate > rejectAlertPct ? 'border-danger/30 bg-danger/5' : 'border-line bg-surface'}`}>
          <p className="text-xs uppercase text-ink-muted">Rendement</p>
          <p className="mt-2 font-display text-2xl font-bold">{formatPercent(computeYield(batch.piecesProduced, batch.rejects))}</p>
          <p className={`text-xs ${rejectRate > rejectAlertPct ? 'text-danger' : 'text-ink-muted'}`}>
            Rebut {formatPercent(rejectRate)} (seuil {formatPercent(rejectAlertPct)})
          </p>
        </div>
        <div className="rounded-panel border border-line bg-surface p-4">
          <p className="text-xs uppercase text-ink-muted">Coût du batch</p>
          <p className="mt-2 font-display text-2xl font-bold">{formatCurrency(computeBatchCost(batch))}</p>
          <p className="text-xs text-ink-muted">{formatCurrency(computeCostPerUnit(batch))} / pièce valide</p>
        </div>
        <div className="rounded-panel border border-line bg-surface p-4">
          <p className="text-xs uppercase text-ink-muted">Opérateur</p>
          <p className="mt-2 font-display text-lg font-bold">{batch.operator?.name ?? 'Non renseigné'}</p>
          <p className="text-xs text-ink-muted">Tests : {batch.tests.length} · produits : {batch.products.length}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Section title="Paramètres de production" description={batch.observations || 'Aucune observation.'}>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-ink-muted">Poudre de coques</dt><dd className="font-medium">{formatNumber(batch.powderKg, 'kg')}</dd></div>
            <div><dt className="text-ink-muted">Liant</dt><dd className="font-medium">{formatNumber(batch.binderKg, 'kg')}</dd></div>
            <div><dt className="text-ink-muted">Humidité du mélange</dt><dd className="font-medium">{formatPercent(batch.mixHumidityPct)}</dd></div>
            <div><dt className="text-ink-muted">Température de pressage</dt><dd className="font-medium">{formatNumber(batch.pressingTempC, '°C')}</dd></div>
            <div><dt className="text-ink-muted">Pression</dt><dd className="font-medium">{formatNumber(batch.pressureMpa, 'MPa')}</dd></div>
            <div><dt className="text-ink-muted">Temps de cycle</dt><dd className="font-medium">{formatNumber(batch.cycleTimeMin, 'min')}</dd></div>
            <div><dt className="text-ink-muted">Cause principale du rebut</dt><dd className="font-medium">{batch.rejectCause ? labelOf(REJECT_CAUSES, batch.rejectCause) : '—'}</dd></div>
            <div><dt className="text-ink-muted">Lot de coques (hérité)</dt><dd className="font-medium">{batch.lot ? <Link href={`/admin/lots/${batch.lot.id}`} className="text-paddy hover:underline">{batch.lot.code}</Link> : 'Non rattaché'}</dd></div>
          </dl>

          <div className="mt-4 grid gap-2 rounded-control border border-line bg-ground/60 p-3 text-sm sm:grid-cols-4">
            <div><p className="text-xs text-ink-muted">Poudre</p><p className="font-semibold">{formatCurrency(batch.powderCostFcfa)}</p></div>
            <div><p className="text-xs text-ink-muted">Liant</p><p className="font-semibold">{formatCurrency(batch.binderCostFcfa)}</p></div>
            <div><p className="text-xs text-ink-muted">Main-d'œuvre</p><p className="font-semibold">{formatCurrency(batch.laborCostFcfa)}</p></div>
            <div><p className="text-xs text-ink-muted">Énergie</p><p className="font-semibold">{formatCurrency(batch.energyCostFcfa)}</p></div>
          </div>
        </Section>

        <Section title="Traçabilité" description="Origine de la matière première et fiche publique.">
          {batch.lot ? (
            <div className="space-y-3 text-sm">
              <p><span className="text-ink-muted">Rizerie :</span> {batch.lot.rizerie.name}</p>
              <p><span className="text-ink-muted">Localisation :</span> {batch.lot.rizerie.location}</p>
              <p><span className="text-ink-muted">Réception :</span> {formatDateTime(batch.lot.receivedAt)}</p>
              <p><span className="text-ink-muted">Poids net :</span> {formatNumber(batch.lot.netWeightKg, 'kg')}</p>
              <p><span className="text-ink-muted">Humidité :</span> {formatPercent(batch.lot.humidityPct)}</p>
              <LinkButton href={`/tracabilite/${encodeURIComponent(batch.lot.code)}`} target="_blank">Ouvrir la fiche publique</LinkButton>
            </div>
          ) : (
            <p className="text-sm text-ink-muted">Ce batch n'est rattaché à aucun lot de coques (héritage P1). Utilisez la section « Matières consommées » ci-dessous.</p>
          )}
        </Section>
      </div>

      {/* ─── Onglet Matières consommées (BMU) ─── */}
      <div className="mt-6">
        <Section
          title="Matières consommées"
          description={`${batch.usages.length} lot(s) de coques enregistré(s) · ${totalKgUsed.toFixed(2)} kg au total${totalKgLot != null ? ` sur ${totalKgLot} kg du lot hérité` : ''}.`}
        >
          {batch.usages.length === 0 ? (
            <EmptyState title="Aucun usage de lot enregistré" description="Associez les lots de coques utilisés dans ce batch." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
                    <th className="pb-2 pr-3">Lot</th>
                    <th className="pb-2 pr-3">Rizerie</th>
                    <th className="pb-2 pr-3">Kg utilisés</th>
                    <th className="pb-2 pr-3">Part (%)</th>
                    <th className="pb-2">Estimé</th>
                  </tr>
                </thead>
                <tbody>
                  {batch.usages.map((usage) => {
                    const pct = totalKgUsed > 0 && usage.kgUsed != null
                      ? ((usage.kgUsed / totalKgUsed) * 100).toFixed(1)
                      : null;
                    return (
                      <tr key={usage.id} className="border-b border-line/60 last:border-0">
                        <td className="py-2.5 pr-3">
                          <Link href={`/admin/lots/${usage.lot.id}`} className="font-mono-brand text-xs font-semibold text-paddy hover:underline">
                            {usage.lot.code}
                          </Link>
                        </td>
                        <td className="py-2.5 pr-3 text-xs text-ink-muted">{usage.lot.rizerie.name}</td>
                        <td className="py-2.5 pr-3">{usage.kgUsed != null ? formatNumber(usage.kgUsed, 'kg') : <span className="text-ink-muted">Non renseigné</span>}</td>
                        <td className="py-2.5 pr-3">{pct != null ? `${pct} %` : '—'}</td>
                        <td className="py-2.5">{usage.estimated ? <Badge tone="warning">Estimé</Badge> : <Badge tone="success">Mesuré</Badge>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>

      {/* ─── Onglet Packs créés ─── */}
      <div className="mt-6">
        <Section
          title="Lots de packs créés"
          description={`${batch.packLots.length} lot(s) de packs · ${availableForPacking} pièce(s) conformes disponibles pour packaging.`}
        >
          {availableForPacking > 0 && canWrite && !batch.deletedAt ? (
            <div className="mb-4 rounded-control border border-line bg-ground/40 p-3">
              <p className="mb-2 text-xs font-semibold text-ink-muted">Créer un nouveau lot de packs</p>
              <CreatePackLotForm
                batchId={batch.id}
                availablePieces={availableForPacking}
                packs={productPacks}
              />
            </div>
          ) : null}

          {batch.packLots.length === 0 ? (
            <EmptyState title="Aucun lot de packs" description="Créez un lot de packs depuis les pièces conformes de ce batch." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
                    <th className="pb-2 pr-3">Code</th>
                    <th className="pb-2 pr-3">Pack</th>
                    <th className="pb-2 pr-3">Qté</th>
                    <th className="pb-2 pr-3">Restant</th>
                    <th className="pb-2 pr-3">Statut</th>
                    <th className="pb-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {batch.packLots.map((pl) => {
                    const remaining = pl.quantity - pl.allocations.reduce((s, a) => s + a.quantity, 0);
                    const statusEntry = PACK_LOT_STATUSES.find((s) => s.value === pl.status);
                    return (
                      <tr key={pl.id} className="border-b border-line/60 last:border-0">
                        <td className="py-2.5 pr-3">
                          <Link href={`/admin/packs/${pl.id}`} className="font-mono-brand text-xs font-semibold text-paddy hover:underline">
                            {pl.code}
                          </Link>
                        </td>
                        <td className="py-2.5 pr-3 text-xs">{pl.pack.label}</td>
                        <td className="py-2.5 pr-3">{pl.quantity}</td>
                        <td className="py-2.5 pr-3">{remaining}</td>
                        <td className="py-2.5 pr-3">
                          <Badge tone={(statusEntry?.badge === 'default' || !statusEntry?.badge ? 'neutral' : statusEntry.badge) as 'success' | 'warning' | 'danger' | 'info' | 'neutral'}>
                            {statusEntry?.label ?? pl.status}
                          </Badge>
                        </td>
                        <td className="py-2.5 text-xs text-ink-muted">{formatDateTime(pl.packedAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Section title="Produits finis contrôlés" description={`${batch.products.length} produit(s) enregistré(s).`}>
          {batch.products.length === 0 ? (
            <EmptyState title="Aucun produit fini" description="Enregistrez des échantillons pour mesurer le poids, l'épaisseur et l'étanchéité." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
                    <th className="pb-2 pr-3">Type</th>
                    <th className="pb-2 pr-3">Poids</th>
                    <th className="pb-2 pr-3">Épaisseur</th>
                    <th className="pb-2 pr-3">Test</th>
                    <th className="pb-2 pr-3">Statut</th>
                    <th className="pb-2">Tests</th>
                  </tr>
                </thead>
                <tbody>
                  {batch.products.map((product) => (
                    <tr key={product.id} className="border-b border-line/60 last:border-0">
                      <td className="py-2.5 pr-3">{labelOf(PRODUCT_TYPES, product.type)}</td>
                      <td className="py-2.5 pr-3">{formatNumber(product.weightG, 'g')}</td>
                      <td className="py-2.5 pr-3">{formatNumber(product.thicknessMm, 'mm')}</td>
                      <td className="py-2.5 pr-3">{product.leakTest == null ? '—' : product.leakTest ? 'Étanche' : 'Fuite'}</td>
                      <td className="py-2.5 pr-3"><Badge tone={product.status === 'valide' ? 'success' : 'danger'}>{product.status === 'valide' ? 'Validé' : 'Rejeté'}</Badge></td>
                      <td className="py-2.5">{product.tests.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section title="Tests qualité" description={`${batch.tests.length} test(s) sur ce batch.`}>
          {batch.tests.length === 0 ? (
            <EmptyState title="Aucun test" description="Saisissez au moins un test de charge, d'étanchéité ou visuel." />
          ) : (
            <ul className="divide-y divide-line">
              {batch.tests.map((test) => (
                <li key={test.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-semibold">{labelOf(TEST_TYPES, test.typeTest)}</p>
                    <p className="text-xs text-ink-muted">
                      {formatDateTime(test.testedAt)}
                      {test.produitFini ? ` · ${labelOf(PRODUCT_TYPES, test.produitFini.type)}` : ' · batch entier'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={test.result === 'succes' ? 'success' : 'danger'}>{labelOf(TEST_RESULTS, test.result)}</Badge>
                    {canQualityWrite ? <DeleteButton endpoint={`/api/admin/tests/${test.id}`} confirmation="Supprimer ce test ?" label="Suppr." /> : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <div className="mt-6 space-y-5">
        {canQualityWrite && !batch.deletedAt ? (
          <>
            <ProductForm batches={[{ id: batch.id, code: batch.code }]} defaultBatchId={batch.id} />
            <TestForm
              products={batch.products.map((product) => ({
                id: product.id,
                label: `${labelOf(PRODUCT_TYPES, product.type)} — ${formatNumber(product.weightG, 'g')} (${batch.code})`,
              }))}
              batches={[{ id: batch.id, code: batch.code }]}
            />
          </>
        ) : null}

        {canWrite && !batch.deletedAt ? (
          <BatchForm
            lots={lots.map((lot) => ({ id: lot.id, code: lot.code, netWeightKg: lot.netWeightKg }))}
            defaultLotId={batch.lotId ?? undefined}
            batchId={batch.id}
            initial={{
              id: batch.id,
              code: batch.code,
              lotId: batch.lotId,
              startedAt: batch.startedAt,
              productType: batch.productType,
              powderKg: batch.powderKg,
              binderKg: batch.binderKg,
              mixHumidityPct: batch.mixHumidityPct,
              pressingTempC: batch.pressingTempC,
              pressureMpa: batch.pressureMpa,
              cycleTimeMin: batch.cycleTimeMin,
              piecesProduced: batch.piecesProduced,
              rejects: batch.rejects,
              rejectCause: batch.rejectCause,
              observations: batch.observations,
              powderCostFcfa: batch.powderCostFcfa,
              binderCostFcfa: batch.binderCostFcfa,
              laborCostFcfa: batch.laborCostFcfa,
              energyCostFcfa: batch.energyCostFcfa,
            }}
            defaults={{
              powderCostPerKg: settingNumber(settings, 'powderCostPerKg', 50),
              binderCostPerKg: settingNumber(settings, 'binderCostPerKg', 1500),
              laborCostPerBatch: settingNumber(settings, 'laborCostPerBatch', 5000),
              energyCostPerBatch: settingNumber(settings, 'energyCostPerBatch', 2500),
              rejectAlertPct,
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
