import Link from 'next/link';
import { getAiConfig } from '@/lib/repository';
import AiSettingsForm from './AiSettingsForm';

export const dynamic = 'force-dynamic';

export default async function AiSettingsPage() {
  const settings = await getAiConfig();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-800">AI Model Settings</h1>
        <Link href="/admin/ai" className="text-sm text-neutral-400 hover:text-neutral-600">
          ‹ AI Studio
        </Link>
      </div>
      <p className="mt-2 text-sm text-neutral-500">
        Choose which model drives ingredient and food generation. Requires the{' '}
        <code className="rounded bg-neutral-100 px-1">ANTHROPIC_API_KEY</code> environment variable.
      </p>

      <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">
        <AiSettingsForm settings={settings} />
      </div>
    </div>
  );
}
