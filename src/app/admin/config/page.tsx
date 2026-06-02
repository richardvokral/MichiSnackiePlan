import { getRecommendationConfig } from '@/lib/repository';
import { DEFAULT_RECOMMENDATION_CONFIG } from '@/lib/recommendationConfig';
import ConfigForm from './ConfigForm';
import { updateConfigAction } from '@/app/admin/actions';

export default async function ConfigPage() {
  const config = await getRecommendationConfig();

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-800">Recommendation Model</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Adjust how Michi recommends the next meal. Penalties are negative, rewards are positive.
      </p>
      <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">
        <ConfigForm
          config={config}
          defaults={DEFAULT_RECOMMENDATION_CONFIG}
          action={updateConfigAction}
        />
      </div>
    </div>
  );
}
