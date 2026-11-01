import { requireAdminPage } from '@/lib/admin-guard';

export default async function AdminArticlesLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPage('content:manage');
  return children;
}
