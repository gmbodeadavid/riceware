import { requireAdminPage } from '@/lib/admin-guard';
import { PageHeader } from '@/components/admin/ui';
import UserForm from '@/components/admin/UserForm';

export default async function NewUserPage() {
  await requireAdminPage('users:manage');

  return (
    <div>
      <PageHeader
        title="Créer un compte"
        description="Remplissez le formulaire pour créer un nouveau compte nominatif."
        breadcrumb={[
          { label: 'Tableau de bord', href: '/admin' },
          { label: 'Utilisateurs', href: '/admin/utilisateurs' },
          { label: 'Nouveau compte' },
        ]}
      />

      <div className="rounded-panel border border-line bg-surface p-5 sm:p-6">
        <UserForm />
      </div>
    </div>
  );
}
