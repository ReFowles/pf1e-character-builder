import { describe, expect, it } from 'vitest';
import { make, newCharacter } from '../model/defaults';
import type { ClassDef } from '../model/types';
import { deriveCompanion } from './companions';
import { guessKind } from '../companions';
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

  it("borrows the master's gestalt base saves", () => {
    const { c, k } = withClass('Wizard', 5, { hd: 6, bab: '1/2', goodSaves: ['will'] });
    const ftr = { ...make.classDef(), name: 'Fighter', hd: 10, bab: 'full' as const, goodSaves: ['fort' as const] };
    c.classes.push(ftr);
    c.gestalt = true;
    for (const l of c.levels) l.gestaltClassId = ftr.id;
    const cat = { ...make.companion('familiar'), masterClassId: k.id };
    const f = deriveCompanion(c, derive(c), cat);
    // Fighter 5 gives Fort +4 (own Fort at 5 HD is +4 too), Wizard 5 gives Will +4.
    expect([f.saves.fort.total, f.saves.will.total]).toEqual([4, 4]);
    expect(f.saves.fort.parts[0].source).toBe('Base save');
    expect(f.saves.will.parts[0].source).toBe("Master's base save");
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

describe('companion progression tables', () => {
  it('reads the animal companion feat column (druid 2 → 1 feat) and honours an HD override', () => {
    const { c, k } = withClass('Druid', 2);
    const wolf = { ...make.companion('animal'), masterClassId: k.id };
    expect(deriveCompanion(c, derive(c), wolf).feats).toBe(1);
    wolf.hd = 7;
    expect(deriveCompanion(c, derive(c), wolf).hd).toBe(7);
  });

  it('advances an eidolon by summoner level', () => {
    const { c, k } = withClass('Summoner', 5, { hd: 8, bab: '3/4', goodSaves: ['will'] });
    const eid = { ...make.companion('eidolon'), masterClassId: k.id };
    eid.eidolon.evolutions = [{ ...make.evolution(), name: 'Bite', cost: 1 }, { ...make.evolution(), name: 'Improved damage', cost: 1 }];
    const e = deriveCompanion(c, derive(c), eid);
    expect([e.hd, e.bab, e.feats]).toEqual([4, 4, 2]);
    expect(e.pool).toEqual({ total: 8, spent: 2 });
    expect(e.maxAttacks).toBe(4);
    expect(e.skillRanks.available).toBe(16);
    expect(e.abilities.str.score).toBe(16 + 2);
    expect(e.abilities.dex.score).toBe(12 + 2);
    // 10 + Dex 2 + natural 2 (base form) + armor column 4
    expect(e.ac.normal.total).toBe(10 + 2 + 2 + 4);
    expect(e.saves.fort.total).toBe(4 + 1);
    expect(e.saves.ref.total).toBe(1 + 2);
    eid.eidolon.unchained = true;
    expect(deriveCompanion(c, derive(c), eid).pool?.total).toBe(4);
  });

  it('gives a phantom its slam, focus saves and incorporeal deflection', () => {
    const { c, k } = withClass('Spiritualist', 9, { hd: 8, bab: '3/4', goodSaves: ['will'] });
    const ph = { ...make.companion('phantom'), masterClassId: k.id };
    ph.goodSaves = ['fort', 'will'];
    ph.phantom.focus = 'Anger';
    let p = deriveCompanion(c, derive(c), ph);
    expect([p.hd, p.bab, p.feats, p.skillRanks.available]).toEqual([7, 7, 4, 14]);
    expect(p.naturalDamage).toBe('1d10');
    expect(p.abilities.str.score).toBe(12 + 2); // Anger focus
    expect(p.abilities.dex.score).toBe(14 - 2 + 3); // focus −2, Dex/Cha column +3
    expect(p.abilities.cha.score).toBe(13 + 3);
    expect(p.ac.touch.parts.find((x) => x.type === 'deflection')?.value ?? 0).toBe(0);
    expect(p.special).toContain('DR 5/magic');
    ph.phantom.form = 'incorporeal';
    p = deriveCompanion(c, derive(c), ph);
    // armor column 6 + Cha mod 3 as deflection, in touch AC too
    expect(p.ac.touch.parts.find((x) => x.type === 'deflection')?.value).toBe(6 + 3);
    expect(p.ac.normal.parts.find((x) => x.type === 'natural')?.value ?? 0).toBe(0);
  });

  it('grows a drake with its charge', () => {
    const { c, k } = withClass('Ranger', 9, { hd: 10, bab: 'full', goodSaves: ['fort', 'ref'] });
    const dr = { ...make.companion('drake'), masterClassId: k.id };
    dr.drake.subtype = 'fire';
    const d = deriveCompanion(c, derive(c), dr);
    expect([d.hd, d.bab, d.feats, d.skillRanks.available]).toEqual([7, 7, 4, 21]);
    expect(d.size).toBe('medium'); // tiny → small (5th) → medium (9th)
    expect([d.abilities.str.score, d.abilities.dex.score, d.abilities.con.score]).toEqual([8 + 8, 17 - 4, 11 + 4]);
    // +2 at 3rd, 6th, 9th plus 2 per size step
    expect(d.ac.normal.parts.find((x) => x.type === 'natural')?.value).toBe(6 + 4);
    expect(d.powers).toBe(2 + 1);
    expect(d.saves.will.total).toBe(5);
  });

  it('guesses the companion kind from the classes', () => {
    const { c } = withClass('Spiritualist', 1);
    expect(guessKind(c).kind).toBe('phantom');
    const cav = withClass('Cavalier', 1).c;
    expect(guessKind(cav)).toMatchObject({ kind: 'animal', label: 'Mount' });
    const sum = withClass('Unchained Summoner', 1).c;
    expect(guessKind(sum)).toMatchObject({ kind: 'eidolon', unchained: true });
  });
});
