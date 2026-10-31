import { describe, expect, it } from 'vitest';
import { newCharacter } from '../model/defaults';
import { pointBuy, pointCost } from './pointBuy';

describe('point buy', () => {
  it('standard costs', () => {
    expect([7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map((s) => pointCost(s))).toEqual([-4, -2, -1, 0, 1, 2, 3, 5, 7, 10, 13, 17]);
  });
  it("Richard's costs", () => {
    expect([10, 11, 12, 13, 14, 15, 16, 17, 18].map((s) => pointCost(s, true))).toEqual([0, 1, 2, 3, 4, 6, 8, 11, 14]);
  });
  it('totals, with the free 18', () => {
    const c = newCharacter();
    for (const [a, v] of Object.entries({ str: 18, dex: 14, con: 14, int: 10, wis: 10, cha: 8 })) c.abilities[a as 'str'].base = v;
    expect(pointBuy(c).spent).toBe(17 + 5 + 5 - 2);
    c.pointBuy.freeEighteen = true;
    expect(pointBuy(c).spent).toBe(8);
    c.pointBuy.richard = true;
    expect(pointBuy(c)).toMatchObject({ spent: 4 + 4 - 2, remaining: 15 - 6 });
  });
  it('no free 18 without an 18', () => {
    const c = newCharacter();
    c.pointBuy.freeEighteen = true;
    c.abilities.str.base = 17;
    expect(pointBuy(c).spent).toBe(13);
  });
});
