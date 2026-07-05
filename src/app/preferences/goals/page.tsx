import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { getUserGoals } from '@/lib/repository';
import GoalsClient from './GoalsClient';

export const dynamic = 'force-dynamic';

export default async function GoalsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/sign-in');

  const goals = await getUserGoals(user.id);

  return (
    <div className="min-h-screen bg-neutral-50 pb-12">
      <div className="mx-auto max-w-lg px-5 pt-6">
        <div className="flex items-center justify-between">
          <Link href="/preferences" className="text-sm text-neutral-500 hover:text-neutral-700">
            ‹ Back
          </Link>
          <span className="text-sm font-semibold text-purple-700">Daily targets</span>
          <div className="w-10" />
        </div>

        <h1 className="mt-6 text-2xl font-bold text-neutral-800">Gentle daily targets</h1>
        <p className="mt-1 text-sm leading-relaxed text-neutral-500">
          Totally optional. Without targets your day just shows plain totals — set them only
          if a quiet progress bar helps you. No streaks, no guilt.
        </p>

        <GoalsClient initialGoals={goals} />
      </div>
    </div>
  );
}
