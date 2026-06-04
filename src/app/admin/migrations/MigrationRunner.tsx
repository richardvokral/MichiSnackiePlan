'use client';

import { useState, useTransition } from 'react';
import { runMigrationsAction } from './actions';
import type { MigrationReport, MigrationStatusRow, MigrationStepStatus } from '@/lib/migrationTypes';

interface MigrationRunnerProps {
  initialStatus: MigrationStatusRow[];
  dbConfigured: boolean;
}

const STEP_BADGE: Record<MigrationStepStatus, string> = {
  applied: 'bg-green-100 text-green-700',
  skipped: 'bg-neutral-100 text-neutral-500',
  failed: 'bg-red-100 text-red-700',
};

export default function MigrationRunner({ initialStatus, dbConfigured }: MigrationRunnerProps) {
  const [report, setReport] = useState<MigrationReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await runMigrationsAction();
        setReport(result);
      } catch (e) {
        // Network / unexpected failure (the action itself reports SQL errors in the report).
        setError(e instanceof Error ? e.message : 'Unexpected error running migrations.');
      }
    });
  }

  // Per-version status to render: prefer the just-run report, else the initial DB state.
  const stepStatus = new Map(report?.steps.map((s) => [s.version, s]) ?? []);

  return (
    <div className="space-y-6">
      {!dbConfigured && (
        <div className="rounded-xl bg-yellow-50 p-4 text-sm text-yellow-800">
          <strong>DATABASE_URL is not set.</strong> Running migrations will fail until the database
          connection is configured for this environment.
        </div>
      )}

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-neutral-800">Database migrations</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Apply any pending migrations, then verify the schema. Safe to run repeatedly — applied
              migrations are skipped and every step is idempotent.
            </p>
          </div>
          <button
            type="button"
            onClick={run}
            disabled={pending}
            className="shrink-0 rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
          >
            {pending ? 'Running…' : 'Run migrations'}
          </button>
        </div>

        <div className="mt-5 divide-y divide-neutral-100 border-t border-neutral-100">
          {initialStatus.map((row) => {
            const step = stepStatus.get(row.version);
            const label = step
              ? step.status
              : row.applied
                ? 'applied'
                : 'pending';
            const badgeClass = step
              ? STEP_BADGE[step.status]
              : row.applied
                ? STEP_BADGE.applied
                : 'bg-yellow-100 text-yellow-700';
            return (
              <div key={row.version} className="flex items-center justify-between py-2.5">
                <div>
                  <span className="font-mono text-sm text-neutral-700">{row.version}</span>
                  {row.appliedAt && !step && (
                    <span className="ml-2 text-xs text-neutral-400">
                      applied {new Date(row.appliedAt).toLocaleString()}
                    </span>
                  )}
                  {step?.status === 'failed' && step.error && (
                    <p className="mt-1 text-xs text-red-600">{step.error}</p>
                  )}
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass}`}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {report && (
        <div
          className={`rounded-xl p-6 shadow-sm ${report.ok ? 'bg-green-50' : 'bg-red-50'}`}
        >
          <p className={`text-sm font-semibold ${report.ok ? 'text-green-800' : 'text-red-800'}`}>
            {report.ok ? '✓ ' : '✗ '}
            {report.message}
          </p>

          <div className="mt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Schema checks
            </h3>
            <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {report.checks.map((c) => (
                <div key={c.label} className="flex items-center gap-2 text-sm">
                  <span className={c.ok ? 'text-green-600' : 'text-red-600'}>{c.ok ? '✓' : '✗'}</span>
                  <span className="text-neutral-700">{c.label}</span>
                  {c.detail && <span className="text-xs text-red-500">({c.detail})</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
