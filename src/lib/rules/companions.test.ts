import { describe, expect, it } from 'vitest';
import { make, newCharacter } from '../model/defaults';
import type { ClassDef } from '../model/types';
import { deriveCompanion } from './companions';
import { derive } from './derive';

function withClass(name: string, levels: number, extra: Partial<ClassDef> = {}) {
  const c = newCharacter();
  const k = { ...make.classDef(), name, hd: 8, bab: '3/4' as const, goodSaves: ['fort' as const, 'will' as const], ...extra };
  c.classes = [k];
  c.favoredClassIds = [k.id];
  c.levels = Array.from({ length: levels }, () => ({ ...make.level(k.id), hpRoll: 5 }));
  return { c, k };
}

describe('companions', () => {
  it('advances an animal companion by druid level', () => {
    const { c, k } = withClass('Druid', 4);
    const wolf = { ...make.companion('animal'), masterClassId: k.id, naturalArmor: 2, abilityIncreases: ['str' as const, null, null] };
    wolf.abilities.str.base = 13;
    wolf.abilities.dex.base = 15;
    wolf.abilities.con.base = 15;
    wolf.attacks = [{ ...make.companionAttack(), name: 'Bite', damage: '1d6' }];
    const w = deriveCompanion(c, derive(c), wolf);
    expect([w.level, w.hd, w.bab]).toEqual([4, 4, 3]);
    expect(w.abilities.str.score).toBe(13 + 1 + 1);
    expect(w.abilities.str.hasTemp).toBe(false);
    expect(w.abilities.dex.score).toBe(16);
    expect(w.saves.fort.total).toBe(4 + 2);
    expect(w.saves.will.total).toBe(1);
    expect(w.ac.normal.total).toBe(10 + 3 + 2 + 2);
    expect(w.hp.max.total).toBe(Math.floor(4 * 4.5) + 2 * 4);
    expect(w.attacks[wolf.attacks[0].id].attack.total).toBe(3 + 2);
    expect(w.feats).toBe(2);
    expect(w.tricks).toEqual({ known: 6 + 2, bonus: 2 });
    expect(w.special).toContain('Evasion');
  });

  it("uses the master's HP, BAB and saves for a familiar", () => {
    const { c, k } = withClass('Wizard', 5, { hd: 6, bab: '1/2', goodSaves: ['will'] });
    const cat = { ...make.companion('familiar'), masterClassId: k.id };
    cat.abilities.dex.base = 15;
    const d = derive(c);
    const f = deriveCompanion(c, d, cat);
    expect(f.hp.max.total).toBe(Math.floor(d.hp.max.total / 2));
    expect(f.bab).toBe(d.bab);
    expect(f.saves.will.total).toBe(4); // master's base Will 4 + Wis 10
    expect(f.abilities.int.score).toBe(8);
    expect(f.ac.normal.total).toBe(10 + 2 + 2 + 3); // Dex, tiny, natural +3
    expect(f.special).toContain('Speak with master');
    expect(f.skillRanks.available).toBeNull();
  });
});

describe('companion temporary ability changes', () => {
  it('keeps score and mod apart from the temp-adjusted values', () => {
    const { c, k } = withClass('Druid', 4);
    const wolf = { ...make.companion('animal'), masterClassId: k.id };
    wolf.abilities.str.base = 14;
    wolf.abilities.str.temp = -4;
    const w = deriveCompanion(c, derive(c), wolf);
    expect([w.abilities.str.score, w.abilities.str.mod]).toEqual([15, 2]);
    expect([w.abilities.str.tempScore, w.abilities.str.tempMod, w.abilities.str.hasTemp]).toEqual([11, 0, true]);
  });
});
