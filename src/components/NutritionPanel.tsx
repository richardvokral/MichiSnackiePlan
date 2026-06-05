'use client';

import { useSyncExternalStore } from 'react';
import { MealNutrition } from '@/lib/types';
import { EnergyUnit, formatEnergy } from '@/lib/units';
import { getEnergyUnit } from '@/lib/unitStore';

const emptySubscribe = () => () => {};
const serverSnapshot = (): EnergyUnit => 'kcal';

interface NutritionPanelProps {
  nutrition: MealNutrition;
  // Signed-in users' unit comes from the server; anonymous users fall back to
  // this device's localStorage choice (read on the client).
  serverUnit: EnergyUnit | null;
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-xl bg-neutral-50 py-3">
      <p className="text-lg font-bold text-neutral-800">{value}</p>
      <p className="text-[11px] text-neutral-400">{label}</p>
    </div>
  );
}

export default function NutritionPanel({ nutrition, serverUnit }: NutritionPanelProps) {
  const localUnit = useSyncExternalStore(emptySubscribe, getEnergyUnit, serverSnapshot);
  const unit: EnergyUnit = serverUnit ?? localUnit;
  const energy = formatEnergy(nutrition.calories, unit);

  return (
    <>
      <div className="mt-3 grid grid-cols-4 gap-2 text-center">
        <Stat value={energy.value} label={`Energy (${energy.label})`} />
        <Stat value={nutrition.proteinG} label="Protein (g)" />
        <Stat value={nutrition.carbsG} label="Carbs (g)" />
        <Stat value={nutrition.fatG} label="Fat (g)" />
      </div>
      {nutrition.approximate && (
        <p className="mt-2 text-xs text-neutral-400">
          Approximate — some ingredients use non-weight units or lack full nutrition data.
        </p>
      )}
    </>
  );
}
