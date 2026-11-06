import Link from 'next/link';
import { requireAdminPage } from '@/lib/admin-guard';
import { listUsers } from '@/lib/production/queries';
import { ROLE_LABELS, type AdminRole } from '@/lib/rbac';
import { formatDateTime } from '@/lib/format';
import { PageHeader, StatCard, Badge, EmptyState } from '@/components/admin/ui';

export default async function UsersPage() {
  const session = await requireAdminPage('users:manage');
  const users = await listUsers();
  const active = users.filter((user) => user.active).length;

  return (
    <div>
      <PageHeader
        title="Utilisateurs et rôles"
        breadcrumb={[{ label: 'Tableau de bord', href: '/admin' }, { label: 'Utilisateurs' }]}
        actions={
          <Link
            href="/admin/utilisateurs/nouveau"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-control bg-paddy px-4 py-2 text-sm font-semibold text-on-paddy transition-colors hover:bg-paddy-deep"
          >
            + Créer un compte
          </Link>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatCard label="Comptes" value={users.length} hint={`${active} actif(s)`} />
        <StatCard label="Administrateurs" value={users.filter((u) => u.role === 'admin').length} hint="Accès complet et configuration" tone="paddy" />
        <StatCard label="Comptes inactifs" value={users.length - active} hint="Connexion refusée" tone={users.length - active ? 'warning' : 'default'} />
      </div>

      {users.length === 0 ? (
        <EmptyState title="Aucun compte" description="Créez un premier compte nominatif." />
      ) : (
        <div className="overflow-x-auto rounded-panel border border-line bg-surface">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-ground/40 text-[11px] uppercase tracking-wide text-ink-muted">
                <th className="px-4 py-3 font-semibold">Nom</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold hidden sm:table-cell">Rôle</th>
                <th className="px-4 py-3 font-semibold hidden md:table-cell">Dernière connexion</th>
                <th className="px-4 py-3 font-semibold">Statut</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/50">
              {users.map((user) => {
                const isCurrent = user.email === session.email || user.id === session.userId;
                return (
                  <tr key={user.id} className="hover:bg-paddy/[0.03] transition-colors">
                    <td className="px-4 py-3 align-middle">
                      <p className="font-semibold text-ink">{user.name}</p>
                      {isCurrent && <span className="text-[11px] text-paddy-deep font-medium">Vous</span>}
                    </td>
                    <td className="px-4 py-3 align-middle text-xs text-ink-muted">{user.email}</td>
                    <td className="px-4 py-3 align-middle hidden sm:table-cell">
                      <Badge tone={user.role === 'admin' ? 'warning' : 'info'}>
                        {ROLE_LABELS[user.role as AdminRole] ?? user.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 align-middle text-xs text-ink-muted hidden md:table-cell whitespace-nowrap">
                      {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'Jamais'}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <Badge tone={user.active ? 'success' : 'neutral'}>
                        {user.active ? 'Actif' : 'Inactif'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <Link
                        href={`/admin/utilisateurs/${user.id}`}
                        className="inline-flex items-center gap-1 rounded-control border border-line px-2.5 py-1 text-xs font-semibold text-ink transition-colors hover:border-paddy hover:text-paddy"
                      >
                        ✎ Modifier
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-5 text-xs text-ink-muted">
        Le compte administrateur historique reste utilisable pour le dépannage. Désactivez-le une fois les comptes nominatifs déployés.
      </p>
    </div>
  );
}
