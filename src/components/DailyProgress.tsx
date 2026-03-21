import ProgressBar from './ProgressBar';

interface DailyProgressProps {
  completed: number;
  total: number;
}

export default function DailyProgress({ completed, total }: DailyProgressProps) {
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="rounded-2xl bg-neutral-100 p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-purple-600">
        Daily Flow
      </p>
      <div className="mt-1 flex items-baseline justify-between">
        <p className="text-lg font-bold text-neutral-800">
          {completed} of {total} meals tracked
        </p>
        <span className="text-sm font-semibold text-purple-500">{percent}%</span>
      </div>
      <ProgressBar percent={percent} className="mt-2" />
    </div>
  );
}
