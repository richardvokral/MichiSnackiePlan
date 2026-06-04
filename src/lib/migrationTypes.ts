// Plain (non-server) types shared between the migration runner (server) and the
// admin UI (client). Kept out of the server-only repository module so the client
// can import them without pulling in `server-only` code.

export type MigrationStepStatus = 'applied' | 'skipped' | 'failed';

export interface MigrationStepResult {
  version: string;
  status: MigrationStepStatus;
  statementsRun?: number;
  error?: string;
}

export interface VerifyCheckResult {
  label: string;
  ok: boolean;
  detail?: string;
}

export interface MigrationReport {
  steps: MigrationStepResult[];
  checks: VerifyCheckResult[];
  ok: boolean;
  message: string;
}

export interface MigrationStatusRow {
  version: string;
  applied: boolean;
  appliedAt: string | null;
}
