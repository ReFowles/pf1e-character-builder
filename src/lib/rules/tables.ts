import type { BabProgression, Size, XpTrack } from '../model/types';

/** XP required to reach each level (index 0 = level 1). Core Rulebook table 3-1. */
export const XP_TABLE: Record<XpTrack, number[]> = {
  slow: [
    0, 3000, 7500, 14000, 23000, 35000, 53000, 77000, 115000, 160000, 235000, 330000, 475000,
    665000, 955000, 1350000, 1900000, 2700000, 3850000, 5350000,
  ],
  medium: [
    0, 2000, 5000, 9000, 15000, 23000, 35000, 51000, 75000, 105000, 155000, 220000, 315000,
    445000, 635000, 890000, 1300000, 1800000, 2550000, 3600000,
  ],
  fast: [
    0, 1300, 3300, 6000, 10000, 15000, 23000, 34000, 50000, 71000, 105000, 145000, 210000,
    295000, 425000, 600000, 850000, 1200000, 1700000, 2400000,
  ],
};

/** XP needed for the level after `level`, or null at level 20+. */
export function xpForNextLevel(track: XpTrack, level: number): number | null {
  return XP_TABLE[track][Math.max(level, 0)] ?? null;
}

export interface SizeMods {
  /** AC and attack roll modifier. */
  ac: number;
  /** Special size modifier for CMB/CMD. */
  cm: number;
  fly: number;
  stealth: number;
  /** Carrying capacity multiplier (bipeds). */
  carry: number;
}

export const SIZE_MODS: Record<Size, SizeMods> = {
  fine: { ac: 8, cm: -8, fly: 8, stealth: 16, carry: 1 / 8 },
  diminutive: { ac: 4, cm: -4, fly: 6, stealth: 12, carry: 1 / 4 },
  tiny: { ac: 2, cm: -2, fly: 4, stealth: 8, carry: 1 / 2 },
  small: { ac: 1, cm: -1, fly: 2, stealth: 4, carry: 3 / 4 },
  medium: { ac: 0, cm: 0, fly: 0, stealth: 0, carry: 1 },
  large: { ac: -1, cm: 1, fly: -2, stealth: -4, carry: 2 },
  huge: { ac: -2, cm: 2, fly: -4, stealth: -8, carry: 4 },
  gargantuan: { ac: -4, cm: 4, fly: -6, stealth: -12, carry: 8 },
  colossal: { ac: -8, cm: 8, fly: -8, stealth: -16, carry: 16 },
};

/** Heavy-load maximum (lb) for Str 1..29; light = floor(heavy/3), medium = floor(heavy*2/3). */
const HEAVY_LOAD = [
  10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 115, 130, 150, 175, 200, 230, 260, 300, 350, 400, 460,
  520, 600, 700, 800, 920, 1040, 1200, 1400,
];

export interface Capacity {
  light: number;
  medium: number;
  heavy: number;
  /** Lift over head = heavy; off ground = 2×; push or drag = 5×. */
  liftOverHead: number;
  liftOffGround: number;
  pushDrag: number;
}

export function carryingCapacity(str: number, size: Size): Capacity {
  let heavy = 0;
  if (str > 0) {
    // Above 29, each +10 Str multiplies capacity by 4.
    let s = str;
    let mult = 1;
    while (s > 29) {
      s -= 10;
      mult *= 4;
    }
    heavy = HEAVY_LOAD[s - 1] * mult;
  }
  heavy *= SIZE_MODS[size].carry;
  return {
    light: Math.floor(heavy / 3),
    medium: Math.floor((heavy * 2) / 3),
    heavy,
    liftOverHead: heavy,
    liftOffGround: heavy * 2,
    pushDrag: heavy * 5,
  };
}

export type Load = 'light' | 'medium' | 'heavy' | 'overloaded';

export function loadFor(weight: number, cap: Capacity): Load {
  if (weight <= cap.light) return 'light';
  if (weight <= cap.medium) return 'medium';
  if (weight <= cap.heavy) return 'heavy';
  return 'overloaded';
}

/** Max Dex and check penalty imposed by carried load. */
export const LOAD_PENALTIES: Record<Load, { maxDex: number | null; acp: number }> = {
  light: { maxDex: null, acp: 0 },
  medium: { maxDex: 3, acp: -3 },
  heavy: { maxDex: 1, acp: -6 },
  overloaded: { maxDex: 0, acp: -6 },
};

/** Speed while in medium/heavy armor or load (30 -> 20, 20 -> 15, 40 -> 30...). */
export function reducedSpeed(speed: number): number {
  const r = 10 * Math.floor(speed / 30) + (speed % 30 >= 15 ? 5 : 0);
  return Math.max(speed - r, Math.min(speed, 5));
}

export function babFor(progression: BabProgression, level: number): number {
  if (progression === 'full') return level;
  if (progression === '3/4') return Math.floor((level * 3) / 4);
  return Math.floor(level / 2);
}

export function saveFor(good: boolean, level: number): number {
  if (level <= 0) return 0;
  return good ? 2 + Math.floor(level / 2) : Math.floor(level / 3);
}

/** Bonus spells per day from a high ability score, for spell level 1..9. */
export function bonusSpells(abilityMod: number, spellLevel: number): number {
  if (spellLevel < 1 || abilityMod < spellLevel) return 0;
  return 1 + Math.floor((abilityMod - spellLevel) / 4);
}

/** Iterative attack bonuses for a BAB: [+11, +6, +1]. */
export function iteratives(bab: number): number[] {
  const out = [bab];
  for (let b = bab - 5; b >= 1 && out.length < 4; b -= 5) out.push(b);
  return out;
}

/** Coins weigh 50 to the pound. */
export const COINS_PER_LB = 50;
