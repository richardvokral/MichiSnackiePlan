import { getMealValidationConfig } from '@/lib/repository';
import MealValidationForm from './MealValidationForm';

export const dynamic = 'force-dynamic';

export default async function MealRulesPage() {
  const config = await getMealValidationConfig();

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-800">Meal Rules</h1>
      <p className="mt-2 text-sm text-neutral-500">
        Validation rules applied when the AI pipeline finalizes generated meal cards. A card is rejected
        if its computed energy falls outside the range for its slot. Protein thresholds add tags to the
        finalized meal.
      </p>

      <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">
        <MealValidationForm config={config} />
      </div>
    </div>
  );
}
