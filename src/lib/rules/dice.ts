// Weapon damage dice by size step, following the PF1 damage die progression
// (Core Rulebook FAQ). Only the leading "NdM" of a damage string is scaled.

const UP: Record<string, string> = {
  '1': '1d2', '1d2': '1d3', '1d3': '1d4', '1d4': '1d6', '1d6': '1d8', '1d8': '2d6', '1d10': '2d8', '1d12': '3d6',
  '2d4': '2d6', '2d6': '3d6', '3d6': '4d6', '4d6': '6d6', '6d6': '8d6', '8d6': '12d6',
  '2d8': '3d8', '3d8': '4d8', '4d8': '6d8', '6d8': '8d8', '8d8': '12d8', '2d10': '4d8',
};

const DOWN: Record<string, string> = {
  '1d2': '1', '1d3': '1d2', '1d4': '1d3', '1d6': '1d4', '1d8': '1d6', '1d10': '1d8', '1d12': '1d10',
  '2d4': '1d6', '2d6': '1d10', '3d6': '2d6', '4d6': '3d6', '6d6': '4d6', '8d6': '6d6', '12d6': '8d6',
  '2d8': '2d6', '3d8': '2d8', '4d8': '3d8', '6d8': '4d8', '8d8': '6d8', '12d8': '8d8', '2d10': '2d8',
};

/** Scale the leading dice of a damage string by size steps (+1 = one size larger). */
export function scaleDice(damage: string, steps: number): string {
  if (!steps) return damage;
  const m = damage.match(/^\s*(\d+d\d+|1)(?![\d])/i);
  if (!m) return damage;
  let dice = m[1].toLowerCase();
  const table = steps > 0 ? UP : DOWN;
  for (let i = 0; i < Math.abs(steps); i++) dice = table[dice] ?? dice;
  return damage.replace(m[1], dice);
}
