import { describe, expect, it } from 'vitest';
import { make, newCharacter } from '../model/defaults';
import type { Character } from '../model/types';
import { derive } from './derive';
import { evaluate } from './expr';

/** Level 3 human fighter: Str 16, Dex 14, Con 14, chain shirt + heavy shield. */
function fighter(): Character {
  const c = newCharacter();
  c.abilities.str.base = 14;
  c.abilities.str.racial = 2;
  c.abilities.dex.base = 14;
  c.abilities.con.base = 14;
  const k = { ...make.classDef(), name: 'Fighter', hd: 10, bab: 'full' as const, goodSaves: ['fort' as const], classSkills: ['climb'] };
  c.classes = [k];
  c.favoredClassIds = [k.id];
  c.levels = [6, 6, 7].map((roll) => ({ ...make.level(k.id), hpRoll: roll }));
  c.armor = [
    { ...make.armor('armor'), name: 'Chain shirt', acBonus: 4, maxDex: 4, checkPenalty: -2, category: 'light' },
    { ...make.armor('shield'), name: 'Heavy steel shield', acBonus: 2, checkPenalty: -2 },
  ];
  c.weapons = [{ ...make.weapon(), name: 'Longsword', damage: '1d8' }];
  return c;
}

describe('derive', () => {
  it('collects extra damage from the weapon and from active macros', () => {
    const c = fighter();
    const bow = { ...make.weapon(), name: 'Longbow', kind: 'ranged' as const, damage: '1d8' };
    c.weapons.push(bow);
    const sword = c.weapons[0];
    sword.extraDamage = [
      { ...make.extraDamage(), dice: '1d6', type: 'fire' },
      { ...make.extraDamage(), dice: '2d6+1', type: 'precision', active: false },
      { ...make.extraDamage(), dice: 'junk' },
    ];
    const sneak = { ...make.macroDice(), count: 'ceil(@class.fighter.level / 2)', type: 'precision', applies: 'melee' as const };
    c.macros = [{ ...make.macro(), name: 'Sneak Attack', active: true, damageDice: [sneak] }];
    let d = derive(c);
    expect(d.weapons[sword.id].extraDamage).toEqual([
      { notation: '1d6', type: 'fire' },
      { notation: '2d6', type: 'precision', macro: 'Sneak Attack' },
    ]);
    expect(d.weapons[bow.id].extraDamage).toEqual([]);
    c.macros[0].active = false;
    d = derive(c);
    expect(d.weapons[sword.id].extraDamage).toEqual([{ notation: '1d6', type: 'fire' }]);
    c.macros[0].active = true;
    sneak.count = '@class.rogue.level';
    expect(derive(c).macroErrors[sneak.id]).toBe(true);
  });

  it('computes core combat stats', () => {
    const d = derive(fighter());
    expect(d.level).toBe(3);
    expect(d.bab).toBe(3);
    expect(d.hp.max.total).toBe(10 + 2 + 6 + 2 + 7 + 2 + 3);
    expect(d.attack.melee.total).toBe(6);
    expect([d.ac.normal.total, d.ac.touch.total, d.ac.flatFooted.total]).toEqual([18, 12, 16]);
    expect([d.saves.fort.total, d.saves.ref.total, d.saves.will.total]).toEqual([5, 3, 1]);
    expect(d.cmb.total).toBe(6);
    expect(d.cmd.total).toBe(10 + 3 + 3 + 2);
    expect(d.acp).toBe(-4);
    const climb = Object.values(d.skills).find((s) => s.def.key === 'climb')!;
    expect(climb.total).toBe(3 - 4);
    expect(d.xpNext).toBe(9000);
  });

  it('applies size, conditions and macros', () => {
    const c = fighter();
    c.info.size = 'small';
    c.conditions = ['Shaken', 'flatFooted'];
    c.macros = [
      {
        ...make.macro(),
        name: 'Power Attack',
        active: true,
        effects: [
          { ...make.macroEffect(), key: 'attack.melee', value: '-1 - floor(@bab/4)' },
          { ...make.macroEffect(), key: 'damage.melee', value: '2 * (1 + floor(@bab/4))' },
        ],
      },
    ];
    const d = derive(c);
    // 3 BAB + 3 Str + 1 size - 2 shaken - 1 power attack
    expect(d.attack.melee.total).toBe(4);
    expect(d.weapons[c.weapons[0].id].damageBonus).toBe(3 + 2);
    expect(d.cmb.total).toBe(3 + 3 - 1);
    // Flat-footed: no Dex. 10 + 4 + 2 + 1 size
    expect(d.ac.normal.total).toBe(17);
    expect(d.saves.will.total).toBe(-1);
    const stealth = Object.values(d.skills).find((s) => s.def.key === 'stealth')!;
    expect(stealth.total).toBe(2 + 4 - 4 - 2);
  });

  it('tracks weight and load', () => {
    const c = fighter();
    const pack = { ...make.item(), name: 'Bag of holding', isContainer: true, weightless: true, weight: 15 };
    c.items = [pack, { ...make.item(), name: 'Rope', weight: 10, containerId: pack.id }];
    c.armor[0].weight = 25;
    c.currency.carried.gp = 100;
    const d = derive(c);
    expect(d.weight.items).toBe(15);
    expect(d.weight.total).toBe(15 + 25 + 2);
    expect(d.load).toBe('light');
  });
});

describe('derive spellcasting', () => {
  it('uses class tables, bonus spells and domain slots', () => {
    const c = newCharacter();
    c.abilities.wis.base = 16;
    const k = { ...make.classDef(), name: 'Cleric' };
    c.classes = [k];
    c.levels = [1, 2, 3].map(() => make.level(k.id));
    c.spellcasting = [{ ...make.spellcasting(), classId: k.id, ability: 'wis', table: 'cleric', domainSlot: true, spellPenMisc: 2 }];
    const s = derive(c).spellcasting[c.spellcasting[0].id];
    expect(s.casterLevel).toBe(3);
    // Cleric 3: 4/2/1 + bonus (Wis +3: 0/1/1); domain slots reported separately.
    expect(s.slots.slice(0, 4)).toEqual([4, 3, 2, null]);
    expect(s.domain.slice(0, 4)).toEqual([0, 1, 1, 0]);
    expect(s.dcs[2]).toBe(15);
    expect(s.spellPen).toBe(5);
  });

  it('lets manual "other" blocks become castable through misc slots', () => {
    const c = newCharacter();
    c.spellcasting = [{ ...make.spellcasting(), ability: 'cha', casterLevelMisc: 5, slotsMisc: [0, 2, 0, 0, 0, 0, 0, 0, 0, 0] }];
    const s = derive(c).spellcasting[c.spellcasting[0].id];
    expect(s.casterLevel).toBe(5);
    c.spellcasting[0].concentrationMisc = 4;
    expect(derive(c).spellcasting[c.spellcasting[0].id].concentration).toBe(9);
    expect(s.slots.slice(0, 3)).toEqual([null, 2, null]);
  });

  it('applies mythic paragon to potency only and steps the surge die', () => {
    const c = newCharacter();
    c.mythic = { ...c.mythic, enabled: true, tier: 3, paragon: true, surgeUpgrades: 1, path: 'archmage' };
    const d = derive(c);
    const m = d.mythic!;
    expect([m.effectiveTier, m.powerMax, m.surgeDie, m.hp]).toEqual([5, 9, '1d8', 9]);
    expect(d.init.total).toBe(5);
    c.mythic.surgeUpgrades = 9;
    expect(derive(c).mythic!.surgeDie).toBe('2d12');
  });
});

describe('derive round 2', () => {
  it('sums wealth, groups other fcbs and applies mythic', () => {
    const c = fighter();
    c.weapons[0].price = 15;
    c.items = [{ ...make.item(), name: 'Rope', price: 1, quantity: 2, notCarried: true }];
    c.currency.carried.gp = 10;
    c.currency.locations = [{ ...make.coinLocation(), coins: { pp: 1, gp: 0, sp: 5, cp: 0 } }];
    c.levels = c.levels.map((l) => ({ ...l, fcb: { kind: 'other' as const, label: 'Channel', amount: '1/3' } }));
    c.mythic = { ...c.mythic, enabled: true, tier: 3, path: 'champion', abilityIncreases: ['str', 'con', null, null, null] };
    const d = derive(c);
    expect(d.wealth.total).toBe(15 + 2 + 10 + 10.5);
    expect(d.fcb.other).toEqual([{ label: 'Channel', amount: '1', value: 1 }]);
    expect(d.abilities.str.score).toBe(18);
    expect(d.abilities.con.score).toBe(14);
    expect(d.init.total).toBe(2 + 3);
    // 3 levels of d10 at Con +2 (rolls 6/6/7, first max) + 15 mythic, no FCB hp.
    expect(d.hp.max.total).toBe(12 + 8 + 9 + 15);
    expect(d.mythic).toMatchObject({ powerMax: 9, surgeDie: '1d6' });
  });

  it('counts favored class bonuses for every favored class', () => {
    const c = fighter();
    const rogue = { ...make.classDef(), name: 'Rogue', hd: 8, bab: '3/4' as const, goodSaves: ['ref' as const] };
    c.classes.push(rogue);
    c.levels.push({ ...make.level(rogue.id), hpRoll: 4, fcb: { kind: 'hp', label: '', amount: '' } });
    const own = derive(c).fcb.hp;
    c.favoredClassIds.push(rogue.id);
    expect(derive(c).fcb.hp).toBe(own + 1);
  });

  it('applies Toughness by feat name and level-up ability increases', () => {
    const c = fighter();
    const before = derive(c).hp.max.total;
    c.feats.push({ ...make.feat(1), name: 'toughness' });
    expect(derive(c).hp.max.total).toBe(before + 3);
    c.levels.push(...[1, 1].map(() => ({ ...make.level(c.classes[0].id), hpRoll: 5 })));
    expect(derive(c).hp.max.parts.find((p) => p.source === 'Toughness')?.value).toBe(5);
    c.abilities.str.level = 1;
    const d = derive(c);
    expect(d.abilities.str.score).toBe(17);
    expect(d.abilityIncreases).toEqual({ expected: 1, used: 1 });
  });

  it('advances a casting class through prestige levels', () => {
    const c = newCharacter();
    const wiz = { ...make.classDef(), name: 'Wizard', presetId: 'wizard', hd: 6, bab: '1/2' as const, goodSaves: ['will' as const], castingAbility: 'int' as const };
    const ek = { ...make.classDef(), name: 'Eldritch Knight', presetId: 'eldritch-knight', hd: 10, bab: 'full' as const, goodSaves: ['fort' as const], prestige: true, castingAdvance: { which: 'arcane' as const, levels: [2, 3, 4, 5, 6, 7, 8, 9, 10] } };
    c.classes = [wiz, ek];
    c.levels = [
      ...Array.from({ length: 5 }, () => ({ ...make.level(wiz.id), hpRoll: 4 })),
      ...Array.from({ length: 3 }, () => ({ ...make.level(ek.id), hpRoll: 6 })),
    ];
    c.levels[6].spellAdvance = [wiz.id];
    c.levels[7].spellAdvance = [wiz.id];
    c.spellcasting = [{ ...make.spellcasting(), classId: wiz.id, ability: 'int', table: 'wizard' }];
    const d = derive(c);
    expect(d.classLevels[wiz.id]).toBe(5);
    expect(d.castingLevels[wiz.id]).toBe(7);
    expect(d.bab).toBe(2 + 3);
    const sc = d.spellcasting[c.spellcasting[0].id];
    expect(sc.casterLevel).toBe(7);
    expect(sc.base[4]).toBe(1); // 4th-level slot at wizard table row 7
    // Formula references are case-insensitive, so the var key is lowercase.
    expect(evaluate('@class.wizard.casterLevel', d.vars)).toBe(7);
  });
});
