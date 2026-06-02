import 'server-only';
import { getDb } from '@/lib/db/client';

export interface Admin {
  email: string;
  addedBy: string | null;
  createdAt: string;
}

export async function listAdmins(): Promise<Admin[]> {
  const sql = getDb();
  const rows = await sql`SELECT email, added_by, created_at FROM admins ORDER BY created_at`;
  return rows.map((r) => ({
    email: r.email as string,
    addedBy: r.added_by as string | null,
    createdAt: r.created_at as string,
  }));
}

export async function addAdmin(email: string, addedBy: string): Promise<void> {
  const sql = getDb();
  await sql`
    INSERT INTO admins (email, added_by)
    VALUES (${email.toLowerCase()}, ${addedBy})
    ON CONFLICT (email) DO NOTHING
  `;
}

export async function removeAdmin(email: string): Promise<void> {
  const sql = getDb();
  await sql`DELETE FROM admins WHERE email = ${email.toLowerCase()}`;
}

export async function isAdminEmail(email: string): Promise<boolean> {
  const sql = getDb();
  const rows = await sql`SELECT 1 FROM admins WHERE email = ${email.toLowerCase()}`;
  return rows.length > 0;
}
