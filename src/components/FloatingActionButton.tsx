'use client';

import Link from 'next/link';
import { MealSlotId } from '@/lib/types';

interface FloatingActionButtonProps {
  activeSlot: MealSlotId | null;
  date?: string;
}

export default function FloatingActionButton({ activeSlot, date }: FloatingActionButtonProps) {
  if (!activeSlot) return null;

  const href = date ? `/select/${activeSlot}?date=${date}` : `/select/${activeSlot}`;

  return (
    <Link
      href={href}
      className="fixed bottom-24 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-purple-600 text-white shadow-lg transition-transform hover:scale-105 hover:bg-purple-700 md:bottom-8"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </Link>
  );
}
