// Dice notation: "1d20+7", "2d6+1d4+3", "d8", "1d8-1". Terms are summed left to right.

export interface DiceTerm {
  count: number;
  sides: number;
  sign: 1 | -1;
}

export interface Notation {
  dice: DiceTerm[];
  modifier: number;
}

const MAX_DICE = 100;

/** Parse notation; null when it isn't plain dice arithmetic or has no dice. */
export function parseNotation(input: string): Notation | null {
  const src = input.replace(/\s+/g, '').replace(/−/g, '-').toLowerCase();
  if (!src) return null;
  const re = /([+-]?)(?:(\d*)d(\d+)|(\d+))/g;
  const dice: DiceTerm[] = [];
  let modifier = 0;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    if (m.index !== last) return null;
    last = re.lastIndex;
    const sign: 1 | -1 = m[1] === '-' ? -1 : 1;
    if (m[3] !== undefined) {
      const count = m[2] === '' ? 1 : Number(m[2]);
      const sides = Number(m[3]);
      if (count < 1 || count > MAX_DICE || sides < 2 || sides > 1000) return null;
      dice.push({ count, sides, sign });
    } else modifier += sign * Number(m[4]);
  }
  if (last !== src.length || !dice.length) return null;
  return { dice, modifier };
}

/** Canonical text: "2d6+1d4+3". */
export function formatNotation(n: Notation): string {
  const terms = n.dice.map((t, i) => `${t.sign < 0 ? '-' : i ? '+' : ''}${t.count}d${t.sides}`);
  const mod = n.modifier ? `${n.modifier > 0 ? '+' : '-'}${Math.abs(n.modifier)}` : '';
  return terms.join('') + mod;
}

/** Weapon damage dice plus a flat bonus, e.g. ("1d8", 3) → "1d8+3"; null when the dice aren't rollable text. */
export function damageNotation(dice: string, bonus: number): string | null {
  const n = parseNotation(dice);
  return n ? formatNotation({ ...n, modifier: n.modifier + bonus }) : null;
}

/** Critical multiplier from "19-20/×2", "x3" or "×4"; 2 when unreadable. */
export function critMultiplier(crit: string): number {
  const m = crit.match(/[x×]\s*(\d+)/i);
  return m ? Math.max(2, Number(m[1])) : 2;
}

/** The same notation with its dice and flat bonus multiplied (a confirmed critical hit). */
export function multiplyNotation(n: Notation, times: number): Notation {
  return { dice: n.dice.map((t) => ({ ...t, count: t.count * times })), modifier: n.modifier * times };
}

export interface SpellDamage {
  damage: string;
  damageDicePerLevel: boolean;
  damageBonusPerLevel: number;
  damageMax: number;
  damageBonus: number;
}

/** Caster levels that count toward per-level spell damage (at least 1; `max` 0 = uncapped). */
export const spellLevels = (casterLevel: number, max: number) => Math.max(1, max > 0 ? Math.min(casterLevel, max) : casterLevel);

/** A spell's damage at the given caster level, e.g. "1d6" per level at CL 7 → "7d6"; null when the dice aren't rollable text. */
export function spellDamageNotation(s: SpellDamage, casterLevel: number): string | null {
  const n = parseNotation(s.damage);
  if (!n) return null;
  const levels = spellLevels(casterLevel, s.damageMax);
  const dice = s.damageDicePerLevel ? n.dice.map((t) => ({ ...t, count: Math.min(t.count * levels, 100) })) : n.dice;
  return formatNotation({ dice, modifier: n.modifier + s.damageBonus + s.damageBonusPerLevel * levels });
}
