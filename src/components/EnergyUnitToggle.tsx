'use client';

import { useState, useSyncExternalStore, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ENERGY_UNITS, EnergyUnit, ENERGY_UNIT_LABEL } from '@/lib/units';
import { getEnergyUnit, saveEnergyUnit } from '@/lib/unitStore';
import { setEnergyUnitAction } from '@/app/preferences/diet/actions';

const emptySubscribe = () => () => {};
const serverSnapshot = (): EnergyUnit => 'kcal';

interface EnergyUnitToggleProps {
  isAuthenticated: boolean;
  initialUnit: EnergyUnit;
}

export default function EnergyUnitToggle({ isAuthenticated, initialUnit }: EnergyUnitToggleProps) {
  const router = useRouter();
  const stored = useSyncExternalStore(emptySubscribe, getEnergyUnit, serverSnapshot);
  const [draft, setDraft] = useState<EnergyUnit | null>(null);
  const [, startTransition] = useTransition();

  const unit: EnergyUnit = draft ?? (isAuthenticated ? initialUnit : stored);

  function choose(next: EnergyUnit) {
    if (next === unit) return;
    setDraft(next);
    if (isAuthenticated) {
      startTransition(async () => {
        await setEnergyUnitAction(next);
        router.refresh();
      });
    } else {
      saveEnergyUnit(next);
    }
  }

  return (
    <div className="flex rounded-lg border border-neutral-200 p-1">
      {ENERGY_UNITS.map((u) => (
        <button
          key={u}
          type="button"
          onClick={() => choose(u)}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
            unit === u ? 'bg-purple-600 text-white' : 'text-neutral-500 hover:text-neutral-700'
          }`}
        >
          {ENERGY_UNIT_LABEL[u]}
        </button>
      ))}
    </div>
  );
}
