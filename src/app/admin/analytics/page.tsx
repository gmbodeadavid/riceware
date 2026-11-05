import Link from 'next/link';
import { requireAdminPage } from '@/lib/admin-guard';
import {
  ANALYTICS_RANGES,
  analyticsRangeFromParam,
  getAnalyticsData,
} from '@/lib/production/queries';
import { formatCurrency, formatDate, formatNumber, formatPercent } from '@/lib/format';
import {
  Badge,
  EmptyState,
  LinkButton,
  PageHeader,
  ProgressBar,
  Section,
  StatCard,
  AlertBanner,
} from '@/components/admin/ui';
import { BarChart, DonutChart, LineChart } from '@/components/admin/charts';
import { buttonClassName } from '@/components/admin/fields';

type PageProps = {
  searchParams: Promise<{ periode?: string }>;
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  received: 'Reçue',
  pending_confirmation: 'À confirmer',
  confirmed: 'Confirmée',
  preparing: 'En préparation',
  shipped: 'Expédiée',
  delivered: 'Livrée',
  cancelled: 'Annulée',
};

const STOCK_STATUS = {
  rupture: { label: 'Rupture', tone: 'danger' as const },
  bas: { label: 'Sous seuil', tone: 'warning' as const },
  ok: { label: 'Disponible', tone: 'success' as const },
};

function orderTone(status: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  if (status === 'delivered') return 'success';
  if (status === 'cancelled') return 'danger';
  if (status === 'pending_confirmation' || status === 'preparing') return 'warning';
  if (status === 'received' || status === 'confirmed' || status === 'shipped') return 'info';
  return 'neutral';
}

function Comparison({
  value,
  unit = '%',
  invert = false,
}: {
  value: number | null;
  unit?: string;
  invert?: boolean;
}) {
  if (value === null) {
    return <span className="text-ink-muted">Nouveau sur la période</span>;
  }

  const positive = invert ? value < 0 : value > 0;
  const negative = invert ? value > 0 : value < 0;
  const sign = value > 0 ? '+' : '';
  const arrow = positive ? '↑' : negative ? '↓' : '→';

  return (
    <span className={`inline-flex items-center gap-0.5 ${positive ? 'text-paddy-deep' : negative ? 'text-danger' : 'text-ink-muted'}`}>
      <span>{arrow}</span>
      {sign}{value.toFixed(1).replace('.', ',')} {unit} vs période précédente
    </span>
  );
}

export default async function AnalyticsPage({ searchParams }: PageProps) {
  await requireAdminPage('dashboard:view');
  const params = await searchParams;
  const days = analyticsRangeFromParam(params.periode);
  const data = await getAnalyticsData(days);
  const kpis = data.kpis;
  const totalRejects = data.rejectCauses.reduce((total, cause) => total + cause.quantity, 0);
  const maxProductPieces = Math.max(1, ...data.productMix.map((product) => product.pieces));
  const maxProductCost = Math.max(1, ...data.topCostBatches.map((batch) => batch.costPerUnit));

  return (
    <div>
      <PageHeader
        title="Analyses & performance"
        description={`Du ${formatDate(data.from)} au ${formatDate(data.to)}. Production, coûts, qualité, matière première, stocks et commandes sur la période sélectionnée.`}
        breadcrumb={[
          { label: 'Tableau de bord', href: '/admin' },
          { label: 'Analyses' },
        ]}
        actions={
          <>
            <LinkButton href="/api/admin/exports/dashboard" target="_blank">
              Rapport PDF
            </LinkButton>
            <LinkButton href="/admin">Vue d'ensemble</LinkButton>
          </>
        }
      />

      {/* Period selector */}
      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-panel border border-line bg-surface p-3 shadow-sm">
        <span className="px-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">Période</span>
        {ANALYTICS_RANGES.map((range) => (
          <Link
            key={range}
            href={`/admin/analytics?periode=${range}`}
            className={buttonClassName(range === days ? 'primary' : 'secondary', 'min-h-9 px-3 py-1.5 text-xs')}
            aria-current={range === days ? 'page' : undefined}
          >
            {range} jours
          </Link>
        ))}
        <span className="ml-auto px-1 text-xs text-ink-muted">
          {formatNumber(kpis.batches)} batch(es) · {formatNumber(kpis.testsPassed + kpis.testsFailed)} test(s)
        </span>
      </div>

      {data.activeGoal ? (
        <AlertBanner tone="success">
          <span className="font-semibold">Objectif actif :</span>{' '}
          {data.activeGoal.label} — cible de {formatNumber(data.activeGoal.target, data.activeGoal.unit)}
          {data.activeGoal.endDate ? `, échéance ${formatDate(data.activeGoal.endDate)}` : ''}.
        </AlertBanner>
      ) : null}

      {/* KPIs — grille unifiée 8 cartes, hauteur égale par rangée (h-full sur StatCard) */}
      <div className="grid gap-3 grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Pièces produites"
          value={formatNumber(kpis.pieces)}
          hint={
            <>
              {formatNumber(kpis.valid)} valides · {formatNumber(kpis.rejects)} rebuts
              <br />
              <Comparison value={data.comparison.pieces} />
            </>
          }
          tone="paddy"
        />
        <StatCard
          label="Rendement matière"
          value={formatPercent(kpis.yieldRate)}
          hint={
            <>
              Taux de rebut : {formatPercent(kpis.rejectRate)}
              <br />
              <Comparison value={data.comparison.rejectRate} unit="pts" invert />
            </>
          }
        />
        <StatCard
          label="Coût moyen / pièce"
          value={formatCurrency(kpis.costPerUnit)}
          hint={
            <>
              Coût total : {formatCurrency(kpis.totalCost)}
              <br />
              <Comparison value={data.comparison.costPerUnit} invert />
            </>
          }
        />
        <StatCard
          label="Réussite qualité"
          value={formatPercent(kpis.passRate)}
          hint={
            <>
              {kpis.testsPassed} succès · {kpis.testsFailed} échec(s)
              <br />
              <Comparison value={data.comparison.passRate} unit="pts" />
            </>
          }
          tone={kpis.testsPassed + kpis.testsFailed > 0 && kpis.passRate < 90 ? 'warning' : 'default'}
        />
        <StatCard
          label="Chiffre d'affaires encaissé"
          value={formatCurrency(kpis.revenue)}
          hint={
            <>
              {kpis.paidOrders} commande(s) payée(s) sur {kpis.totalOrders}
              <br />
              <Comparison value={data.comparison.revenue} />
            </>
          }
        />
        <StatCard
          label="Coques reçues"
          value={formatNumber(kpis.totalLotsWeight, 'kg')}
          hint={
            <>
              {kpis.lots} lot(s) accepté(s) · {kpis.refusedLots} refusé(s)
              <br />
              <Comparison value={data.comparison.lotsWeight} />
            </>
          }
        />
        <StatCard
          label="Stocks à surveiller"
          value={kpis.lowStockCount}
          hint={`${kpis.activeRizeries} rizerie(s) active(s) · ${kpis.activePartners} partenaire(s)`}
          tone={kpis.lowStockCount ? 'warning' : 'default'}
        />
        <StatCard
          label="Commandes reçues"
          value={formatNumber(kpis.totalOrders)}
          hint={`${kpis.paidOrders} payée(s) · ${formatCurrency(kpis.revenue)} encaissés`}
        />
      </div>

      {/* Charts: production trend + cost */}
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Section
          title="Production sur la période"
          description={days <= 90 ? 'Pièces produites par semaine.' : 'Pièces produites par mois.'}
          actions={<LinkButton href="/admin/production">Détail production</LinkButton>}
        >
          {kpis.batches === 0 ? (
            <EmptyState title="Aucune production" description="Aucun batch n'a été enregistré sur cette période." />
          ) : (
            <LineChart
              data={data.trend.map((point) => ({
                label: point.label,
                value: point.pieces,
                detail: `${formatNumber(point.rejects)} rebuts · ${formatCurrency(point.costPerUnit)} / pièce`,
              }))}
              unit="pièces"
            />
          )}
        </Section>

        <Section
          title="Coût de revient"
          description="Coût moyen par pièce valide sur la période."
          actions={<LinkButton href="/admin/rapports">Rapports</LinkButton>}
        >
          {kpis.batches === 0 ? (
            <EmptyState title="Aucun coût" description="Les coûts apparaîtront après le premier batch." />
          ) : (
            <BarChart
              data={data.trend.map((point) => ({
                label: point.label,
                value: Math.round(point.costPerUnit),
              }))}
              unit="FCFA"
              color="#8a6a36"
            />
          )}
        </Section>
      </div>

      {/* Product mix + reject causes */}
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Section
          title="Mix produits"
          description="Répartition des volumes et performance par type de produit."
        >
          {data.productMix.length === 0 ? (
            <EmptyState title="Aucun produit fabriqué" description="Aucun batch sur la période." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line bg-ground/40 text-[11px] uppercase tracking-wide text-ink-muted">
                    <th className="px-4 py-3 font-semibold">Produit</th>
                    <th className="px-4 py-3 font-semibold hidden sm:table-cell">Batches</th>
                    <th className="px-4 py-3 font-semibold">Pièces</th>
                    <th className="px-4 py-3 font-semibold">Rendement</th>
                    <th className="px-4 py-3 font-semibold hidden md:table-cell">Coût / pce</th>
                    <th className="px-4 py-3 font-semibold hidden lg:table-cell">Volume</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/50">
                  {data.productMix.map((product) => (
                    <tr key={product.type} className="group transition-colors hover:bg-paddy/[0.03]">
                      <td className="px-4 py-3 align-middle font-medium">{product.label}</td>
                      <td className="px-4 py-3 align-middle text-ink-muted hidden sm:table-cell">{product.batches}</td>
                      <td className="px-4 py-3 align-middle">{formatNumber(product.pieces)}</td>
                      <td className="px-4 py-3 align-middle">
                        <Badge tone={product.yieldRate >= 90 ? 'success' : 'warning'}>
                          {formatPercent(product.yieldRate)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 align-middle text-ink-muted hidden md:table-cell">{formatCurrency(product.costPerUnit)}</td>
                      <td className="px-4 py-3 align-middle hidden lg:table-cell w-28">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-grain/70">
                          <div
                            className="h-full rounded-full bg-paddy transition-all"
                            style={{ width: `${Math.max(2, (product.pieces / maxProductPieces) * 100)}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section
          title="Causes de rebut"
          description="Volume de rebuts déclaré sur la période."
          actions={<LinkButton href="/admin/qualite">Qualité</LinkButton>}
        >
          <DonutChart
            data={data.rejectCauses.map((cause) => ({ label: cause.label, value: cause.quantity }))}
            centerLabel="rebuts"
            centerValue={formatNumber(totalRejects)}
          />
        </Section>
      </div>

      {/* Quality + orders pipeline */}
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Section
          title="Qualité par type de test"
          description="Taux de réussite et volume de contrôles."
          actions={<LinkButton href="/admin/qualite">Qualité</LinkButton>}
        >
          {kpis.testsPassed + kpis.testsFailed === 0 ? (
            <EmptyState title="Aucun test qualité" description="Aucun contrôle n'a été enregistré sur la période." />
          ) : (
            <ul className="space-y-4">
              {data.qualityByType.map((test) => (
                <li key={test.type}>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium">{test.label}</span>
                    <span className="text-xs text-ink-muted">
                      {test.passed} succès · {test.failed} échec(s) · {test.total} test(s)
                    </span>
                  </div>
                  <ProgressBar value={test.passRate} label={`Réussite ${formatPercent(test.passRate)}`} />
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section
          title="Commandes par statut"
          description="Volume et montant des demandes reçues sur la période."
          actions={<LinkButton href="/admin/commandes">Commandes</LinkButton>}
        >
          {data.orderPipeline.length === 0 ? (
            <EmptyState title="Aucune commande" description="Aucune demande n'a été reçue sur la période." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line bg-ground/40 text-[11px] uppercase tracking-wide text-ink-muted">
                    <th className="px-4 py-3 font-semibold">Statut</th>
                    <th className="px-4 py-3 font-semibold">Commandes</th>
                    <th className="px-4 py-3 font-semibold">Montant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/50">
                  {data.orderPipeline.map((row) => (
                    <tr key={row.status} className="group transition-colors hover:bg-paddy/[0.03]">
                      <td className="px-4 py-3 align-middle">
                        <Badge tone={orderTone(row.status)}>
                          {ORDER_STATUS_LABELS[row.status] ?? row.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 align-middle font-medium">{row.count}</td>
                      <td className="px-4 py-3 align-middle text-ink-muted">{formatCurrency(row.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>

      {/* Rizeries performance + stock health */}
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Section
          title="Performance des rizeries"
          description="Volume de coques accepté et régularité des réceptions."
          actions={<LinkButton href="/admin/rizieries">Rizeries</LinkButton>}
        >
          {data.rizeriePerformance.length === 0 ? (
            <EmptyState title="Aucune réception" description="Aucun lot de coques sur la période." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line bg-ground/40 text-[11px] uppercase tracking-wide text-ink-muted">
                    <th className="px-4 py-3 font-semibold">Rizerie</th>
                    <th className="px-4 py-3 font-semibold hidden sm:table-cell">Lots</th>
                    <th className="px-4 py-3 font-semibold">Poids accepté</th>
                    <th className="px-4 py-3 font-semibold hidden md:table-cell">Dernière réception</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/50">
                  {data.rizeriePerformance.slice(0, 8).map((rizerie) => (
                    <tr key={rizerie.id} className="group transition-colors hover:bg-paddy/[0.03]">
                      <td className="px-4 py-3 align-middle">
                        <p className="font-medium">{rizerie.name}</p>
                        <p className="text-xs text-ink-muted">{rizerie.location}</p>
                      </td>
                      <td className="px-4 py-3 align-middle hidden sm:table-cell">
                        {rizerie.lots}
                        {rizerie.refused > 0 ? (
                          <span className="ml-1 text-xs text-danger">({rizerie.refused} refusé(s))</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 align-middle font-medium whitespace-nowrap">{formatNumber(rizerie.weightKg, 'kg')}</td>
                      <td className="px-4 py-3 align-middle text-ink-muted text-xs hidden md:table-cell whitespace-nowrap">{formatDate(rizerie.lastReceivedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section
          title="État des stocks"
          description="Références triées par criticité."
          actions={<LinkButton href="/admin/stocks">Stocks</LinkButton>}
        >
          {data.stockHealth.length === 0 ? (
            <EmptyState title="Aucun stock" description="Créez les références de stock dans le module Stocks." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line bg-ground/40 text-[11px] uppercase tracking-wide text-ink-muted">
                    <th className="px-4 py-3 font-semibold">Référence</th>
                    <th className="px-4 py-3 font-semibold">Quantité</th>
                    <th className="px-4 py-3 font-semibold hidden sm:table-cell">Seuil</th>
                    <th className="px-4 py-3 font-semibold">État</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/50">
                  {data.stockHealth.map((stock) => {
                    const status = STOCK_STATUS[stock.status];
                    return (
                      <tr key={stock.id} className="group transition-colors hover:bg-paddy/[0.03]">
                        <td className="px-4 py-3 align-middle">
                          <p className="font-medium">{stock.label}</p>
                          <p className="text-xs text-ink-muted">{stock.location ?? '—'}</p>
                        </td>
                        <td className="px-4 py-3 align-middle font-medium whitespace-nowrap">{formatNumber(stock.quantity, stock.unit)}</td>
                        <td className="px-4 py-3 align-middle text-ink-muted hidden sm:table-cell whitespace-nowrap">
                          {stock.minThreshold > 0 ? formatNumber(stock.minThreshold, stock.unit) : '—'}
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <Badge tone={status.tone}>{status.label}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>

      {/* Top cost batches */}
      <div className="mt-6">
        <Section
          title="Batches les plus coûteux"
          description="Coût de revient par pièce valide sur la période."
          actions={<LinkButton href="/admin/production">Production</LinkButton>}
        >
          {data.topCostBatches.length === 0 ? (
            <EmptyState title="Aucun batch" description="Les batches apparaîtront ici après la première production." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line bg-ground/40 text-[11px] uppercase tracking-wide text-ink-muted">
                    <th className="px-4 py-3 font-semibold">Batch</th>
                    <th className="px-4 py-3 font-semibold hidden sm:table-cell">Date</th>
                    <th className="px-4 py-3 font-semibold hidden sm:table-cell">Produit</th>
                    <th className="px-4 py-3 font-semibold hidden md:table-cell">Pièces</th>
                    <th className="px-4 py-3 font-semibold">Rebut</th>
                    <th className="px-4 py-3 font-semibold">Coût / pièce</th>
                    <th className="px-4 py-3 font-semibold hidden lg:table-cell">Niveau</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/50">
                  {data.topCostBatches.map((batch) => (
                    <tr key={batch.id} className="group transition-colors hover:bg-paddy/[0.03]">
                      <td className="px-4 py-3 align-middle">
                        <Link
                          href={`/admin/production/${batch.id}`}
                          className="font-mono-brand text-xs font-semibold text-paddy hover:text-paddy-deep hover:underline"
                        >
                          {batch.code}
                        </Link>
                      </td>
                      <td className="px-4 py-3 align-middle text-ink-muted text-xs hidden sm:table-cell whitespace-nowrap">{formatDate(batch.startedAt)}</td>
                      <td className="px-4 py-3 align-middle hidden sm:table-cell">{batch.productLabel}</td>
                      <td className="px-4 py-3 align-middle hidden md:table-cell">{formatNumber(batch.piecesProduced)}</td>
                      <td className="px-4 py-3 align-middle">
                        <Badge tone={batch.rejectRate > 10 ? 'danger' : 'neutral'}>
                          {formatPercent(batch.rejectRate)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 align-middle font-medium whitespace-nowrap">{formatCurrency(batch.costPerUnit)}</td>
                      <td className="px-4 py-3 align-middle hidden lg:table-cell w-28">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-grain/70">
                          <div
                            className="h-full rounded-full bg-bran transition-all"
                            style={{ width: `${Math.max(2, (batch.costPerUnit / maxProductCost) * 100)}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>

      <p className="mt-5 text-xs text-ink-muted">
        Les montants sont exprimés en FCFA. Les comparaisons portent sur la période précédente de même durée.
        Données générées le {formatDate(data.generatedAt)}.
      </p>
    </div>
  );
}
