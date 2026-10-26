// Companion rules: animal companions and familiars follow their core progression
// tables; eidolons and other companions use hit dice with creature-type math.
import { ABILITIES, type Ability, type Character, type Companion, type CreatureType, type Save } from '../model/types';
import { stack, type Bonus, type Total } from './bonuses';
import type { Derived } from './derive';
import { abilityMod } from './math';
import { SKILLS } from './skills';
import { SIZE_MODS, babFor, saveFor } from './tables';

interface TypeProgression {
  label: string;
  hd: number;
  bab: 'full' | '3/4' | '1/2';
  ranks: number;
  goodSaves: Save[];
}

export const CREATURE_PROGRESSION: Record<CreatureType, TypeProgression> = {
  animal: { label: 'Animal', hd: 8, bab: '3/4', ranks: 2, goodSaves: ['fort', 'ref'] },
  magicalBeast: { label: 'Magical beast', hd: 10, bab: 'full', ranks: 2, goodSaves: ['fort', 'ref'] },
  outsider: { label: 'Outsider', hd: 10, bab: 'full', ranks: 6, goodSaves: ['fort', 'ref'] },
  dragon: { label: 'Dragon', hd: 12, bab: 'full', ranks: 6, goodSaves: ['fort', 'ref', 'will'] },
  vermin: { label: 'Vermin', hd: 8, bab: '3/4', ranks: 0, goodSaves: ['fort'] },
  other: { label: 'Other', hd: 8, bab: '3/4', ranks: 2, goodSaves: ['fort', 'ref'] },
};

export const KIND_LABELS = { animal: 'Animal companion', familiar: 'Familiar', eidolon: 'Eidolon', other: 'Companion' };

// Animal companion table by effective druid level 1..20 (Core Rulebook).
const AC_HD = [2, 3, 3, 4, 5, 6, 6, 7, 8, 9, 9, 10, 11, 12, 12, 13, 14, 15, 15, 16];
const AC_NATURAL = [0, 0, 2, 2, 2, 4, 4, 4, 6, 6, 6, 8, 8, 8, 10, 10, 10, 12, 12, 12];
const AC_STR_DEX = [0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6];
const AC_TRICKS = [1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6, 7, 7, 7];
const AC_SPECIAL: [number, string][] = [
  [1, 'Link'],
  [1, 'Share spells'],
  [3, 'Evasion'],
  [6, 'Devotion (+4 morale vs enchantment)'],
  [9, 'Multiattack'],
  [15, 'Improved evasion'],
];
export const ANIMAL_INCREASE_LEVELS = [4, 9, 14];

const FAMILIAR_SPECIAL: [number, string][] = [
  [1, 'Alertness (master)'],
  [1, 'Improved evasion'],
  [1, 'Share spells'],
  [1, 'Empathic link'],
  [3, 'Deliver touch spells'],
  [5, 'Speak with master'],
  [7, 'Speak with animals of its kind'],
  [13, 'Scry on familiar'],
];

export interface CompanionAttackDerived {
  attack: Total;
  damageBonus: number;
}

export interface CompanionSkillDerived {
  ranks: number;
  total: Total;
}

export interface CompanionDerived {
  /** Master class level + misc (animal companions and familiars). */
  level: number;
  hd: number;
  bab: number;
  abilities: Record<Ability, { score: number; mod: number; breakdown: Total }>;
  hp: { max: Total; current: number };
  ac: { normal: Total; touch: Total; flatFooted: Total };
  saves: Record<Save, Total>;
  cmb: Total;
  cmd: Total;
  init: Total;
  attacks: Record<string, CompanionAttackDerived>;
  skills: Record<string, CompanionSkillDerived>;
  /** Skill ranks to spend (null when the companion uses its master's ranks). */
  skillRanks: { spent: number; available: number | null };
  feats: number | null;
  /** Tricks known for animals (Int 1–2); null when not limited. */
  tricks: { known: number | null; bonus: number };
  special: string[];
  spellResistance: number;
  source: string;
}

const part = (key: string, value: number, source: string, type: Bonus['type'] = 'untyped'): Bonus => ({ key, value, type, source });

const clampLevel = (lvl: number) => Math.max(0, Math.min(20, lvl));

/** The master's base saves (class progressions only, no ability modifiers). */
function masterBaseSave(c: Character, d: Derived, s: Save): number {
  return c.classes.reduce((sum, k) => sum + saveFor(k.goodSaves.includes(s), d.classLevels[k.id] ?? 0), 0);
}

/** Master's ranks in a skill with the same name (familiars use the better of the two). */
function masterRanks(c: Character, name: string): number {
  const def = SKILLS.find((s) => s.name.toLowerCase() === name.trim().toLowerCase());
  if (!def) return 0;
  return Math.max(0, ...c.skills.filter((e) => e.skill === def.key).map((e) => e.ranks));
}

export function deriveCompanion(c: Character, d: Derived, comp: Companion): CompanionDerived {
  const type = CREATURE_PROGRESSION[comp.creatureType] ?? CREATURE_PROGRESSION.animal;
  const masterLevel = comp.masterClassId ? (d.classLevels[comp.masterClassId] ?? 0) : d.level;
  const level = clampLevel(masterLevel + comp.levelMisc);
  const row = Math.max(0, level - 1);
  const animal = comp.kind === 'animal';
  const familiar = comp.kind === 'familiar';

  const hd = animal ? (level > 0 ? AC_HD[row] : 0) : familiar ? d.level : comp.hd || level;
  const size = SIZE_MODS[comp.size] ?? SIZE_MODS.medium;

  // Abilities: base + misc + temp, plus companion bonuses.
  const strDex = animal && level > 0 ? AC_STR_DEX[row] : 0;
  const abilities = {} as CompanionDerived['abilities'];
  for (const a of ABILITIES) {
    const s = comp.abilities[a];
    const parts = [part(a, s.base, 'Base'), part(a, s.misc, 'Misc'), part(a, s.temp, 'Temporary')];
    if ((a === 'str' || a === 'dex') && strDex) parts.push(part(a, strDex, 'Companion bonus'));
    if (animal)
      ANIMAL_INCREASE_LEVELS.forEach((lvl, i) => {
        if (level >= lvl && comp.abilityIncreases[i] === a) parts.push(part(a, 1, `Level ${lvl} increase`));
      });
    let total = stack(parts);
    if (familiar && a === 'int') {
      const floor = 5 + Math.ceil(Math.max(1, level) / 2);
      if (total.total < floor) total = stack([...parts, part(a, floor - total.total, `Familiar Int ${floor}`)]);
    }
    abilities[a] = { score: total.total, mod: abilityMod(total.total), breakdown: total };
  }
  const mod = (a: Ability) => abilities[a].mod;

  const bab = familiar ? d.bab : babFor(type.bab, hd);

  // Hit points: average per hit die + Con, or half the master's for familiars.
  const hpParts = familiar
    ? [part('hp', Math.floor(d.hp.max.total / 2), "Half master's HP")]
    : [part('hp', Math.floor(hd * (type.hd / 2 + 0.5)), `${hd}d${type.hd} (average)`), part('hp', mod('con') * hd, 'CON')];
  hpParts.push(part('hp', comp.hpMisc, 'Misc'));
  const hpMax = stack(hpParts);

  // Armor class.
  const companionNatural = animal && level > 0 ? AC_NATURAL[row] : familiar ? Math.min(10, Math.ceil(Math.max(1, level) / 2)) : 0;
  const dex = part('ac', mod('dex'), 'DEX');
  const sizeAc = part('ac', size.ac, 'Size', 'size');
  const natural = part('ac', comp.naturalArmor + companionNatural, companionNatural ? 'Natural armor (incl. companion)' : 'Natural armor', 'natural');
  const armor = part('ac', comp.armorBonus, 'Armor / barding', 'armor');
  const misc = part('ac', comp.acMisc, 'Misc');
  const ten = part('ac', 10, 'Base');
  const ac = {
    normal: stack([ten, dex, sizeAc, natural, armor, misc]),
    touch: stack([ten, dex, sizeAc, misc]),
    flatFooted: stack([ten, part('ac', Math.min(0, mod('dex')), 'DEX'), sizeAc, natural, armor, misc]),
  };

  const SAVE_ABILITY: Record<Save, Ability> = { fort: 'con', ref: 'dex', will: 'wis' };
  const saves = {} as Record<Save, Total>;
  for (const s of ['fort', 'ref', 'will'] as const) {
    const own = saveFor(comp.goodSaves.includes(s), hd);
    const fromMaster = familiar ? masterBaseSave(c, d, s) : 0;
    saves[s] = stack([
      part(s, Math.max(own, fromMaster), fromMaster > own ? "Master's base save" : 'Base save'),
      part(s, mod(SAVE_ABILITY[s]), SAVE_ABILITY[s].toUpperCase()),
      part(s, comp.saveMisc[s], 'Misc'),
    ]);
  }

  const tiny = ['fine', 'diminutive', 'tiny'].includes(comp.size);
  const cmbAbility: Ability = tiny ? 'dex' : 'str';
  const cmb = stack([part('cmb', bab, 'BAB'), part('cmb', mod(cmbAbility), cmbAbility.toUpperCase()), part('cmb', size.cm, 'Size', 'size')]);
  const cmd = stack([
    part('cmd', 10, 'Base'),
    part('cmd', bab, 'BAB'),
    part('cmd', mod('str'), 'STR'),
    part('cmd', mod('dex'), 'DEX'),
    part('cmd', size.cm, 'Size', 'size'),
  ]);
  const init = stack([part('init', mod('dex'), 'DEX')]);

  const attacks: Record<string, CompanionAttackDerived> = {};
  for (const atk of comp.attacks) {
    const ability: Ability = atk.finesse ? 'dex' : 'str';
    attacks[atk.id] = {
      attack: stack([
        part('attack', bab, 'BAB'),
        part('attack', mod(ability), ability.toUpperCase()),
        part('attack', size.ac, 'Size', 'size'),
        part('attack', atk.primary ? 0 : -5, 'Secondary attack'),
        part('attack', atk.attackMisc, 'Misc'),
      ]),
      damageBonus: Math.floor(mod('str') * (atk.primary ? 1 : 0.5)) + atk.damageMisc,
    };
  }

  const skills: Record<string, CompanionSkillDerived> = {};
  let spent = 0;
  for (const sk of comp.skills) {
    spent += sk.ranks;
    const ranks = familiar ? Math.max(sk.ranks, masterRanks(c, sk.name)) : sk.ranks;
    const name = sk.name.trim().toLowerCase();
    skills[sk.id] = {
      ranks,
      total: stack([
        part('skill', ranks, ranks > sk.ranks ? "Master's ranks" : 'Ranks'),
        part('skill', mod(sk.ability), sk.ability.toUpperCase()),
        part('skill', sk.classSkill && ranks > 0 ? 3 : 0, 'Class skill'),
        part('skill', name === 'fly' ? size.fly : name === 'stealth' ? size.stealth : 0, 'Size', 'size'),
        part('skill', sk.misc, 'Misc'),
      ]),
    };
  }
  const available = familiar ? null : Math.max(1, type.ranks + mod('int')) * hd;

  const unlocked = (table: [number, string][]) => table.filter(([lvl]) => level >= lvl).map(([, name]) => name);
  const spellResistance = familiar && level >= 11 ? level + 5 : 0;
  const special = [
    ...(animal ? unlocked(AC_SPECIAL) : familiar ? unlocked(FAMILIAR_SPECIAL) : []),
    ...(spellResistance ? [`Spell resistance ${spellResistance}`] : []),
    ...comp.special,
  ];
  const bonusTricks = animal && level > 0 ? AC_TRICKS[row] : 0;
  const int = abilities.int.score;

  const source = animal
    ? `Animal companion level ${level}: ${hd} HD (${type.label.toLowerCase()} progression)`
    : familiar
      ? `Familiar of a level ${level} master: HD ${hd}, half the master's HP, the master's BAB and the better base saves`
      : `${hd} HD ${type.label.toLowerCase()}`;

  return {
    level,
    hd,
    bab,
    abilities,
    hp: { max: hpMax, current: hpMax.total + comp.hp.temp - comp.hp.damage },
    ac,
    saves,
    cmb,
    cmd,
    init,
    attacks,
    skills,
    skillRanks: { spent, available },
    feats: familiar ? null : hd > 0 ? 1 + Math.floor((hd - 1) / 2) : 0,
    tricks: { known: int <= 2 && comp.creatureType === 'animal' ? 3 * int + bonusTricks : null, bonus: bonusTricks },
    special,
    spellResistance,
    source,
  };
}
