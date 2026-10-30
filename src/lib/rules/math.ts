/** Ability modifier for a score: floor((score - 10) / 2). */
export function abilityMod(score: number): number {
  return Math.floor((score - 10) / 2);
}

/** Round to two decimals (weights in lb, values in gp). */
export const round2 = (n: number) => Math.round(n * 100) / 100;
