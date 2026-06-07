import { getMigrationStatus } from '@/lib/repository';
import MigrationRunner from './MigrationRunner';
import ClearDataPanel from './ClearDataPanel';

export const dynamic = 'force-dynamic';

export default async function MigrationsPage() {
  const status = await getMigrationStatus();
  const dbConfigured = Boolean(process.env.DATABASE_URL);

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-800">Migrations</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Bring the database schema up to date and confirm everything is in place.
      </p>

      <div className="mt-6">
        <MigrationRunner initialStatus={status} dbConfigured={dbConfigured} />
      </div>

      <div className="mt-6">
        <ClearDataPanel />
      </div>
    </div>
  );
}
