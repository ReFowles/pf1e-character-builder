import { describe, expect, it } from 'vitest';
import { abilityMod } from './math';

describe('abilityMod', () => {
  it('floors toward negative infinity', () => {
    expect(abilityMod(10)).toBe(0);
    expect(abilityMod(11)).toBe(0);
    expect(abilityMod(18)).toBe(4);
    expect(abilityMod(9)).toBe(-1);
    expect(abilityMod(1)).toBe(-5);
  });
});
