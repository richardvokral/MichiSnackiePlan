import { getCurrentUser } from '@/lib/auth';
import { getUserDietPreferences } from '@/lib/repository';
import { DietPreferences } from '@/lib/diet';
import DietPrefsClient from './DietPrefsClient';

export const dynamic = 'force-dynamic';

export default async function DietPreferencesPage() {
  // Anonymous users are allowed here — they edit a local (this-device) copy and
  // are nudged to register to keep it. Signed-in users load their stored prefs.
  const user = await getCurrentUser();
  let initialPrefs: DietPreferences | null = null;
  if (user) {
    initialPrefs = await getUserDietPreferences(user.id);
  }

  return <DietPrefsClient isAuthenticated={Boolean(user)} initialPrefs={initialPrefs} />;
}
