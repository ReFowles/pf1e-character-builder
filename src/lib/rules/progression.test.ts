import { describe, expect, it } from 'vitest';
import type { DbArchetype, DbClass } from '../db/types';
import { make } from '../model/defaults';
import { characterLevelsFor, findDbClass, isFeature, progression, spellGains, universalGains } from './progression';

const feature = (name: string, levels: number[], labels?: string[]) => ({ name, levels, labels, summary: '', description: '' });

const fighter: DbClass = {
  id: 'fighter',
  name: 'Fighter',
  kind: 'base',
  hd: 10,
  bab: 'full',
  goodSaves: ['fort'],
  skillRanks: 2,
  classSkills: [],
  summary: '',
  source: '',
  maxLevel: 20,
  features: [
    feature('Bonus Feats', [1, 2, 4]),
    feature('Bravery', [2, 6, 10]),
    feature('Armor Training', [3, 7, 11, 15], ['Armor Training +1', 'Armor Training +2', 'Armor Training +3', 'Armor Training +4']),
  ],
};

const archetype = (name: string, features: DbArchetype['features']): DbArchetype => ({ name, classId: 'fighter', summary: '', source: '', features });

describe('progression', () => {
  it('lists features at each level they arrive or improve, with labels', () => {
    const p = progression(fighter, { bab: 'full', goodSaves: ['fort'] });
    expect(p.rows).toHaveLength(20);
    expect(p.rows[0].features.map((f) => f.label)).toEqual(['Bonus Feats']);
    expect(p.rows[6].features.map((f) => [f.label, f.first])).toEqual([['Armor Training +2', false]]);
    expect(p.rows[10].bab).toBe('+11/+6/+1');
    expect(p.rows[0].saves).toEqual({ fort: '+2', ref: '+0', will: '+0' });
    expect(p.rows[0].perDay).toBeNull();
  });

  it('marks base features an archetype replaces, whole or at given levels', () => {
    const thf = archetype('Two-Handed Fighter', [
      { ...feature('Overhand Chop', [3]), replaces: [{ name: 'Armor Training', levels: [3] }] },
      { ...feature('Shattering Strike', [2, 6, 10]), replaces: [{ name: 'Bravery' }] },
    ]);
    const p = progression(fighter, { bab: 'full', goodSaves: ['fort'] }, [thf]);
    const at = (level: number) => p.rows[level - 1].features.map((f) => `${f.label}${f.replacedBy ? ' ✗' : ''}${f.archetype ? ' *' : ''}`);
    expect(at(3)).toEqual(['Armor Training +1 ✗', 'Overhand Chop *']);
    expect(at(7)).toEqual(['Armor Training +2']);
    expect(at(6)).toEqual(['Bravery ✗', 'Shattering Strike *']);
    expect(p.conflicts).toEqual([]);
  });

  it('reports features two archetypes both replace', () => {
    const a = archetype('Archer', [{ ...feature('Hawkeye', [2]), replaces: [{ name: 'Bravery' }] }]);
    const b = archetype('Two-Handed Fighter', [{ ...feature('Shattering Strike', [2]), replaces: [{ name: 'Bravery' }] }]);
    expect(progression(fighter, { bab: 'full', goodSaves: ['fort'] }, [a, b]).conflicts).toEqual(['Bravery: Archer, Two-Handed Fighter']);
  });

  it('uses a prestige class table as printed', () => {
    const prc: DbClass = {
      ...fighter,
      kind: 'prestige',
      maxLevel: 2,
      features: [feature('Aura of Law', [1])],
      table: [
        { bab: '+0', fort: '+0', ref: '+0', will: '+1', special: ['Aura of law'], spells: '+1 level of spellcasting class' },
        { bab: '+1', fort: '+1', ref: '+1', will: '+1', special: [], spells: '' },
      ],
    };
    const p = progression(prc, { bab: 'full', goodSaves: ['fort'] });
    expect(p.rows).toHaveLength(2);
    expect(p.rows[0].saves.will).toBe('+1');
    expect(p.rows[0].spellsText).toMatch(/spellcasting/);
  });

  it('adds spells per day from the spell table and finds new spell levels', () => {
    const p = progression({ ...fighter, features: [] }, { bab: '1/2', goodSaves: ['will'], spellTable: 'sorcerer' });
    expect(p.spellLevels).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(spellGains(p.rows, 4)).toEqual({ perDay: [1, 2], known: [{ level: 0, count: 1 }, { level: 2, count: 1 }], newLevels: [2] });
  });
});

describe('findDbClass', () => {
  const rows = [fighter, { ...fighter, id: 'summoner-unchained', name: 'Summoner (Unchained)' }];
  it('matches by preset id, then name', () => {
    expect(findDbClass(rows, { name: 'whatever', presetId: 'fighter' })?.id).toBe('fighter');
    expect(findDbClass(rows, { name: 'Summoner (Unchained)', presetId: 'unchained-summoner' })?.id).toBe('summoner-unchained');
    expect(findDbClass(rows, { name: '' })).toBeUndefined();
  });
});

describe('character levels', () => {
  it('maps class levels to character levels, projecting future ones', () => {
    const a = make.classDef();
    const b = make.classDef();
    const c = { gestalt: false, classes: [a, b], levels: [make.level(a.id), make.level(b.id), make.level(a.id)] };
    expect(characterLevelsFor(c, a.id, 4)).toEqual([1, 3, 4, 5]);
    expect(characterLevelsFor(c, b.id, 2)).toEqual([2, 4]);
  });

  it('gives a feat at odd levels and an ability increase every fourth', () => {
    expect(universalGains(1)).toEqual({ feat: true, ability: false });
    expect(universalGains(4)).toEqual({ feat: false, ability: true });
    expect(universalGains(12)).toEqual({ feat: false, ability: true });
  });
});

describe('isFeature', () => {
  it('matches a sheet entry with or without a value', () => {
    expect(isFeature('Bravery +1', 'Bravery')).toBe(true);
    expect(isFeature('armor training 2', 'Armor Training')).toBe(true);
    expect(isFeature('Armor Training (Heavy Armor)', 'Armor Training')).toBe(false);
    expect(isFeature('Sneak Attack', 'Sneak Attack')).toBe(true);
  });
});
