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
                  <tr className="border-b border-line bg-ground/40 text-[11px] uppercase tracking-wide text-ink-muted">
                    <th className="px-4 py-3 font-semibold">Lot</th>
                    <th className="px-4 py-3 font-semibold hidden sm:table-cell">Rizerie</th>
                    <th className="px-4 py-3 font-semibold">Kg utilisés</th>
                    <th className="px-4 py-3 font-semibold hidden sm:table-cell">Part (%)</th>
                    <th className="px-4 py-3 font-semibold">Mesuré ?</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/50">
                  {batch.usages.map((usage) => {
                    const pct = totalKgUsed > 0 && usage.kgUsed != null
                      ? ((usage.kgUsed / totalKgUsed) * 100).toFixed(1)
                      : null;
                    return (
                      <tr key={usage.id} className="group transition-colors hover:bg-paddy/[0.03]">
                        <td className="px-4 py-3 align-middle">
                          <Link href={`/admin/lots/${usage.lot.id}`} className="font-mono-brand text-xs font-semibold text-paddy hover:text-paddy-deep hover:underline">
                            {usage.lot.code}
                          </Link>
                        </td>
                        <td className="px-4 py-3 align-middle text-xs text-ink-muted hidden sm:table-cell">{usage.lot.rizerie.name}</td>
                        <td className="px-4 py-3 align-middle font-medium whitespace-nowrap">{usage.kgUsed != null ? formatNumber(usage.kgUsed, 'kg') : <span className="text-ink-muted">—</span>}</td>
                        <td className="px-4 py-3 align-middle text-ink-muted hidden sm:table-cell">{pct != null ? `${pct} %` : '—'}</td>
                        <td className="px-4 py-3 align-middle">{usage.estimated ? <Badge tone="warning">Estimé</Badge> : <Badge tone="success">Mesuré</Badge>}</td>
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
                  <tr className="border-b border-line bg-ground/40 text-[11px] uppercase tracking-wide text-ink-muted">
                    <th className="px-4 py-3 font-semibold">Code</th>
                    <th className="px-4 py-3 font-semibold">Pack</th>
                    <th className="px-4 py-3 font-semibold hidden sm:table-cell">Qté</th>
                    <th className="px-4 py-3 font-semibold">Restant</th>
                    <th className="px-4 py-3 font-semibold">Statut</th>
                    <th className="px-4 py-3 font-semibold hidden md:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/50">
                  {batch.packLots.map((pl) => {
                    const remaining = pl.quantity - pl.allocations.reduce((s, a) => s + a.quantity, 0);
                    const statusEntry = PACK_LOT_STATUSES.find((s) => s.value === pl.status);
                    return (
                      <tr key={pl.id} className="group transition-colors hover:bg-paddy/[0.03]">
                        <td className="px-4 py-3 align-middle">
                          <Link href={`/admin/packs/${pl.id}`} className="font-mono-brand text-xs font-semibold text-paddy hover:text-paddy-deep hover:underline">
                            {pl.code}
                          </Link>
                        </td>
                        <td className="px-4 py-3 align-middle text-xs">{pl.pack.label}</td>
                        <td className="px-4 py-3 align-middle font-medium hidden sm:table-cell">{pl.quantity}</td>
                        <td className={`px-4 py-3 align-middle font-semibold ${remaining === 0 ? 'text-ink-muted' : remaining < 5 ? 'text-danger' : 'text-paddy-deep'}`}>{remaining}</td>
                        <td className="px-4 py-3 align-middle">
                          <Badge tone={(statusEntry?.badge === 'default' || !statusEntry?.badge ? 'neutral' : statusEntry.badge) as 'success' | 'warning' | 'danger' | 'info' | 'neutral'}>
                            {statusEntry?.label ?? pl.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 align-middle text-xs text-ink-muted hidden md:table-cell whitespace-nowrap">{formatDateTime(pl.packedAt)}</td>
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
                  <tr className="border-b border-line bg-ground/40 text-[11px] uppercase tracking-wide text-ink-muted">
                    <th className="px-4 py-3 font-semibold">Type</th>
                    <th className="px-4 py-3 font-semibold hidden sm:table-cell">Poids</th>
                    <th className="px-4 py-3 font-semibold hidden sm:table-cell">Épaisseur</th>
                    <th className="px-4 py-3 font-semibold hidden md:table-cell">Test étanchéité</th>
                    <th className="px-4 py-3 font-semibold">Statut</th>
                    <th className="px-4 py-3 font-semibold hidden lg:table-cell">Tests</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/50">
                  {batch.products.map((product) => (
                    <tr key={product.id} className="group transition-colors hover:bg-paddy/[0.03]">
                      <td className="px-4 py-3 align-middle">{labelOf(PRODUCT_TYPES, product.type)}</td>
                      <td className="px-4 py-3 align-middle text-ink-muted hidden sm:table-cell whitespace-nowrap">{formatNumber(product.weightG, 'g')}</td>
                      <td className="px-4 py-3 align-middle text-ink-muted hidden sm:table-cell whitespace-nowrap">{formatNumber(product.thicknessMm, 'mm')}</td>
                      <td className="px-4 py-3 align-middle hidden md:table-cell">{product.leakTest == null ? '—' : product.leakTest ? 'Étanche' : 'Fuite'}</td>
                      <td className="px-4 py-3 align-middle"><Badge tone={product.status === 'valide' ? 'success' : 'danger'}>{product.status === 'valide' ? 'Validé' : 'Rejeté'}</Badge></td>
                      <td className="px-4 py-3 align-middle text-ink-muted hidden lg:table-cell">{product.tests.length}</td>
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
