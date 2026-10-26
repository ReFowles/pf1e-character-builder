import { describe, expect, it } from 'vitest';
import { make } from '../model/defaults';
import { uid } from '../model/id';
import { scaleDice } from './dice';
import { derive } from './derive';
import { MACRO_LIBRARY } from './macroLibrary';
import { newCharacter } from '../model/defaults';

const withMacro = (id: string) => {
  const c = newCharacter();
  c.abilities.str.base = 14;
  c.weapons = [{ ...make.weapon(), name: 'Longsword', damage: '1d8' }];
  const lib = MACRO_LIBRARY.find((x) => x.id === id)!;
  c.macros = [{ ...make.macro(), name: lib.name, active: true, effects: lib.effects.map((e) => ({ ...e, id: uid() })) }];
  return c;
};

describe('size changes', () => {
  it('scales damage dice by size step', () => {
    expect(scaleDice('1d8', 1)).toBe('2d6');
    expect(scaleDice('2d6', -1)).toBe('1d10');
    expect(scaleDice('1d6 + 1d6 fire', 2)).toBe('2d6 + 1d6 fire');
    expect(scaleDice('1d4', -2)).toBe('1d2');
    expect(scaleDice('special', 1)).toBe('special');
  });

  it('enlarge person makes the character large', () => {
    const c = withMacro('enlarge-person');
    const d = derive(c);
    expect(d.effectiveSize).toBe('large');
    expect(d.ac.normal.total).toBe(10 - 1 - 1); // size −1, Dex 8 −1
    expect(d.cmb.total).toBe(1 + 3); // size +1, Str 16 +3
    expect(d.weapons[c.weapons[0].id].damageDice).toBe('2d6');
    expect(d.capacity.heavy).toBe(230 * 2); // Str 16, doubled for Large
  });

  it('ant haul triples carrying capacity', () => {
    const d = derive(withMacro('ant-haul'));
    expect(d.capacity.heavy).toBe(175 * 3);
  });
});

describe('other spellcasting', () => {
  it('reads the spell table at the caster level', () => {
    const c = newCharacter();
    c.spellcasting = [{ ...make.spellcasting(), classId: null, table: 'wizard', casterLevel: 5, casterLevelMisc: 1 }];
    const s = derive(c).spellcasting[c.spellcasting[0].id];
    expect(s.casterLevel).toBe(6);
    expect(s.base.slice(0, 4)).toEqual([4, 3, 3, 2]);
  });
});
