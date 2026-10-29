import { describe, expect, it } from 'vitest';
import { consumableName, consumablePrice, consumableSpec } from './consumables';
import type { DbSpell } from '../db/types';

const spell = (levels: Record<string, number>): DbSpell =>
  ({ name: 'X', school: '', levels, components: '', castingTime: '', range: '', target: '', duration: '', save: '', sr: '', summary: '', description: '', source: '' });

describe('consumables', () => {
  it('prices potions, scrolls and wands from the lowest level and caster level', () => {
    const clw = spell({ cleric: 1, bard: 1, paladin: 1, ranger: 2 });
    expect(consumableSpec(clw, 'potion')).toEqual({ level: 1, casterLevel: 1, classKey: 'cleric' });
    expect(consumablePrice('potion', 1, 1)).toBe(50);
    expect(consumablePrice('wand', 1, 1)).toBe(750);
    expect(consumablePrice('scroll', 0, 1)).toBe(12.5);
    const fireball = spell({ wizard: 3, sorcerer: 3, magus: 3 });
    expect(consumableSpec(fireball, 'wand')).toEqual({ level: 3, casterLevel: 5, classKey: 'wizard' });
    expect(consumablePrice('wand', 3, 5)).toBe(11250);
    expect(consumableSpec(fireball, 'potion')?.casterLevel).toBe(5);
    expect(consumableSpec(spell({ wizard: 5 }), 'wand')).toBeNull();
    expect(consumableName('wand', 'Fireball', { level: 3, casterLevel: 5, classKey: 'wizard' })).toBe('Wand of Fireball (CL 5)');
    expect(consumableName('potion', 'Cure Light Wounds', { level: 1, casterLevel: 1, classKey: 'cleric' })).toBe('Potion of Cure Light Wounds');
  });
});
