import { redirect } from 'next/navigation';
import { getAdminSession, type AdminSession } from '@/lib/admin-auth';
import { can, type Permission } from '@/lib/rbac';

/**
 * Garde des pages du back-office. Redirige vers la connexion si la session
 * n’existe pas, ou vers le tableau de bord si le rôle n’a pas la permission.
 */
export async function requireAdminPage(permission: Permission): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');
  if (!can(session.role, permission)) redirect('/admin?refus=1');
  return session;
}

/**
 * Variante sans redirection, utile pour les pages publiques qui adaptent leur
 * affichage quand un administrateur est connecté.
 */
export async function optionalAdminSession(): Promise<AdminSession | null> {
  return getAdminSession();
}
