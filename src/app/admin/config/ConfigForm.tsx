'use client';

import { RecommendationConfig } from '@/lib/recommendationConfig';

interface ConfigFormProps {
  config: RecommendationConfig;
  defaults: RecommendationConfig;
  action: (formData: FormData) => Promise<void>;
}

export default function ConfigForm({ config, defaults, action }: ConfigFormProps) {
  const inputClass = 'w-20 rounded border border-neutral-300 px-2 py-1 text-sm text-right focus:border-purple-500 focus:outline-none';
  const labelClass = 'text-sm text-neutral-700';

  function handleReset(e: React.MouseEvent) {
    e.preventDefault();
    const form = (e.target as HTMLElement).closest('form')!;
    const inputs = form.querySelectorAll('input');
    inputs.forEach((input) => {
      const name = input.name;
      if (name === 'baseScore') input.value = String(defaults.baseScore);
      else if (name in defaults.weights) input.value = String(defaults.weights[name as keyof typeof defaults.weights]);
      else if (name in defaults.thresholds) input.value = String(defaults.thresholds[name as keyof typeof defaults.thresholds]);
      else if (name in defaults.rules) input.checked = defaults.rules[name as keyof typeof defaults.rules];
    });
  }

  return (
    <form action={action} className="space-y-8">
      <div>
        <h3 className="mb-3 font-semibold text-neutral-800">Base Score</h3>
        <div className="flex items-center gap-3">
          <label className={labelClass}>Base score for each candidate</label>
          <input type="number" name="baseScore" defaultValue={config.baseScore} className={inputClass} />
        </div>
      </div>

      <div>
        <h3 className="mb-3 font-semibold text-neutral-800">Scoring Weights</h3>
        <div className="space-y-3">
          {(Object.entries(config.weights) as [string, number][]).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between gap-3">
              <label className={labelClass}>{formatLabel(key)}</label>
              <input type="number" name={key} defaultValue={value} className={inputClass} />
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 font-semibold text-neutral-800">Thresholds</h3>
        <div className="space-y-3">
          {(Object.entries(config.thresholds) as [string, number][]).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between gap-3">
              <label className={labelClass}>{formatLabel(key)}</label>
              <input type="number" name={key} defaultValue={value} min={0} className={inputClass} />
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 font-semibold text-neutral-800">Hard Rules</h3>
        <div className="space-y-3">
          {(Object.entries(config.rules) as [string, boolean][]).map(([key, value]) => (
            <label key={key} className="flex items-center gap-3">
              <input type="checkbox" name={key} defaultChecked={value} className="rounded" />
              <span className={labelClass}>{formatLabel(key)}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          className="rounded-lg bg-purple-600 px-6 py-2 text-sm font-semibold text-white hover:bg-purple-700"
        >
          Save Configuration
        </button>
        <button
          onClick={handleReset}
          className="rounded-lg border border-neutral-300 px-6 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
        >
          Reset to Defaults
        </button>
      </div>
    </form>
  );
}

function formatLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}
