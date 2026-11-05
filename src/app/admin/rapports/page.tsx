import { requireAdminPage } from '@/lib/admin-guard';
import { can } from '@/lib/rbac';
import { getDashboardData, listAuditLogs } from '@/lib/production/queries';
import { formatCurrency, formatDate, formatDateTime, formatNumber, formatPercent } from '@/lib/format';
import { PageHeader, StatCard, Badge, EmptyState, LinkButton, Section, ProgressBar, AlertBanner } from '@/components/admin/ui';
import GoalForm from '@/components/admin/GoalForm';
import DeleteButton from '@/components/admin/DeleteButton';
import { LuDownload, LuFileText } from 'react-icons/lu';

const REPORT_LINKS = [
  {
    title: 'Tableau de bord',
    description: 'Synthèse PDF des KPI de production, qualité, stocks et objectif Greenpreneur.',
    href: '/api/admin/exports/dashboard',
    format: 'PDF',
    color: '#b3401f',
  },
  {
    title: 'Lots de coques',
    description: 'Traçabilité complète des réceptions, rizeries, poids, humidité et statuts.',
    href: '/api/admin/exports/lots?format=csv',
    format: 'CSV',
    secondaryHref: '/api/admin/exports/lots?format=xls',
    secondaryFormat: 'Excel',
    color: '#2f6b43',
  },
  {
    title: 'Batches de production',
    description: 'Paramètres machine, rendement, rebuts, coûts et opérateurs.',
    href: '/api/admin/exports/batches?format=csv',
    format: 'CSV',
    secondaryHref: '/api/admin/exports/batches?format=xls',
    secondaryFormat: 'Excel',
    color: '#1a7a9e',
  },
  {
    title: 'Inventaire des stocks',
    description: 'État des stocks, seuils, emplacements et derniers mouvements.',
    href: '/api/admin/exports/stocks?format=pdf',
    format: 'PDF',
    secondaryHref: '/api/admin/exports/stocks?format=csv',
    secondaryFormat: 'CSV',
    color: '#7f610a',
  },
  {
    title: 'Tests qualité',
    description: 'Résultats de charge, étanchéité et contrôle visuel avec défauts observés.',
    href: '/api/admin/exports/tests?format=csv',
    format: 'CSV',
    secondaryHref: '/api/admin/exports/tests?format=xls',
    secondaryFormat: 'Excel',
    color: '#5a6456',
  },
  {
    title: 'Commandes',
    description: 'Demandes clients, canaux, statuts de paiement et montants.',
    href: '/api/admin/exports/orders?format=csv',
    format: 'CSV',
    secondaryHref: '/api/admin/exports/orders?format=xls',
    secondaryFormat: 'Excel',
    color: '#7c5cbf',
  },
];

const FORMAT_BADGE: Record<string, { tone: 'danger' | 'success' | 'info' | 'warning' | 'neutral' }> = {
  PDF: { tone: 'danger' },
  CSV: { tone: 'success' },
  Excel: { tone: 'info' },
};

export default async function ReportsPage() {
  const session = await requireAdminPage('reports:view');
  const canManage = can(session.role, 'settings:manage');
  const [data, audits] = await Promise.all([getDashboardData(), listAuditLogs(40)]);
  const kpis = data.kpis;

  return (
    <div>
      <PageHeader
        title="Rapports et objectifs"
        description="Exports opérationnels, suivi des objectifs et journal d'audit. Les documents PDF et Excel sont générés à la demande depuis la base."
        breadcrumb={[{ label: 'Tableau de bord', href: '/admin' }, { label: 'Rapports' }]}
        actions={
          <LinkButton href="/api/admin/exports/dashboard" target="_blank">
            Rapport PDF global
          </LinkButton>
        }
      />

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Production du mois"
          value={formatNumber(kpis.monthPieces, 'pièces')}
          hint={`Rendement ${formatPercent(kpis.yieldRate)} · rebut ${formatPercent(kpis.rejectRate)}`}
          tone="paddy"
        />
        <StatCard
          label="Coût moyen / pièce"
          value={formatCurrency(kpis.costPerUnit)}
          hint={`${formatCurrency(kpis.totalCostMonth)} sur le mois`}
        />
        <StatCard
          label="Qualité"
          value={formatPercent(kpis.testPassRate)}
          hint={`${kpis.testsPassed} succès · ${kpis.testsFailed} échec(s)`}
          tone={kpis.testPassRate < 90 && kpis.testsPassed + kpis.testsFailed > 0 ? 'warning' : 'default'}
        />
        <StatCard
          label="Encaissements"
          value={formatCurrency(kpis.revenue)}
          hint={`${kpis.paidOrders} commande(s) payée(s)`}
          tone="paddy"
        />
      </div>

      {/* Exports */}
      <div className="mt-6">
        <Section
          title="Exports disponibles"
          description="Chaque export reprend les filtres standards du module correspondant."
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {REPORT_LINKS.map((report) => {
              const badgeTone = FORMAT_BADGE[report.format]?.tone ?? 'neutral';
              return (
                <article
                  key={report.title}
                  className="flex flex-col rounded-xl border border-line bg-ground/50 p-4 hover:border-line/80 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div
                      className="flex size-9 items-center justify-center rounded-xl shrink-0"
                      style={{ background: `${report.color}15`, color: report.color }}
                    >
                      <LuFileText size={16} aria-hidden="true" />
                    </div>
                    <Badge tone={badgeTone}>{report.format}</Badge>
                  </div>
                  <h3 className="font-display text-sm font-semibold text-ink mt-2">{report.title}</h3>
                  <p className="mt-1 flex-1 text-xs text-ink-muted leading-relaxed">{report.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <a
                      href={report.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 min-h-8 rounded-lg border border-line bg-surface px-3 py-1 text-xs font-semibold text-ink transition-all hover:border-paddy/50 hover:text-paddy shadow-sm"
                    >
                      <LuDownload size={12} aria-hidden="true" />
                      {report.format}
                    </a>
                    {report.secondaryHref ? (
                      <a
                        href={report.secondaryHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 min-h-8 rounded-lg border border-line bg-surface px-3 py-1 text-xs font-semibold text-ink transition-all hover:border-paddy/50 hover:text-paddy shadow-sm"
                      >
                        <LuDownload size={12} aria-hidden="true" />
                        {report.secondaryFormat}
                      </a>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </Section>
      </div>

      {/* Greenpreneur objective + goals list */}
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Section
          title="Objectif Greenpreneur"
          description={data.activeGoal?.label ?? 'Cible de production cumulée.'}
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="font-display text-3xl font-bold text-ink">{formatNumber(kpis.totalPiecesForGoal)}</p>
                <p className="text-sm text-ink-muted">pièces suivies sur une cible de {formatNumber(kpis.greenpreneurTarget)}</p>
              </div>
              <Badge tone={kpis.greenpreneurProgress >= 100 ? 'success' : 'info'}>
                {formatPercent(kpis.greenpreneurProgress)}
              </Badge>
            </div>
            <ProgressBar value={kpis.greenpreneurProgress} label="Avancement" size="lg" />
            {data.activeGoal ? (
              <div className="rounded-xl border border-paddy/20 bg-paddy/5 p-4 text-sm">
                <p className="font-semibold text-paddy-deep">{data.activeGoal.label}</p>
                <p className="mt-1 text-ink-muted text-xs">
                  Cible : {formatNumber(data.activeGoal.target, data.activeGoal.unit)} · Début : {formatDate(data.activeGoal.startDate)}
                  {data.activeGoal.endDate ? ` · Échéance : ${formatDate(data.activeGoal.endDate)}` : ''}
                </p>
                {data.activeGoal.description ? (
                  <p className="mt-2 text-ink-muted text-xs">{data.activeGoal.description}</p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-ink-muted">
                Aucun objectif personnalisé actif. La cible par défaut des paramètres est utilisée.
              </p>
            )}
          </div>
        </Section>

        <Section
          title="Cibles et objectifs"
          description="Un seul objectif actif est mis en avant sur le tableau de bord."
        >
          {data.goals.length === 0 ? (
            <EmptyState
              title="Aucun objectif"
              description="Créez un objectif de production, de collecte ou de partenariats."
            />
          ) : (
            <ul className="divide-y divide-line">
              {data.goals.slice(0, 8).map((goal) => (
                <li key={goal.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-ink">{goal.label}</p>
                      <p className="text-xs text-ink-muted mt-0.5">
                        {formatNumber(goal.target, goal.unit)} · {formatDate(goal.startDate)}
                        {goal.endDate ? ` → ${formatDate(goal.endDate)}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        tone={
                          goal.status === 'active' ? 'success'
                          : goal.status === 'achieved' ? 'info'
                          : 'neutral'
                        }
                      >
                        {goal.status === 'active' ? 'Actif' : goal.status === 'achieved' ? 'Atteint' : 'Archivé'}
                      </Badge>
                      {canManage ? (
                        <DeleteButton
                          endpoint={`/api/admin/objectifs/${goal.id}`}
                          confirmation={`Supprimer l'objectif ${goal.label} ?`}
                          label="Suppr."
                        />
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      {/* Goal edit forms (admin only) */}
      {canManage ? (
        <div className="mt-6 space-y-3">
          {data.goals.map((goal) => (
            <article key={goal.id} className="rounded-panel border border-line bg-surface">
              <div className="grid gap-6 p-4 sm:p-5 lg:grid-cols-[1.4fr_1fr]">
                {/* ── Résumé de l'objectif ── */}
                <div>
                  <p className="font-display text-base font-semibold text-ink">{goal.label}</p>
                  {goal.description ? <p className="mt-1 text-sm text-ink-muted">{goal.description}</p> : null}
                  <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                    <div><dt className="inline text-ink-muted">Cible : </dt><dd className="inline font-medium">{formatNumber(goal.target, goal.unit)}</dd></div>
                    <div><dt className="inline text-ink-muted">Métrique : </dt><dd className="inline">{goal.metric}</dd></div>
                    {goal.startDate ? <div><dt className="inline text-ink-muted">Début : </dt><dd className="inline">{formatDate(goal.startDate)}</dd></div> : null}
                    {goal.endDate ? <div><dt className="inline text-ink-muted">Échéance : </dt><dd className="inline">{formatDate(goal.endDate)}</dd></div> : null}
                  </dl>
                </div>
                {/* ── Formulaire d'édition toujours visible ── */}
                <div className="border-t border-line pt-4 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">Modifier l'objectif</p>
                  <GoalForm
                    initial={{
                      id: goal.id,
                      label: goal.label,
                      description: goal.description,
                      metric: goal.metric,
                      target: goal.target,
                      unit: goal.unit,
                      startDate: goal.startDate,
                      endDate: goal.endDate,
                      status: goal.status,
                    }}
                  />
                </div>
              </div>
            </article>
          ))}
          <div className="rounded-panel border border-line bg-surface p-4 sm:p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">Nouvel objectif</p>
            <GoalForm />
          </div>
        </div>
      ) : null}

      {/* Audit log */}
      <div className="mt-6">
        <Section
          title="Journal d'audit"
          description="Dernières modifications sensibles enregistrées par le back-office."
        >
          {audits.length === 0 ? (
            <EmptyState
              title="Aucun évènement"
              description="Les créations, modifications et suppressions apparaîtront ici."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line bg-ground/40 text-[11px] uppercase tracking-wide text-ink-muted">
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Auteur</th>
                    <th className="px-4 py-3 font-semibold">Action</th>
                    <th className="px-4 py-3 font-semibold hidden sm:table-cell">Entité</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/50">
                  {audits.map((audit) => (
                    <tr key={audit.id} className="group transition-colors hover:bg-paddy/[0.03]">
                      <td className="px-4 py-3 align-middle text-xs text-ink-muted whitespace-nowrap">
                        {formatDateTime(audit.createdAt)}
                      </td>
                      <td className="px-4 py-3 align-middle font-medium">{audit.user?.name ?? audit.actorName}</td>
                      <td className="px-4 py-3 align-middle">
                        <Badge
                          tone={
                            audit.action === 'delete' ? 'danger'
                            : audit.action === 'create' ? 'success'
                            : 'info'
                          }
                        >
                          {audit.action}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 align-middle text-ink-muted text-xs hidden sm:table-cell">
                        {audit.entityType}
                        {audit.entityId ? ` · ${audit.entityId}` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}
