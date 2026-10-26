import { describe, expect, it } from 'vitest';
import { addFractions, formatFraction, parseFraction } from './fraction';
import { iterativeText } from './tables';

describe('fractions and iteratives', () => {
  it('adds and formats', () => {
    const f = ['1/3', '1/3', '1/6', '1'].map(parseFraction).reduce(addFractions);
    expect(formatFraction(f)).toBe('1 5/6');
    expect(formatFraction(parseFraction('2/4'))).toBe('1/2');
  });
  it('formats iterative attacks', () => {
    expect(iterativeText(11, 14)).toBe('+14/+9/+4');
    expect(iterativeText(4, 3)).toBe('+3');
  });
});
