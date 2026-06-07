import Link from 'next/link';
import { listArchetypes } from '@/lib/repository';
import {
  createArchetypeAction,
  updateArchetypeAction,
  toggleArchetypeAction,
  deleteArchetypeAction,
} from './actions';

export const dynamic = 'force-dynamic';

const SLOT_HINTS = ['breakfast', 'snack', 'lunch', 'dinner'];
const inputClass =
  'w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm focus:border-purple-500 focus:outline-none';

export default async function ArchetypesPage() {
  const archetypes = await listArchetypes();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-800">Meal Archetypes</h1>
        <Link href="/admin/ai" className="text-sm text-neutral-400 hover:text-neutral-600">
          ‹ AI Studio
        </Link>
      </div>
      <p className="mt-2 text-sm text-neutral-500">
        Reusable dish templates. The variants step generates several concrete meals per enabled
        archetype. {archetypes.length} archetype(s).
      </p>

      {/* Add new */}
      <form action={createArchetypeAction} className="mt-6 rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-neutral-700">Add archetype</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
          <input name="name" placeholder="Name (e.g. Yogurt bowl)" required className={inputClass} />
          <select name="slotHint" defaultValue="breakfast" className={inputClass}>
            {SLOT_HINTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input name="example" placeholder="Example (Greek yogurt + berries…)" className={inputClass} />
          <input name="description" placeholder="Description (optional)" className={inputClass} />
        </div>
        <button
          type="submit"
          className="mt-3 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
        >
          Add
        </button>
      </form>

      {/* Existing */}
      <div className="mt-4 space-y-2">
        {archetypes.map((a) => (
          <div key={a.id} className="rounded-xl bg-white p-4 shadow-sm">
            <form action={updateArchetypeAction} className="grid grid-cols-1 items-center gap-2 sm:grid-cols-4">
              <input type="hidden" name="id" value={a.id} />
              <input name="name" defaultValue={a.name} className={inputClass} />
              <select name="slotHint" defaultValue={a.slotHint ?? 'breakfast'} className={inputClass}>
                {SLOT_HINTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <input name="example" defaultValue={a.example} className={inputClass} />
              <input name="description" defaultValue={a.description} className={inputClass} />
              <div className="flex items-center gap-2 sm:col-span-4">
                <button
                  type="submit"
                  className="rounded px-3 py-1 text-xs font-semibold text-purple-700 hover:bg-purple-50"
                >
                  Save
                </button>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    a.enabled ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-500'
                  }`}
                >
                  {a.enabled ? 'enabled' : 'disabled'}
                </span>
              </div>
            </form>
            <div className="mt-1 flex gap-2">
              <form action={toggleArchetypeAction}>
                <input type="hidden" name="id" value={a.id} />
                <button type="submit" className="rounded px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-100">
                  {a.enabled ? 'Disable' : 'Enable'}
                </button>
              </form>
              <form action={deleteArchetypeAction}>
                <input type="hidden" name="id" value={a.id} />
                <button type="submit" className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50">
                  Delete
                </button>
              </form>
            </div>
          </div>
        ))}
        {archetypes.length === 0 && (
          <p className="py-8 text-center text-neutral-400">
            No archetypes yet — generate them from the AI Studio, or add one above.
          </p>
        )}
      </div>
    </div>
  );
}
