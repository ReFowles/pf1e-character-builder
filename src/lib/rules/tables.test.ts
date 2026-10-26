import { describe, expect, it } from 'vitest';
import {
  bonusSpells,
  carryingCapacity,
  iteratives,
  reducedSpeed,
  saveFor,
  xpForNextLevel,
} from './tables';

describe('tables', () => {
  it('xp for next level', () => {
    expect(xpForNextLevel('medium', 1)).toBe(2000);
    expect(xpForNextLevel('fast', 4)).toBe(10000);
    expect(xpForNextLevel('slow', 20)).toBeNull();
  });

  it('carrying capacity incl. size and the x4 rule', () => {
    expect(carryingCapacity(10, 'medium')).toMatchObject({ light: 33, medium: 66, heavy: 100 });
    expect(carryingCapacity(10, 'small').heavy).toBe(75);
    expect(carryingCapacity(30, 'medium').heavy).toBe(1600);
  });

  it('reduced speed', () => {
    expect([15, 20, 30, 40, 50, 60].map(reducedSpeed)).toEqual([10, 15, 20, 30, 35, 40]);
  });

  it('saves, bonus spells, iteratives', () => {
    expect(saveFor(true, 1)).toBe(2);
    expect(saveFor(false, 6)).toBe(2);
    expect(bonusSpells(4, 1)).toBe(1);
    expect(bonusSpells(5, 1)).toBe(2);
    expect(bonusSpells(3, 4)).toBe(0);
    expect(iteratives(16)).toEqual([16, 11, 6, 1]);
  });
});
