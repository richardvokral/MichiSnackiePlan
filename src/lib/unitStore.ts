// Anonymous energy-unit preference, persisted in localStorage. Signed-in users
// store it on their account instead (see repository/dietPreferences.ts).
import { EnergyUnit, isEnergyUnit } from './units';

const STORAGE_KEY = 'michi_energy_unit';

// Also serves as the useSyncExternalStore client snapshot — returns a primitive
// string, so repeated calls are Object.is-equal and won't loop.
export function getEnergyUnit(): EnergyUnit {
  if (typeof window === 'undefined') return 'kcal';
  const stored = localStorage.getItem(STORAGE_KEY);
  return isEnergyUnit(stored) ? stored : 'kcal';
}

export function saveEnergyUnit(unit: EnergyUnit): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, unit);
}
