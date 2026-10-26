import { describe, expect, it } from 'vitest';
import { evaluate, tryEvaluate } from './expr';

describe('expr', () => {
  const vars = { bab: 11, 'wis.mod': -1, level: 6 };
  it('handles precedence, unary minus and functions', () => {
    expect(evaluate('-1 - floor(@bab / 4)', vars)).toBe(-3);
    expect(evaluate('max(1, @wis.mod)', vars)).toBe(1);
    expect(evaluate('2 + 3 * (4 - 1)', vars)).toBe(11);
    expect(evaluate('1 + floor((@level - 5) / 6)', vars)).toBe(1);
  });
  it('rejects unknown refs and junk', () => {
    expect(() => evaluate('@nope', vars)).toThrow();
    expect(() => evaluate('alert(1)', vars)).toThrow();
    expect(() => evaluate('1 +', vars)).toThrow();
    expect(tryEvaluate('constructor', vars, 7)).toBe(7);
    expect(tryEvaluate('@constructor + toString(1)', vars, 7)).toBe(7);
  });
});
