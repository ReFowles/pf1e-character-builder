import { describe, expect, it } from 'vitest';
import { critMultiplier, damageNotation, formatNotation, multiplyNotation, parseNotation, spellDamageNotation } from './notation';
import { buildResult, capLog, partsOf, rollDice, rollInstant, throwNotation } from './roll';

describe('dice notation', () => {
  it('parses simple and compound notation', () => {
    expect(parseNotation('1d20+7')).toEqual({ dice: [{ count: 1, sides: 20, sign: 1 }], modifier: 7 });
    expect(parseNotation('2d6 + 1d4 + 3')).toEqual({ dice: [{ count: 2, sides: 6, sign: 1 }, { count: 1, sides: 4, sign: 1 }], modifier: 3 });
    expect(parseNotation('d8-1')).toEqual({ dice: [{ count: 1, sides: 8, sign: 1 }], modifier: -1 });
    expect(parseNotation('1d8+2-1d4')?.dice[1].sign).toBe(-1);
  });

  it('rejects junk, bare numbers and silly sizes', () => {
    expect(parseNotation('')).toBeNull();
    expect(parseNotation('special')).toBeNull();
    expect(parseNotation('+5')).toBeNull();
    expect(parseNotation('1d1')).toBeNull();
    expect(parseNotation('101d6')).toBeNull();
    expect(parseNotation('1d6 x 2')).toBeNull();
  });

  it('formats, builds damage and multiplies criticals', () => {
    expect(formatNotation(parseNotation('2d6+1d4+3')!)).toBe('2d6+1d4+3');
    expect(formatNotation(parseNotation('1d8-2')!)).toBe('1d8-2');
    expect(damageNotation('1d8', 3)).toBe('1d8+3');
    expect(damageNotation('2d6+1', -2)).toBe('2d6-1');
    expect(damageNotation('—', 3)).toBeNull();
    expect(critMultiplier('19-20/×2')).toBe(2);
    expect(critMultiplier('x3')).toBe(3);
    expect(critMultiplier('')).toBe(2);
    expect(formatNotation(multiplyNotation(parseNotation('1d8+5')!, 3))).toBe('3d8+15');
  });
});

describe('rolling', () => {
  const fixed = (sides: number) => sides; // every die shows its maximum

  it('sums dice with signs and the modifier', () => {
    const n = parseNotation('2d6+1d4-1d8+3')!;
    const dice = rollDice(n, fixed);
    expect(dice.map((d) => d.value)).toEqual([6, 6, 4, 8]);
    const r = buildResult({ title: 'test', notation: '2d6+1d4-1d8+3' }, n, dice, 'instant');
    expect(r.total).toBe(6 + 6 + 4 - 8 + 3);
    expect(r.notation).toBe('2d6+1d4-1d8+3');
  });

  it('rolls instantly within range and keeps the log capped', () => {
    const r = rollInstant({ title: 'd20', notation: '1d20+2' })!;
    expect(r.dice[0].value).toBeGreaterThanOrEqual(1);
    expect(r.dice[0].value).toBeLessThanOrEqual(20);
    expect(r.total).toBe(r.dice[0].value + 2);
    expect(rollInstant({ title: 'bad', notation: 'nope' })).toBeNull();
    const many = Array.from({ length: 205 }, (_, i) => ({ ...r, id: String(i) }));
    expect(capLog(many).map((x) => x.id)[0]).toBe('5');
  });

  it('lists the applied parts of a total with their types', () => {
    const parts = partsOf({
      total: 5,
      parts: [
        { key: 'init', value: 2, type: 'untyped', source: 'DEX', applied: true },
        { key: 'init', value: 4, type: 'untyped', source: 'Improved Initiative', applied: true },
        { key: 'init', value: 1, type: 'enhancement', source: 'Old', applied: false },
      ],
    });
    expect(parts).toEqual([
      { source: 'DEX', value: 2 },
      { source: 'Improved Initiative', value: 4 },
    ]);
  });
});

describe('critical multiplier on the total', () => {
  it('multiplies the whole total when the spec carries a multiplier', () => {
    const n = parseNotation('2d6+4')!;
    const r = buildResult({ title: 'crit', notation: '2d6+4', multiplier: 2 }, n, rollDice(n, () => 3), 'instant');
    expect(r.total).toBe((3 + 3 + 4) * 2);
    expect(r.multiplier).toBe(2);
    expect(buildResult({ title: 'x', notation: '1d8' }, parseNotation('1d8')!, [{ sides: 8, value: 5, sign: 1 }], 'instant').total).toBe(5);
  });
});

describe('extra damage dice', () => {
  it('throws the extras after the main dice and adds them after the multiplier', () => {
    const spec = { title: 'crit', notation: '1d8+5', multiplier: 2, extras: [{ label: 'fire', notation: '1d6' }, { label: 'precision', notation: '2d6+1' }] };
    const n = parseNotation(spec.notation)!;
    const thrown = throwNotation(spec, n);
    expect(thrown.dice.map((t) => `${t.count}d${t.sides}`)).toEqual(['1d8', '1d6', '2d6']);
    const values = [7, 4, 2, 6];
    const r = buildResult(spec, n, rollDice(thrown, () => values.shift()!), 'instant');
    expect(r.dice.map((d) => d.value)).toEqual([7]);
    expect(r.extras).toEqual([
      { label: 'fire', notation: '1d6', dice: [{ sides: 6, value: 4, sign: 1 }], modifier: 0, total: 4 },
      { label: 'precision', notation: '2d6+1', dice: [{ sides: 6, value: 2, sign: 1 }, { sides: 6, value: 6, sign: 1 }], modifier: 1, total: 9 },
    ]);
    expect(r.total).toBe((7 + 5) * 2 + 4 + 9);
  });

  it('skips extras that are not rollable', () => {
    const spec = { title: 'x', notation: '1d4', extras: [{ label: 'junk', notation: 'fire' }] };
    const n = parseNotation(spec.notation)!;
    expect(throwNotation(spec, n).dice).toHaveLength(1);
    expect(buildResult(spec, n, [{ sides: 4, value: 3, sign: 1 }], 'instant').extras).toBeUndefined();
  });
});

describe('spell damage', () => {
  const base = { damage: '1d6', damageDicePerLevel: false, damageBonusPerLevel: 0, damageMax: 0, damageBonus: 0 };
  it('rolls fixed dice as written, with the flat bonus', () => {
    expect(spellDamageNotation({ ...base, damage: '6d6', damageBonus: 2 }, 9)).toBe('6d6+2');
  });
  it('scales dice per caster level up to the cap', () => {
    expect(spellDamageNotation({ ...base, damageDicePerLevel: true, damageMax: 10 }, 7)).toBe('7d6');
    expect(spellDamageNotation({ ...base, damageDicePerLevel: true, damageMax: 10 }, 15)).toBe('10d6');
    expect(spellDamageNotation({ ...base, damageDicePerLevel: true }, 0)).toBe('1d6');
  });
  it('scales the bonus per level (cure light wounds: 1d8+1/level, max +5)', () => {
    expect(spellDamageNotation({ ...base, damage: '1d8', damageBonusPerLevel: 1, damageMax: 5 }, 3)).toBe('1d8+3');
    expect(spellDamageNotation({ ...base, damage: '1d8', damageBonusPerLevel: 1, damageMax: 5 }, 12)).toBe('1d8+5');
  });
  it('is null without rollable dice', () => {
    expect(spellDamageNotation({ ...base, damage: '' }, 5)).toBeNull();
  });
});
