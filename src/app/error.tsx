'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-6 text-center">
      <div className="max-w-md">
        <div className="mb-4 text-5xl">🍽️</div>
        <h1 className="text-xl font-bold text-neutral-800">This page couldn&apos;t load</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Something went wrong while loading your meals. This is usually a
          database or configuration issue.
        </p>

        <div className="mt-4 rounded-lg bg-red-50 p-4 text-left">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
            Error details
          </p>
          <p className="mt-1 break-words font-mono text-xs text-red-600">
            {error.message || 'Unknown error'}
          </p>
          {error.digest && (
            <p className="mt-1 font-mono text-[10px] text-red-400">
              digest: {error.digest}
            </p>
          )}
        </div>

        <div className="mt-4 rounded-lg bg-white p-4 text-left text-xs text-neutral-500 shadow-sm">
          <p className="font-semibold text-neutral-700">Troubleshooting checklist</p>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            <li>
              Run <code className="rounded bg-neutral-100 px-1">db/schema.sql</code> in
              the Neon SQL console to create the tables.
            </li>
            <li>
              Run <code className="rounded bg-neutral-100 px-1">scripts/import-initial-meals.sql</code> to
              load the starter meals.
            </li>
            <li>
              Verify <code className="rounded bg-neutral-100 px-1">DATABASE_URL</code> is
              set correctly in your Vercel environment variables.
            </li>
            <li>
              Visit <code className="rounded bg-neutral-100 px-1">/api/health</code> for
              a detailed diagnostic report.
            </li>
          </ul>
        </div>

        <button
          onClick={reset}
          className="mt-6 rounded-full bg-purple-600 px-6 py-3 text-sm font-semibold text-white hover:bg-purple-700"
        >
          Reload
        </button>
      </div>
    </div>
  );
}
