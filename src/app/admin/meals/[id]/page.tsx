import { getMealWithMeta } from '@/lib/repository';
import { notFound } from 'next/navigation';
import MealForm from '@/app/admin/meals/MealForm';
import { updateMealAction } from '@/app/admin/actions';

export default async function EditMealPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const meal = await getMealWithMeta(id);
  if (!meal) notFound();

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-800">Edit: {meal.name}</h1>
      <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">
        <MealForm
          meal={meal}
          action={updateMealAction}
          submitLabel="Save Changes"
        />
      </div>
    </div>
  );
}
