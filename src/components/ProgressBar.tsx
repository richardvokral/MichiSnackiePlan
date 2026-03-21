'use client';

interface ProgressBarProps {
  percent: number;
  className?: string;
  height?: string;
}

export default function ProgressBar({ percent, className = '', height = 'h-2' }: ProgressBarProps) {
  return (
    <div className={`w-full rounded-full bg-neutral-200 ${height} ${className}`}>
      <div
        className={`${height} rounded-full bg-purple-500 transition-all duration-500 ease-out`}
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  );
}
