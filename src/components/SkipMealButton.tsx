'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { MealSlotId } from '@/lib/types';
import { skipMeal } from '@/lib/store';
import { skipMealForDay } from '@/app/plan/actions';
import Modal from './Modal';

interface SkipMealButtonProps {
  slot: MealSlotId;
  isAuthenticated: boolean;
  date?: string;
  className?: string;
  label?: string;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

// Skipping is intentionally a two-step action: easy to reach, but a confirmation
// nudges people to keep eating regularly rather than skipping reflexively.
export default function SkipMealButton({
  slot,
  isAuthenticated,
  date,
  className,
  label = 'Skip',
}: SkipMealButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function openModal(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
  }

  function confirmSkip() {
    if (isAuthenticated) {
      startTransition(async () => {
        await skipMealForDay(date ?? todayStr(), slot);
        setOpen(false);
        router.refresh();
      });
    } else {
      skipMeal(slot);
      setOpen(false);
      router.refresh();
    }
  }

  return (
    <>
      <button type="button" onClick={openModal} className={className}>
        {label}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Skip this meal?">
        <p className="text-sm leading-relaxed text-neutral-500">
          Eating regularly keeps your energy steady. Skip just this one?
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={confirmSkip}
            disabled={pending}
            className="w-full rounded-full bg-neutral-700 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-neutral-800 disabled:bg-neutral-300"
          >
            {pending ? 'Skipping…' : 'Skip this meal'}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="w-full py-2 text-center text-sm font-semibold text-purple-600 hover:text-purple-700"
          >
            Keep it
          </button>
        </div>
      </Modal>
    </>
  );
}
