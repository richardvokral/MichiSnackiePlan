import { getDb } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

interface Check {
  name: string;
  ok: boolean;
  detail?: string;
}

export async function GET() {
  const checks: Check[] = [];

  // 1. Env vars present (never expose values)
  checks.push({
    name: 'DATABASE_URL set',
    ok: Boolean(process.env.DATABASE_URL),
  });
  checks.push({
    name: 'FIRST_ADMIN_EMAIL set',
    ok: Boolean(process.env.FIRST_ADMIN_EMAIL),
  });
  checks.push({
    name: 'BLOB_READ_WRITE_TOKEN set',
    ok: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
  });
  checks.push({
    name: 'AUTH_ENABLED',
    ok: true,
    detail: process.env.AUTH_ENABLED === 'true' ? 'enabled' : 'disabled (pass-through)',
  });

  // 2. Database connection + tables
  if (process.env.DATABASE_URL) {
    try {
      const sql = getDb();
      await sql`SELECT 1`;
      checks.push({ name: 'Database connection', ok: true });

      const tableQueries: Record<string, () => Promise<Record<string, unknown>[]>> = {
        meals: () => sql`SELECT count(*)::int AS count FROM meals`,
        recommendation_config: () => sql`SELECT count(*)::int AS count FROM recommendation_config`,
        admins: () => sql`SELECT count(*)::int AS count FROM admins`,
      };

      for (const [table, query] of Object.entries(tableQueries)) {
        try {
          const rows = await query();
          const count = rows[0]?.count as number;
          checks.push({
            name: `Table "${table}"`,
            ok: true,
            detail: `${count} row(s)`,
          });
        } catch (err) {
          checks.push({
            name: `Table "${table}"`,
            ok: false,
            detail: err instanceof Error ? err.message : 'missing or inaccessible',
          });
        }
      }
    } catch (err) {
      checks.push({
        name: 'Database connection',
        ok: false,
        detail: err instanceof Error ? err.message : 'connection failed',
      });
    }
  } else {
    checks.push({
      name: 'Database connection',
      ok: false,
      detail: 'DATABASE_URL not set — cannot connect',
    });
  }

  const healthy = checks.every((c) => c.ok);

  return Response.json(
    {
      healthy,
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: healthy ? 200 : 503 },
  );
}
