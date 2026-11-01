import { requireAdminPage } from '@/lib/admin-guard';
import { can } from '@/lib/rbac';
import { getDashboardData, listAuditLogs } from '@/lib/production/queries';
import { formatCurrency, formatDate, formatDateTime, formatNumber, formatPercent } from '@/lib/format';
import { PageHeader, StatCard, Badge, EmptyState, LinkButton, Section, ProgressBar } from '@/components/admin/ui';
import GoalForm from '@/components/admin/GoalForm';
import DeleteButton from '@/components/admin/DeleteButton';

const REPORT_LINKS = [
  {
    title: 'Tableau de bord',
    description: 'Synthèse PDF des KPI de production, qualité, stocks et objectif Greenpreneur.',
    href: '/api/admin/exports/dashboard',
    format: 'PDF',
  },
  {
    title: 'Lots de coques',
    description: 'Traçabilité complète des réceptions, rizeries, poids, humidité et statuts.',
    href: '/api/admin/exports/lots?format=csv',
    format: 'CSV',
    secondaryHref: '/api/admin/exports/lots?format=xls',
    secondaryFormat: 'Excel',
  },
  {
    title: 'Batches de production',
    description: 'Paramètres machine, rendement, rebuts, coûts et opérateurs.',
    href: '/api/admin/exports/batches?format=csv',
    format: 'CSV',
    secondaryHref: '/api/admin/exports/batches?format=xls',
    secondaryFormat: 'Excel',
  },
  {
    title: 'Inventaire des stocks',
    description: 'État des stocks, seuils, emplacements et derniers mouvements.',
    href: '/api/admin/exports/stocks?format=pdf',
    format: 'PDF',
    secondaryHref: '/api/admin/exports/stocks?format=csv',
    secondaryFormat: 'CSV',
  },
  {
    title: 'Tests qualité',
    description: 'Résultats de charge, étanchéité et contrôle visuel avec défauts observés.',
    href: '/api/admin/exports/tests?format=csv',
    format: 'CSV',
    secondaryHref: '/api/admin/exports/tests?format=xls',
    secondaryFormat: 'Excel',
  },
  {
    title: 'Commandes',
    description: 'Demandes clients, canaux, statuts de paiement et montants.',
    href: '/api/admin/exports/orders?format=csv',
    format: 'CSV',
    secondaryHref: '/api/admin/exports/orders?format=xls',
    secondaryFormat: 'Excel',
  },
];

export default async function ReportsPage() {
  const session = await requireAdminPage('reports:view');
  const canManage = can(session.role, 'settings:manage');
  const [data, audits] = await Promise.all([getDashboardData(), listAuditLogs(40)]);
  const kpis = data.kpis;

  return (
    <div>
      <PageHeader
        title="Rapports et objectifs"
        description="Exports opérationnels, suivi des objectifs et journal d’audit. Les documents PDF et Excel sont générés à la demande depuis la base."
        actions={<LinkButton href="/api/admin/exports/dashboard" target="_blank">Rapport PDF global</LinkButton>}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Production du mois" value={formatNumber(kpis.monthPieces, 'pièces')} hint={`Rendement ${formatPercent(kpis.yieldRate)} · rebut ${formatPercent(kpis.rejectRate)}`} tone="paddy" />
        <StatCard label="Coût moyen / pièce" value={formatCurrency(kpis.costPerUnit)} hint={`${formatCurrency(kpis.totalCostMonth)} sur le mois`} />
        <StatCard label="Qualité" value={formatPercent(kpis.testPassRate)} hint={`${kpis.testsPassed} succès · ${kpis.testsFailed} échec(s)`} />
        <StatCard label="Encaissements" value={formatCurrency(kpis.revenue)} hint={`${kpis.paidOrders} commande(s) payée(s)`} />
      </div>

      <div className="mt-6">
        <Section title="Exports disponibles" description="Chaque export reprend les filtres standards du module correspondant.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {REPORT_LINKS.map((report) => (
              <article key={report.title} className="flex flex-col rounded-panel border border-line bg-ground/50 p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display text-base font-semibold">{report.title}</h3>
                  <Badge tone="info">{report.format}</Badge>
                </div>
                <p className="mt-2 flex-1 text-sm text-ink-muted">{report.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <LinkButton href={report.href} target="_blank">{report.format}</LinkButton>
                  {report.secondaryHref ? (
                    <LinkButton href={report.secondaryHref} target="_blank">{report.secondaryFormat}</LinkButton>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </Section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Section title="Objectif Greenpreneur" description={data.activeGoal?.label ?? 'Cible de production cumulée.'}>
          <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="font-display text-3xl font-bold">{formatNumber(kpis.totalPiecesForGoal)}</p>
                <p className="text-sm text-ink-muted">pièces suivies sur une cible de {formatNumber(kpis.greenpreneurTarget)}</p>
              </div>
              <Badge tone={kpis.greenpreneurProgress >= 100 ? 'success' : 'info'}>{formatPercent(kpis.greenpreneurProgress)}</Badge>
            </div>
            <ProgressBar value={kpis.greenpreneurProgress} />
            {data.activeGoal ? (
              <div className="rounded-control border border-line bg-ground/60 p-3 text-sm">
                <p className="font-medium">{data.activeGoal.label}</p>
                <p className="mt-1 text-ink-muted">
                  Cible : {formatNumber(data.activeGoal.target, data.activeGoal.unit)} · Début : {formatDate(data.activeGoal.startDate)}
                  {data.activeGoal.endDate ? ` · Échéance : ${formatDate(data.activeGoal.endDate)}` : ''}
                </p>
                {data.activeGoal.description ? <p className="mt-2 text-ink-muted">{data.activeGoal.description}</p> : null}
              </div>
            ) : (
              <p className="text-sm text-ink-muted">
                Aucun objectif personnalisé actif. La cible par défaut des paramètres est utilisée.
              </p>
            )}
          </div>
        </Section>

        <Section title="Cibles et objectifs" description="Un seul objectif actif est mis en avant sur le tableau de bord.">
          {data.goals.length === 0 ? (
            <EmptyState title="Aucun objectif" description="Créez un objectif de production, de collecte ou de partenariats." />
          ) : (
            <ul className="divide-y divide-line">
              {data.goals.slice(0, 8).map((goal) => (
                <li key={goal.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{goal.label}</p>
                      <p className="text-xs text-ink-muted">
                        {formatNumber(goal.target, goal.unit)} · {formatDate(goal.startDate)}
                        {goal.endDate ? ` → ${formatDate(goal.endDate)}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={goal.status === 'active' ? 'success' : goal.status === 'achieved' ? 'info' : 'neutral'}>
                        {goal.status === 'active' ? 'Actif' : goal.status === 'achieved' ? 'Atteint' : 'Archivé'}
                      </Badge>
                      {canManage ? <DeleteButton endpoint={`/api/admin/objectifs/${goal.id}`} confirmation={`Supprimer l’objectif ${goal.label} ?`} label="Suppr." /> : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      {canManage ? (
        <div className="mt-6 space-y-4">
          {data.goals.map((goal) => (
            <details key={goal.id} className="rounded-panel border border-line bg-surface">
              <summary className="cursor-pointer px-5 py-3 text-sm font-semibold text-paddy">Modifier « {goal.label} »</summary>
              <div className="border-t border-line px-5 py-5">
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
            </details>
          ))}
          <GoalForm />
        </div>
      ) : null}

      <div className="mt-6">
        <Section title="Journal d’audit" description="Dernières modifications sensibles enregistrées par le back-office.">
          {audits.length === 0 ? (
            <EmptyState title="Aucun évènement" description="Les créations, modifications et suppressions apparaîtront ici." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
                    <th className="pb-2 pr-3">Date</th>
                    <th className="pb-2 pr-3">Auteur</th>
                    <th className="pb-2 pr-3">Action</th>
                    <th className="pb-2">Entité</th>
                  </tr>
                </thead>
                <tbody>
                  {audits.map((audit) => (
                    <tr key={audit.id} className="border-b border-line/60 last:border-0">
                      <td className="py-2.5 pr-3 text-xs text-ink-muted">{formatDateTime(audit.createdAt)}</td>
                      <td className="py-2.5 pr-3">{audit.user?.name ?? audit.actorName}</td>
                      <td className="py-2.5 pr-3"><Badge tone={audit.action === 'delete' ? 'danger' : audit.action === 'create' ? 'success' : 'info'}>{audit.action}</Badge></td>
                      <td className="py-2.5 text-ink-muted">{audit.entityType}{audit.entityId ? ` · ${audit.entityId}` : ''}</td>
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
