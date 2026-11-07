import { describe, expect, it } from 'vitest';
import { MACRO_LIBRARY } from './macroLibrary';
import { BONUS_KEYS } from './keys';
import { tryEvaluate } from './expr';

describe('macro library', () => {
  const keys = new Set(BONUS_KEYS.map((k) => k.key));
  const vars = { level: 5, hd: 5, bab: 5, cl: 5, 'class.rogue.level': 5, 'cha.mod': 2 };

  it('uses known bonus keys and formulas that evaluate', () => {
    for (const m of MACRO_LIBRARY) {
      for (const e of m.effects) {
        expect(keys.has(e.key), `${m.name}: ${e.key}`).toBe(true);
        expect(Number.isNaN(tryEvaluate(e.value, vars, NaN)), `${m.name}: ${e.value}`).toBe(false);
      }
      for (const x of m.damageDice ?? []) expect(Number.isNaN(tryEvaluate(x.count, vars, NaN)), `${m.name}: ${x.count}`).toBe(false);
    }
  });

  it('has unique ids', () => {
    expect(new Set(MACRO_LIBRARY.map((m) => m.id)).size).toBe(MACRO_LIBRARY.length);
  });
});
