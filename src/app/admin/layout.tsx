import { requireAdmin } from '@/lib/auth';
import Link from 'next/link';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="min-h-screen bg-neutral-100">
      <nav className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-6 px-6 py-3">
          <Link href="/admin" className="text-lg font-bold text-purple-700">
            Michi Admin
          </Link>
          <Link href="/admin/meals" className="text-sm font-medium text-neutral-600 hover:text-purple-600">
            Meals
          </Link>
          <Link href="/admin/config" className="text-sm font-medium text-neutral-600 hover:text-purple-600">
            Recommendation Model
          </Link>
          <Link href="/admin/admins" className="text-sm font-medium text-neutral-600 hover:text-purple-600">
            Admins
          </Link>
          <div className="flex-1" />
          <Link href="/" className="text-sm text-neutral-400 hover:text-neutral-600">
            Back to App
          </Link>
        </div>
      </nav>
      <main className="mx-auto max-w-5xl px-6 py-8">
        {children}
      </main>
    </div>
  );
}
