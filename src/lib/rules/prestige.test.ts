import { describe, expect, it } from 'vitest';
import { make, newCharacter } from '../model/defaults';
import { CASTING_ADVANCE, defaultSpellAdvance, eligibleCastingClasses, levelSpellAdvance, prestigeLevelOf } from './prestige';
import { presetFromDb } from './classPresets';

describe('prestige casting', () => {
  it('keeps every table within prestige levels 1–10', () => {
    for (const [id, adv] of Object.entries(CASTING_ADVANCE)) {
      expect(adv.levels.every((l) => l >= 1 && l <= 10), id).toBe(true);
      expect(new Set(adv.levels).size).toBe(adv.levels.length);
    }
  });

  it('picks one arcane and one divine class for a mystic theurge', () => {
    const c = newCharacter();
    const wiz = { ...make.classDef(), name: 'Wizard', presetId: 'wizard' };
    const cle = { ...make.classDef(), name: 'Cleric', presetId: 'cleric' };
    const mt = { ...make.classDef(), name: 'Mystic Theurge', presetId: 'mystic-theurge', prestige: true, castingAdvance: CASTING_ADVANCE['mystic-theurge'] };
    c.classes = [wiz, cle, mt];
    c.spellcasting = [{ ...make.spellcasting(), classId: wiz.id }, { ...make.spellcasting(), classId: cle.id }];
    c.levels = [make.level(wiz.id), make.level(cle.id), make.level(mt.id), make.level(mt.id)];
    expect(prestigeLevelOf(c, 3)).toBe(2);
    expect(defaultSpellAdvance(c, mt, 1)).toEqual([wiz.id, cle.id]);
    const ek = { ...make.classDef(), name: 'Eldritch Knight', presetId: 'eldritch-knight', prestige: true, castingAdvance: CASTING_ADVANCE['eldritch-knight'] };
    expect(eligibleCastingClasses(c, ek.castingAdvance!).map((k) => k.id)).toEqual([wiz.id]);
    expect(defaultSpellAdvance(c, ek, 1)).toEqual([]);
    expect(defaultSpellAdvance(c, ek, 2)).toEqual([wiz.id]);
  });

  it('maps a database class to a preset', () => {
    const p = presetFromDb({ id: 'dragon-disciple', name: 'Dragon Disciple', kind: 'prestige', hd: 12, bab: '3/4', goodSaves: ['fort', 'will'], skillRanks: 2, classSkills: ['fly', 'knowledge:arcana'], summary: '', source: 'PZO1110' });
    expect(p.prestige).toBe(true);
    expect(p.castingAdvance?.levels).toEqual([2, 3, 4, 6, 7, 8, 10]);
  });
});

describe('gestalt prestige levels', () => {
  it('counts levels on either side, only while the rule is on', () => {
    const c = newCharacter();
    const ftr = { ...make.classDef(), name: 'Fighter' };
    const wiz = { ...make.classDef(), name: 'Wizard', presetId: 'wizard' };
    const ek = { ...make.classDef(), name: 'Eldritch Knight', presetId: 'eldritch-knight', prestige: true, castingAdvance: CASTING_ADVANCE['eldritch-knight'] };
    c.classes = [ftr, wiz, ek];
    c.spellcasting = [{ ...make.spellcasting(), classId: wiz.id }];
    c.levels = [make.level(ftr.id), make.level(ftr.id), make.level(ek.id)];
    c.levels[0].gestaltClassId = wiz.id;
    c.levels[1].gestaltClassId = ek.id;
    c.levels[2].gestaltClassId = wiz.id;
    c.gestalt = true;
    expect(prestigeLevelOf(c, 2)).toBe(2);
    // The second EK level would advance wizard, but wizard is already this level's other side.
    expect(levelSpellAdvance(c, 2)).toEqual([]);
    c.levels[2].gestaltClassId = ftr.id;
    expect(levelSpellAdvance(c, 2)).toEqual([wiz.id]);
    c.gestalt = false;
    expect(prestigeLevelOf(c, 2)).toBe(1);
  });
});
