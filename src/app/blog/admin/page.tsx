import { redirect } from 'next/navigation';

export default function BlogAdminPage() {
  redirect('/blog/admin/articles');
}
