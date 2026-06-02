import 'server-only';
import { isAdminEmail } from '@/lib/repository/admins';

export async function getCurrentUser(): Promise<{ email: string } | null> {
  // TODO(LOGTO): Read session from Logto. For now, return the bootstrap admin.
  const email = process.env.FIRST_ADMIN_EMAIL;
  if (!email) return null;
  return { email };
}

export async function isAdmin(email: string): Promise<boolean> {
  const firstAdmin = process.env.FIRST_ADMIN_EMAIL;
  if (firstAdmin && email.toLowerCase() === firstAdmin.toLowerCase()) return true;
  return isAdminEmail(email);
}

export async function requireAdmin(): Promise<{ email: string }> {
  // TODO(LOGTO): When AUTH_ENABLED=true, check real session and redirect/403.
  const authEnabled = process.env.AUTH_ENABLED === 'true';
  if (!authEnabled) {
    const email = process.env.FIRST_ADMIN_EMAIL || 'admin@localhost';
    return { email };
  }

  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized: no user session');
  const admin = await isAdmin(user.email);
  if (!admin) throw new Error('Forbidden: not an admin');
  return user;
}
