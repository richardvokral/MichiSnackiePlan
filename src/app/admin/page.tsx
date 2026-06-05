import { getAllMeals, listAdmins, listIngredients } from '@/lib/repository';
import Link from 'next/link';

export default async function AdminDashboard() {
  const [meals, admins, ingredients] = await Promise.all([getAllMeals(), listAdmins(), listIngredients()]);

  const published = meals.filter((m) => m.status === 'published').length;
  const draft = meals.filter((m) => m.status === 'draft').length;
  const inactive = meals.filter((m) => m.status === 'inactive').length;

  const ingPublished = ingredients.filter((i) => i.status === 'published').length;
  const ingDraft = ingredients.filter((i) => i.status === 'draft').length;

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-800">Dashboard</h1>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link href="/admin/meals?status=published" className="rounded-xl bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-3xl font-bold text-green-600">{published}</p>
          <p className="mt-1 text-sm text-neutral-500">Published meals</p>
        </Link>
        <Link href="/admin/meals?status=draft" className="rounded-xl bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-3xl font-bold text-yellow-600">{draft}</p>
          <p className="mt-1 text-sm text-neutral-500">Draft meals</p>
        </Link>
        <Link href="/admin/meals?status=inactive" className="rounded-xl bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-3xl font-bold text-neutral-400">{inactive}</p>
          <p className="mt-1 text-sm text-neutral-500">Inactive meals</p>
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link href="/admin/ingredients?status=published" className="rounded-xl bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-3xl font-bold text-green-600">{ingPublished}</p>
          <p className="mt-1 text-sm text-neutral-500">Published ingredients</p>
        </Link>
        <Link href="/admin/ingredients?status=draft" className="rounded-xl bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-3xl font-bold text-yellow-600">{ingDraft}</p>
          <p className="mt-1 text-sm text-neutral-500">Draft ingredients (awaiting review)</p>
        </Link>
      </div>

      <div className="mt-4 rounded-xl bg-white p-6 shadow-sm">
        <p className="text-lg font-semibold text-neutral-700">{admins.length} admin(s)</p>
        <p className="text-sm text-neutral-400">
          Bootstrap: {process.env.FIRST_ADMIN_EMAIL || 'not set'}
        </p>
      </div>
    </div>
  );
}
