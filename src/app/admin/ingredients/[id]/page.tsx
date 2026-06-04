import { getIngredientById } from '@/lib/repository';
import { notFound } from 'next/navigation';
import IngredientForm from '@/app/admin/ingredients/IngredientForm';
import { updateIngredientAction, deleteIngredientAction } from '@/app/admin/ingredients/actions';

export default async function EditIngredientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ingredient = await getIngredientById(id);
  if (!ingredient) notFound();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-800">Edit: {ingredient.name}</h1>
        <form action={deleteIngredientAction}>
          <input type="hidden" name="id" value={ingredient.id} />
          <button type="submit" className="text-sm text-red-500 hover:text-red-700">
            Delete
          </button>
        </form>
      </div>
      <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">
        <IngredientForm
          ingredient={ingredient}
          action={updateIngredientAction}
          submitLabel="Save Changes"
        />
      </div>
    </div>
  );
}
