import Link from 'next/link';
import { requireAdminPage } from '@/lib/admin-guard';
import { getDashboardData } from '@/lib/production/queries';
import { computeCostPerUnit, computeRejectRate, computeYield, labelOf, LOT_STATUSES } from '@/lib/production/types';
import { formatCurrency, formatDate, formatDateTime, formatNumber, formatPercent } from '@/lib/format';
import { PageHeader, StatCard, Badge, Section, LinkButton, ProgressBar, EmptyState, KpiGroupLabel, AlertBanner } from '@/components/admin/ui';
import { LineChart, BarChart, DonutChart, RadialProgress } from '@/components/admin/charts';
import NotificationsPanel from '@/components/admin/NotificationsPanel';

// ── SVG Icons ──────────────────────────────────────────────────────────────────
function IconProduction() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="7" width="20" height="14" rx="2"/>
      <path d="M16 7V5a2 2 0 0 0-4 0v2M8 7V5a2 2 0 0 0-4 0v2"/>
      <line x1="12" y1="12" x2="12" y2="16"/>
      <line x1="10" y1="14" x2="14" y2="14"/>
    </svg>
  );
}
function IconReject() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  );
}
function IconCost() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/>
      <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/>
      <line x1="12" y1="6" x2="12" y2="8"/>
      <line x1="12" y1="16" x2="12" y2="18"/>
    </svg>
  );
}
function IconQuality() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
      <path d="m9 12 2 2 4-4"/>
    </svg>
  );
}
function IconRevenue() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="1" x2="12" y2="23"/>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  );
}
function IconOrders() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
  );
}
function IconStock() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
      <path d="m3.3 7 8.7 5 8.7-5"/>
      <line x1="12" y1="22" x2="12" y2="12"/>
    </svg>
  );
}
function IconPartners() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}

type PageProps = { searchParams: Promise<{ refus?: string }> };

export default async function AdminDashboardPage({ searchParams }: PageProps) {
  const session = await requireAdminPage('dashboard:view');
  const { refus } = await searchParams;
  const data = await getDashboardData();
  const kpis = data.kpis;

  const firstName = session.name.split(' ')[0];

  return (
    <div className="max-w-[1280px]">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <PageHeader
        title={`Bonjour, ${firstName} 👋`}
        description="Vue d'ensemble de la production, de la qualité, des stocks et des commandes RiceWare CI."
        actions={
          <>
            <LinkButton href="/admin/analytics">Analyses détaillées</LinkButton>
            <LinkButton href="/api/admin/exports/dashboard" target="_blank">Rapport PDF</LinkButton>
          </>
        }
      />

      {refus ? (
        <AlertBanner tone="danger">
          Votre rôle ne permet pas d'accéder à cette page.
        </AlertBanner>
      ) : null}

      {/* ── KPI Groupe 1 : Production ──────────────────────────────────────── */}
      <KpiGroupLabel>Production</KpiGroupLabel>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Production du jour"
          value={`${formatNumber(kpis.todayPieces)} pièces`}
          hint={`Semaine : ${formatNumber(kpis.weekPieces)} · Mois : ${formatNumber(kpis.monthPieces)}`}
          tone="paddy"
          icon={<IconProduction />}
          href="/admin/production"
        />
        <StatCard
          label="Taux de rebut (mois)"
          value={formatPercent(kpis.rejectRate)}
          hint={`Rendement ${formatPercent(kpis.yieldRate)} · ${formatNumber(kpis.monthRejects)} rebuts`}
          tone={kpis.rejectRate > 10 ? 'danger' : 'default'}
          icon={<IconReject />}
          href="/admin/qualite"
        />
        <StatCard
          label="Coût moyen / pièce"
          value={formatCurrency(kpis.costPerUnit)}
          hint={`Coût total du mois : ${formatCurrency(kpis.totalCostMonth)}`}
          icon={<IconCost />}
        />
        <StatCard
          label="Réussite qualité"
          value={formatPercent(kpis.testPassRate)}
          hint={`${kpis.testsPassed} succès · ${kpis.testsFailed} échec(s)`}
          tone={
            kpis.testsPassed + kpis.testsFailed
              ? kpis.testPassRate >= 90
                ? 'paddy'
                : 'warning'
              : 'default'
          }
          icon={<IconQuality />}
          href="/admin/qualite"
        />
      </div>

      {/* ── KPI Groupe 2 : Commerce ────────────────────────────────────────── */}
      <KpiGroupLabel>Commerce</KpiGroupLabel>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Chiffre d'affaires encaissé"
          value={formatCurrency(kpis.revenue)}
          hint={`${kpis.paidOrders} commande(s) payée(s) sur ${kpis.totalOrders}`}
          tone="paddy"
          icon={<IconRevenue />}
          href="/admin/commandes"
        />
        <StatCard
          label="Commandes reçues"
          value={kpis.totalOrders}
          hint={`${kpis.paidOrders} payées · ${kpis.totalOrders - kpis.paidOrders} en attente`}
          tone={kpis.totalOrders - kpis.paidOrders > 0 ? 'warning' : 'default'}
          icon={<IconOrders />}
          href="/admin/commandes"
        />
        <StatCard
          label="Alertes stock"
          value={kpis.lowStockCount}
          hint={kpis.lowStockCount ? 'Références sous le seuil minimum' : 'Tous les seuils respectés'}
          tone={kpis.lowStockCount ? 'warning' : 'default'}
          icon={<IconStock />}
          href="/admin/stocks"
        />
        <StatCard
          label="Partenaires actifs"
          value={kpis.activePartners}
          hint={`${kpis.activeRizeries} rizerie(s) · ${formatNumber(kpis.totalLotsWeight, 'kg')} de coques`}
          icon={<IconPartners />}
          href="/admin/partenaires"
        />
      </div>

      {/* ── Graphiques principaux ──────────────────────────────────────────── */}
      <div className="mt-6 grid gap-5 xl:grid-cols-[1.65fr_1fr]">
        <Section
          title="Production par semaine"
          description="Pièces produites au cours des 8 dernières semaines."
          actions={<LinkButton href="/admin/production">Voir la production</LinkButton>}
        >
          <LineChart
            data={data.weekly.map((w) => ({ label: w.label, value: w.pieces, detail: `${w.rejects} rebuts` }))}
            unit="pièces"
          />
        </Section>

        <Section
          title="Objectif Greenpreneur"
          description={data.activeGoal?.label ?? 'Cible de production cumulée.'}
          actions={<LinkButton href="/admin/rapports">Objectifs</LinkButton>}
        >
          <div className="flex flex-col items-center gap-5 py-2">
            <RadialProgress
              value={kpis.totalPiecesForGoal}
              max={kpis.greenpreneurTarget}
              label={`${formatNumber(kpis.totalPiecesForGoal)} / ${formatNumber(kpis.greenpreneurTarget)}`}
              sublabel="pièces suivies"
            />
            <ProgressBar value={kpis.greenpreneurProgress} label="Avancement" size="md" />
            <div className="grid grid-cols-2 gap-3 w-full text-sm">
              <div className="rounded-xl border border-line bg-ground/60 p-3">
                <p className="text-xs text-ink-muted">Lots suivis</p>
                <p className="mt-1 font-semibold text-ink text-lg">{kpis.totalLots}</p>
              </div>
              <div className="rounded-xl border border-line bg-ground/60 p-3">
                <p className="text-xs text-ink-muted">Coques reçues</p>
                <p className="mt-1 font-semibold text-ink text-lg">{formatNumber(kpis.totalLotsWeight, 'kg')}</p>
              </div>
            </div>
            {data.activeGoal?.description && (
              <p className="text-xs text-ink-muted text-center">
                {data.activeGoal.description}
                {data.activeGoal.endDate ? ` Échéance : ${formatDate(data.activeGoal.endDate)}.` : ''}
              </p>
            )}
          </div>
        </Section>
      </div>

      {/* ── Graphiques secondaires ─────────────────────────────────────────── */}
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Section
          title="Répartition des rebuts"
          description="Causes déclarées sur les 8 dernières semaines."
          actions={<LinkButton href="/admin/qualite">Qualité</LinkButton>}
        >
          <DonutChart
            data={data.rejectCauses.map((c) => ({ label: c.label, value: c.quantity }))}
            centerLabel="rebuts"
            centerValue={formatNumber(data.rejectCauses.reduce((t, c) => t + c.quantity, 0))}
          />
        </Section>

        <Section
          title="Évolution du coût de revient"
          description="Coût moyen par pièce valide — 6 derniers mois."
          actions={<LinkButton href="/admin/analytics">Analyses</LinkButton>}
        >
          <BarChart
            data={data.monthly.map((m) => ({ label: m.label, value: Math.round(m.costPerUnit) }))}
            unit="FCFA"
            color="#8a6a36"
          />
        </Section>
      </div>

      {/* ── Alertes + Stocks ───────────────────────────────────────────────── */}
      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1.2fr]">
        <Section
          title="Alertes"
          description="Stocks bas, rebuts excessifs et échecs qualité."
          actions={<LinkButton href="/admin/stocks">Stocks</LinkButton>}
        >
          <NotificationsPanel notifications={data.notifications} />
        </Section>

        <Section
          title="Stocks sous seuil"
          description="Références à réapprovisionner en priorité."
          actions={
            <LinkButton href="/api/admin/exports/stocks" target="_blank">Inventaire PDF</LinkButton>
          }
        >
          {data.lowStocks.length === 0 ? (
            <EmptyState
              title="Aucune alerte"
              description="Tous les stocks sont au-dessus de leur seuil minimum."
            />
          ) : (
            <ul className="divide-y divide-line">
              {data.lowStocks.map((stock) => {
                const pct = stock.minThreshold > 0
                  ? Math.min(100, (stock.quantity / stock.minThreshold) * 100)
                  : 100;
                return (
                  <li key={stock.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                      <div>
                        <p className="text-sm font-semibold text-ink">{stock.label}</p>
                        <p className="text-xs text-ink-muted">
                          Seuil min. : {formatNumber(stock.minThreshold, stock.unit)}
                        </p>
                      </div>
                      <Badge tone="warning">{formatNumber(stock.quantity, stock.unit)}</Badge>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-grain/70">
                      <div
                        className="h-full rounded-full bg-husk-deep transition-all"
                        style={{ width: `${Math.max(2, pct)}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>
      </div>

      {/* ── Dernières activités ────────────────────────────────────────────── */}
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        {/* Derniers batches */}
        <Section
          title="Derniers batches"
          description="Production récente et rendement."
          actions={<LinkButton href="/admin/production">Tout voir</LinkButton>}
        >
          {data.recentBatches.length === 0 ? (
            <EmptyState
              title="Aucun batch"
              description="Commencez par enregistrer un lot de coques puis un batch de production."
              action={<LinkButton href="/admin/production" variant="primary">Saisir un batch</LinkButton>}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line bg-ground/40 text-[11px] uppercase tracking-wide text-ink-muted">
                    <th className="px-4 py-3 font-semibold">Batch</th>
                    <th className="px-4 py-3 font-semibold hidden sm:table-cell">Date</th>
                    <th className="px-4 py-3 font-semibold">Pièces</th>
                    <th className="px-4 py-3 font-semibold">Rendement</th>
                    <th className="px-4 py-3 font-semibold hidden md:table-cell">Coût / pièce</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/50">
                  {data.recentBatches.slice(0, 5).map((batch) => (
                    <tr key={batch.id} className="group transition-colors hover:bg-paddy/[0.03]">
                      <td className="px-4 py-3 align-middle">
                        <Link
                          href={`/admin/production/${batch.id}`}
                          className="font-mono-brand text-xs font-semibold text-paddy hover:text-paddy-deep hover:underline"
                        >
                          {batch.code}
                        </Link>
                        <p className="mt-0.5 text-[11px] text-ink-muted">{batch.lot?.code ?? 'sans lot'}</p>
                      </td>
                      <td className="px-4 py-3 align-middle text-ink-muted text-xs hidden sm:table-cell whitespace-nowrap">{formatDate(batch.startedAt)}</td>
                      <td className="px-4 py-3 align-middle font-medium">{batch.piecesProduced}</td>
                      <td className="px-4 py-3 align-middle">
                        <Badge
                          tone={computeRejectRate(batch.piecesProduced, batch.rejects) > 10 ? 'danger' : 'success'}
                        >
                          {formatPercent(computeYield(batch.piecesProduced, batch.rejects))}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 align-middle text-ink-muted text-xs hidden md:table-cell">
                        {formatCurrency(computeCostPerUnit(batch))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        {/* Derniers lots */}
        <Section
          title="Derniers lots reçus"
          description="Traçabilité des coques à la réception."
          actions={<LinkButton href="/admin/lots">Tout voir</LinkButton>}
        >
          {data.recentLots.length === 0 ? (
            <EmptyState
              title="Aucun lot"
              description="Enregistrez la première réception de coques."
              action={<LinkButton href="/admin/lots" variant="primary">Saisir un lot</LinkButton>}
            />
          ) : (
            <ul className="divide-y divide-line">
              {data.recentLots.slice(0, 5).map((lot) => (
                <li
                  key={lot.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
                >
                  <div>
                    <Link
                      href={`/admin/lots/${lot.id}`}
                      className="font-mono-brand text-xs font-semibold text-paddy hover:underline"
                    >
                      {lot.code}
                    </Link>
                    <p className="text-xs text-ink-muted">{formatDateTime(lot.receivedAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-ink">{formatNumber(lot.netWeightKg, 'kg')}</span>
                    <Badge tone={lot.status === 'accepted' ? 'success' : 'danger'}>
                      {labelOf(LOT_STATUSES, lot.status)}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}
