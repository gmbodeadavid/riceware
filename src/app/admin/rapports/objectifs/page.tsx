import { requireAdminPage } from '@/lib/admin-guard';
import { listGoals } from '@/lib/production/queries';
import { formatNumber, formatDate } from '@/lib/format';
import { PageHeader, Badge, EmptyState, Section } from '@/components/admin/ui';
import { ExpandableRow } from '@/components/admin/ExpandableRow';
import GoalForm from '@/components/admin/GoalForm';
import DeleteButton from '@/components/admin/DeleteButton';

export default async function ObjectifsPage() {
  await requireAdminPage('settings:manage');
  const goals = await listGoals();

  return (
    <div>
      <PageHeader
        title="Objectifs"
        breadcrumb={[
          { label: 'Tableau de bord', href: '/admin' },
          { label: 'Rapports', href: '/admin/rapports' },
          { label: 'Objectifs' },
        ]}
      />

      {/* Tableau des objectifs existants */}
      {goals.length === 0 ? (
        <EmptyState
          title="Aucun objectif"
          description="Créez un premier objectif ci-dessous."
        />
      ) : (
        <div className="mb-5 overflow-x-auto rounded-panel border border-line bg-surface">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-ground/40 text-[11px] uppercase tracking-wide text-ink-muted">
                <th className="px-4 py-3 font-semibold">Objectif</th>
                <th className="px-4 py-3 font-semibold hidden sm:table-cell">Cible</th>
                <th className="px-4 py-3 font-semibold hidden md:table-cell">Métrique</th>
                <th className="px-4 py-3 font-semibold hidden lg:table-cell">Période</th>
                <th className="px-4 py-3 font-semibold">Statut</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/50">
              {goals.map((goal) => (
                <ExpandableRow
                  key={goal.id}
                  colSpan={6}
                  editLabel="Modifier"
                  cells={
                    <>
                      <td className="px-4 py-3 align-middle">
                        <p className="font-semibold text-ink">{goal.label}</p>
                        {goal.description ? <p className="text-xs text-ink-muted line-clamp-1">{goal.description}</p> : null}
                      </td>
                      <td className="px-4 py-3 align-middle text-xs text-ink-muted hidden sm:table-cell whitespace-nowrap">
                        {formatNumber(goal.target, goal.unit)}
                      </td>
                      <td className="px-4 py-3 align-middle text-xs text-ink-muted hidden md:table-cell">
                        {goal.metric}
                      </td>
                      <td className="px-4 py-3 align-middle text-xs text-ink-muted hidden lg:table-cell whitespace-nowrap">
                        {formatDate(goal.startDate)}
                        {goal.endDate ? ` → ${formatDate(goal.endDate)}` : ''}
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <Badge
                          tone={
                            goal.status === 'active' ? 'success'
                            : goal.status === 'achieved' ? 'info'
                            : 'neutral'
                          }
                        >
                          {goal.status === 'active' ? 'Actif' : goal.status === 'achieved' ? 'Atteint' : 'Archivé'}
                        </Badge>
                      </td>
                    </>
                  }
                  form={
                    <div>
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
                      <div className="mt-3 pt-3 border-t border-line/60">
                        <DeleteButton
                          endpoint={`/api/admin/objectifs/${goal.id}`}
                          confirmation={`Supprimer l'objectif ${goal.label} ?`}
                          label="Supprimer cet objectif"
                          compact={false}
                        />
                      </div>
                    </div>
                  }
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Nouvel objectif */}
      <Section title="Nouvel objectif">
        <GoalForm />
      </Section>
    </div>
  );
}
