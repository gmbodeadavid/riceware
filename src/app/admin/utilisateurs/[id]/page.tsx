import { notFound } from 'next/navigation';
import { requireAdminPage } from '@/lib/admin-guard';
import { getUserById } from '@/lib/production/queries';
import { ROLE_OPTIONS } from '@/lib/rbac';
import { PageHeader } from '@/components/admin/ui';
import UserForm from '@/components/admin/UserForm';
import DeleteButton from '@/components/admin/DeleteButton';

type PageProps = { params: Promise<{ id: string }> };

export default async function EditUserPage({ params }: PageProps) {
  const session = await requireAdminPage('users:manage');
  const { id } = await params;
  const user = await getUserById(id);

  if (!user) notFound();

  const isCurrent = user.email === session.email || user.id === session.userId;

  return (
    <div>
      <PageHeader
        title={`Modifier · ${user.name}`}
        description={ROLE_OPTIONS.find((o) => o.value === user.role)?.description}
        breadcrumb={[
          { label: 'Tableau de bord', href: '/admin' },
          { label: 'Utilisateurs', href: '/admin/utilisateurs' },
          { label: user.name },
        ]}
      />

      <div className="rounded-panel border border-line bg-surface p-5 sm:p-6">
        <UserForm
          initial={{ id: user.id, name: user.name, email: user.email, role: user.role, active: user.active }}
        />

        {!isCurrent && (
          <div className="mt-5 pt-5 border-t border-line/60">
            <DeleteButton
              endpoint={`/api/admin/utilisateurs/${user.id}`}
              confirmation={`Supprimer le compte ${user.name} ?`}
              label="Supprimer ce compte"
              compact={false}
            />
          </div>
        )}
      </div>
    </div>
  );
}
