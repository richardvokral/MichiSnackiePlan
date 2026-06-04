'use client';

import { useRouter } from 'next/navigation';
import { useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};
function getGreetingClient() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
function getGreetingServer() {
  return 'Good morning';
}

interface GreetingHeaderProps {
  date?: string;
  isAuthenticated?: boolean;
}

export default function GreetingHeader({ date, isAuthenticated }: GreetingHeaderProps) {
  const greeting = useSyncExternalStore(emptySubscribe, getGreetingClient, getGreetingServer);
  const router = useRouter();
  const showPicker = isAuthenticated && date;

  return (
    <div className="px-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
            <span className="text-sm">🍽️</span>
          </div>
          <span className="text-sm font-semibold text-purple-700">Nourish</span>
        </div>
        <div className="relative flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          {showPicker && (
            <input
              type="date"
              value={date}
              aria-label="Jump to a date"
              onChange={(e) => {
                if (e.target.value) router.push(`/?date=${e.target.value}`);
              }}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          )}
        </div>
      </div>
      <div className="mt-6">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-800">
          {greeting},<br />Sarah.
        </h1>
        <p className="mt-1 text-sm text-neutral-500">Ready for your daily journey?</p>
      </div>
    </div>
  );
}
