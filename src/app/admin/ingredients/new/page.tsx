import IngredientForm from '@/app/admin/ingredients/IngredientForm';
import { createIngredientAction } from '@/app/admin/ingredients/actions';

export default function NewIngredientPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-800">New Ingredient</h1>
      <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">
        <IngredientForm action={createIngredientAction} submitLabel="Create Ingredient" />
      </div>
    </div>
  );
}
