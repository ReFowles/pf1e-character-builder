import { describe, expect, it } from 'vitest';
import { BonusSet, stack } from './bonuses';

const b = (value: number, type: any = 'untyped', key = 'x') => ({ key, value, type, source: '' });

describe('stack', () => {
  it('takes the highest of a typed bonus', () => {
    expect(stack([b(2, 'morale'), b(1, 'morale')]).total).toBe(2);
  });
  it('stacks untyped, dodge and penalties', () => {
    expect(stack([b(1, 'dodge'), b(1, 'dodge'), b(2), b(-1, 'morale'), b(-2, 'morale')]).total).toBe(
      1,
    );
  });
  it('combines keys before stacking', () => {
    const s = new BonusSet();
    s.add(b(1, 'enhancement', 'attack'), b(2, 'enhancement', 'attack.melee'));
    expect(s.total(['attack', 'attack.melee']).total).toBe(2);
    expect(s.total(['attack', 'attack.ranged']).total).toBe(1);
  });
});
