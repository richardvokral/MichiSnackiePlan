import Link from 'next/link';
import {
  listAiJobs,
  countAllPendingCandidates,
  countUnreviewedDraftIngredients,
  countPublishableDraftIngredients,
  countArchetypes,
  countGeneratedMealsByStatus,
  getAiConfig,
} from '@/lib/repository';
import AiGenerationDashboard from './AiGenerationDashboard';

export const dynamic = 'force-dynamic';

const TYPE_LABEL: Record<string, string> = {
  archetypes: 'Archetypes',
  meal_variants: 'Meal variants',
  extract_ingredients: 'Extract ingredients',
  ingredient_usda: 'USDA load',
  ingredient_review: 'Draft review',
  finalize_meals: 'Finalize meals',
};

const statusBadge = (status: string) => {
  const colors: Record<string, string> = {
    done: 'bg-green-100 text-green-700',
    running: 'bg-yellow-100 text-yellow-700',
    pending: 'bg-neutral-100 text-neutral-500',
    error: 'bg-red-100 text-red-700',
  };
  return colors[status] || 'bg-neutral-100 text-neutral-500';
};

export default async function AdminAiPage() {
  const [
    jobs,
    pending,
    unreviewedDrafts,
    publishableDrafts,
    archetypeCount,
    pendingCards,
    finalizedCards,
    rejectedCards,
    settings,
  ] = await Promise.all([
    listAiJobs(10),
    countAllPendingCandidates(),
    countUnreviewedDraftIngredients(),
    countPublishableDraftIngredients(),
    countArchetypes(),
    countGeneratedMealsByStatus('pending'),
    countGeneratedMealsByStatus('finalized'),
    countGeneratedMealsByStatus('rejected'),
    getAiConfig(),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-800">AI Studio</h1>
        <div className="flex items-center gap-4">
          <Link href="/admin/ai/archetypes" className="text-sm font-medium text-purple-600 hover:text-purple-800">
            Edit archetypes →
          </Link>
          <Link href="/admin/ai/settings" className="text-sm font-medium text-purple-600 hover:text-purple-800">
            Model settings →
          </Link>
        </div>
      </div>
      <p className="mt-2 text-sm text-neutral-500">
        Generating with <strong>{settings.provider}</strong> / <strong>{settings.model}</strong>. Items
        land as drafts for review under{' '}
        <Link href="/admin/ingredients?status=draft" className="text-purple-600 hover:underline">
          Ingredients
        </Link>{' '}
        and{' '}
        <Link href="/admin/meals?status=draft" className="text-purple-600 hover:underline">
          Meals
        </Link>
        .
      </p>

      <div className="mt-6">
        <AiGenerationDashboard
          archetypeCount={archetypeCount}
          pendingCards={pendingCards}
          finalizedCards={finalizedCards}
          rejectedCards={rejectedCards}
          pendingCandidates={pending}
          unreviewedDrafts={unreviewedDrafts}
          publishableDrafts={publishableDrafts}
        />
      </div>

      <h2 className="mt-8 text-lg font-semibold text-neutral-800">Recent jobs</h2>
      <div className="mt-3 space-y-2">
        {jobs.map((job) => (
          <div key={job.id} className="flex items-center gap-4 rounded-xl bg-white p-4 shadow-sm">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-neutral-800">{TYPE_LABEL[job.type] ?? job.type}</p>
              <p className="truncate text-xs text-neutral-400">
                {job.processedCount}/{job.targetCount} processed · {job.createdCount} created ·{' '}
                {job.errorCount} errors
                {job.lastError ? ` · ${job.lastError}` : ''}
              </p>
            </div>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(job.status)}`}>
              {job.status}
            </span>
          </div>
        ))}
        {jobs.length === 0 && <p className="py-8 text-center text-neutral-400">No jobs yet.</p>}
      </div>
    </div>
  );
}
