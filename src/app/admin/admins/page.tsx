import { listAdmins } from '@/lib/repository';
import { addAdminAction, removeAdminAction } from '@/app/admin/actions';

export default async function AdminsPage() {
  const admins = await listAdmins();
  const firstAdmin = process.env.FIRST_ADMIN_EMAIL?.toLowerCase();

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-800">Admin Users</h1>

      <div className="mt-4 rounded-xl bg-purple-50 p-4 text-sm text-purple-700">
        Bootstrap admin: <strong>{firstAdmin || 'not set'}</strong> (always has access via env var)
      </div>

      <div className="mt-6 space-y-2">
        {admins.map((admin) => (
          <div key={admin.email} className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm">
            <div>
              <p className="font-medium text-neutral-800">{admin.email}</p>
              <p className="text-xs text-neutral-400">
                Added by {admin.addedBy || 'system'} on {new Date(admin.createdAt).toLocaleDateString()}
              </p>
            </div>
            {admin.email.toLowerCase() !== firstAdmin ? (
              <form action={removeAdminAction}>
                <input type="hidden" name="email" value={admin.email} />
                <button type="submit" className="text-sm text-red-500 hover:text-red-700">
                  Remove
                </button>
              </form>
            ) : (
              <span className="text-xs text-neutral-400">Bootstrap (cannot remove)</span>
            )}
          </div>
        ))}
        {admins.length === 0 && (
          <p className="py-8 text-center text-neutral-400">No admins in the database yet. The bootstrap admin has access via env var.</p>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-neutral-800">Add Admin</h2>
        <form action={addAdminAction} className="mt-3 flex gap-3">
          <input
            name="email"
            type="email"
            placeholder="email@example.com"
            required
            className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
          />
          <button type="submit" className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700">
            Add
          </button>
        </form>
      </div>
    </div>
  );
}
