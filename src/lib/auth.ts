import 'server-only';
import { getLogtoContext } from '@logto/next/server-actions';
import { logtoConfig, isLogtoConfigured } from './logto';
import { isAdminEmail } from './repository/admins';

export interface SessionUser {
  id: string;
  email: string | null;
  name: string | null;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  if (!isLogtoConfigured) return null;
  try {
    const ctx = await getLogtoContext(logtoConfig);
    if (!ctx.isAuthenticated || !ctx.claims?.sub) return null;
    return {
      id: ctx.claims.sub,
      email: ctx.claims.email ?? null,
      name: ctx.claims.name ?? null,
    };
  } catch {
    // Never let an auth hiccup take down the whole app — fall back to anonymous.
    return null;
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized: sign-in required');
  return user;
}

export async function isAdmin(email: string | null): Promise<boolean> {
  if (!email) return false;
  const firstAdmin = process.env.FIRST_ADMIN_EMAIL;
  if (firstAdmin && email.toLowerCase() === firstAdmin.toLowerCase()) return true;
  return isAdminEmail(email);
}

export async function requireAdmin(): Promise<SessionUser> {
  // TODO(LOGTO): AUTH_ENABLED gates real enforcement. While false, admin is a
  // dev pass-through so the panel is reachable without a configured tenant.
  const authEnabled = process.env.AUTH_ENABLED === 'true';
  if (!authEnabled) {
    return {
      id: 'dev-admin',
      email: process.env.FIRST_ADMIN_EMAIL ?? 'admin@localhost',
      name: 'Dev Admin',
    };
  }

  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized: sign-in required');
  if (!(await isAdmin(user.email))) {
    throw new Error('Forbidden: not an admin');
  }
  return user;
}
