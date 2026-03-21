import { Intention } from '@/data/intentions';

interface IntentionCardProps {
  intention: Intention;
}

export default function IntentionCard({ intention }: IntentionCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 via-purple-600 to-berry-500 p-6 text-white shadow-md">
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/5" />
      <div className="absolute -bottom-4 -left-4 h-20 w-20 rounded-full bg-white/5" />
      <p className="relative text-xs font-semibold uppercase tracking-widest text-white/70">
        Today&apos;s Intention
      </p>
      <h2 className="relative mt-3 text-2xl font-bold leading-tight">
        Focus of the Day:<br />{intention.title}
      </h2>
      <div className="relative mt-4 flex items-center gap-2">
        <span className="text-sm text-white/80">{intention.subtitle}</span>
        <svg className="ml-auto h-5 w-5 text-white/60" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
}
