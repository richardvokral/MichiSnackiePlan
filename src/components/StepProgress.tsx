import ProgressBar from './ProgressBar';

interface StepProgressProps {
  current: number;
  total: number;
}

export default function StepProgress({ current, total }: StepProgressProps) {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
          Step {current} of {total}
        </p>
        <span className="text-xs font-semibold text-neutral-400">{percent}%</span>
      </div>
      <ProgressBar percent={percent} className="mt-2" height="h-1.5" />
    </div>
  );
}
