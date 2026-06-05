// Energy-unit helpers, shared by client and server. Default is kcal; users can
// switch to kilojoules. Pure module — no server-only or DB access.

export const ENERGY_UNITS = ['kcal', 'kj'] as const;
export type EnergyUnit = (typeof ENERGY_UNITS)[number];

export const KCAL_TO_KJ = 4.184;

export const ENERGY_UNIT_LABEL: Record<EnergyUnit, string> = {
  kcal: 'kcal',
  kj: 'kJ',
};

export function isEnergyUnit(value: unknown): value is EnergyUnit {
  return value === 'kcal' || value === 'kj';
}

// Convert a kcal value into the chosen unit, returning the rounded value + label.
export function formatEnergy(kcal: number, unit: EnergyUnit): { value: number; label: string } {
  if (unit === 'kj') {
    return { value: Math.round(kcal * KCAL_TO_KJ * 10) / 10, label: ENERGY_UNIT_LABEL.kj };
  }
  return { value: Math.round(kcal * 10) / 10, label: ENERGY_UNIT_LABEL.kcal };
}
