import { requireAdminPage } from '@/lib/admin-guard';
import { listUsers } from '@/lib/production/queries';
import { ROLE_LABELS, ROLE_OPTIONS, type AdminRole } from '@/lib/rbac';
import { formatDateTime } from '@/lib/format';
import { PageHeader, StatCard, Badge, EmptyState } from '@/components/admin/ui';
import UserForm from '@/components/admin/UserForm';
import DeleteButton from '@/components/admin/DeleteButton';

export default async function UsersPage() {
  const session = await requireAdminPage('users:manage');
  const users = await listUsers();
  const active = users.filter((user) => user.active).length;

  return (
    <div>
      <PageHeader
        title="Utilisateurs et rôles"
        description="Comptes nominatifs du back-office. Les permissions sont appliquées côté page et côté API pour chaque rôle."
        breadcrumb={[{ label: 'Tableau de bord', href: '/admin' }, { label: 'Utilisateurs' }]}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatCard label="Comptes" value={users.length} hint={`${active} actif(s)`} />
        <StatCard label="Administrateurs" value={users.filter((user) => user.role === 'admin').length} hint="Accès complet et configuration" tone="paddy" />
        <StatCard label="Comptes inactifs" value={users.length - active} hint="Connexion refusée" tone={users.length - active ? 'warning' : 'default'} />
      </div>

      <div className="mb-5">
        <UserForm />
      </div>

      {users.length === 0 ? (
        <EmptyState title="Aucun compte" description="Créez un premier compte nominatif. Le mot de passe historique reste disponible en secours." />
      ) : (
        <div className="space-y-3">
          {users.map((user) => {
            const isCurrent = user.email === session.email || user.id === session.userId;
            return (
              <article key={user.id} className="rounded-panel border border-line bg-surface">
                <div className="grid gap-6 p-4 sm:grid-cols-[1fr_auto] sm:p-5 lg:grid-cols-[1.4fr_1fr]">
                  {/* ── Infos ── */}
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-lg font-semibold">{user.name}</h2>
                      <Badge tone={user.active ? 'success' : 'neutral'}>{user.active ? 'Actif' : 'Inactif'}</Badge>
                      <Badge tone={user.role === 'admin' ? 'warning' : 'info'}>{ROLE_LABELS[user.role as AdminRole] ?? user.role}</Badge>
                      {isCurrent ? <Badge tone="success">Vous</Badge> : null}
                    </div>
                    <p className="mt-1 text-sm text-ink-muted">{user.email}</p>
                    <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                      <div><dt className="inline text-ink-muted">Dernière connexion : </dt><dd className="inline">{user.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'Jamais'}</dd></div>
                      <div><dt className="inline text-ink-muted">Créé le : </dt><dd className="inline">{formatDateTime(user.createdAt)}</dd></div>
                      <div><dt className="inline text-ink-muted">Batches saisis : </dt><dd className="inline">{user._count.batches}</dd></div>
                      <div><dt className="inline text-ink-muted">Tests qualité : </dt><dd className="inline">{user._count.tests}</dd></div>
                    </dl>
                    <p className="mt-3 text-xs text-ink-muted">{ROLE_OPTIONS.find((option) => option.value === user.role)?.description}</p>
                  </div>

                  {/* ── Formulaire d'édition toujours visible ── */}
                  <div className="border-t border-line pt-4 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-5 lg:pl-6">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">Modifier le compte</p>
                    <UserForm
                      initial={{
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        active: user.active,
                      }}
                    />
                    {!isCurrent ? (
                      <div className="mt-3 pt-3 border-t border-line/60">
                        <DeleteButton endpoint={`/api/admin/utilisateurs/${user.id}`} confirmation={`Supprimer le compte ${user.name} ?`} label="Supprimer ce compte" compact={false} />
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <p className="mt-5 text-xs text-ink-muted">
        Le compte administrateur historique (mot de passe partagé) reste utilisable pour le dépannage. Désactivez-le dans la configuration du serveur une fois les comptes nominatifs déployés.
      </p>
    </div>
  );
}
