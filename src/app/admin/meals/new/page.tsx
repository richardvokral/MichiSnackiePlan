import MealForm from '@/app/admin/meals/MealForm';
import { createMealAction } from '@/app/admin/actions';
import { listIngredients } from '@/lib/repository';

export default async function NewMealPage() {
  const allIngredients = await listIngredients();
  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-800">Create New Meal</h1>
      <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">
        <MealForm action={createMealAction} submitLabel="Create Meal" allIngredients={allIngredients} />
      </div>
    </div>
  );
}
