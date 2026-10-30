import type { BonusType } from '../model/types';

export interface Bonus {
  key: string;
  value: number;
  type: BonusType;
  source: string;
  /** From a macro or condition rather than a permanent source. */
  temp?: boolean;
}

export interface Part extends Bonus {
  /** False when a same-typed, larger bonus overrides this one. */
  applied: boolean;
}

export interface Total {
  total: number;
  parts: Part[];
}

/** A bonus row; untyped unless a type is given. */
export const bonus = (key: string, value: number, source: string, type: BonusType = 'untyped'): Bonus => ({ key, value, type, source });

/** Bonus types that stack with themselves. Penalties (negative values) always stack. */
export const STACKING_TYPES = new Set<BonusType>(['untyped', 'dodge', 'circumstance']);

/** Combine bonuses under PF1 stacking rules. */
export function stack(bonuses: Bonus[]): Total {
  const best = new Map<BonusType, Bonus>();
  for (const b of bonuses) {
    if (b.value <= 0 || STACKING_TYPES.has(b.type)) continue;
    const cur = best.get(b.type);
    if (!cur || b.value > cur.value) best.set(b.type, b);
  }
  let total = 0;
  const parts = bonuses
    .filter((b) => b.value !== 0)
    .map((b) => {
      const applied = b.value < 0 || STACKING_TYPES.has(b.type) || best.get(b.type) === b;
      if (applied) total += b.value;
      return { ...b, applied };
    });
  return { total, parts };
}

/** A bag of bonuses that can be totalled for one or more keys. */
export class BonusSet {
  private byKey = new Map<string, Bonus[]>();

  add(...bonuses: Bonus[]) {
    for (const b of bonuses) {
      if (!b.key || !Number.isFinite(b.value) || b.value === 0) continue;
      const list = this.byKey.get(b.key) ?? [];
      list.push(b);
      this.byKey.set(b.key, list);
    }
  }

  list(keys: string[], filter?: (b: Bonus) => boolean): Bonus[] {
    const out = keys.flatMap((k) => this.byKey.get(k) ?? []);
    return filter ? out.filter(filter) : out;
  }

  /** Total of all bonuses under any of `keys`, stacked together. */
  total(keys: string[], filter?: (b: Bonus) => boolean): Total {
    return stack(this.list(keys, filter));
  }
}

