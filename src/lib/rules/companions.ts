// Companion rules: animal companions, eidolons, phantoms and drakes follow
// their progression tables (rules/companionTables.ts) from the master's class
// level; familiars borrow from the master; other creatures use hit dice with
// creature-type math.
import { ABILITIES, SAVES, type Ability, type Character, type Companion, type CreatureType, type Save, type Size } from '../model/types';
import { bonus, stack, type Total } from './bonuses';
import type { Derived } from './derive';
import { abilityMod } from './math';
import { SKILLS } from './skills';
import { SAVE_ABILITY, SIZE_MODS, babFor, saveFor, shiftSize } from './tables';
import {
  ANIMAL_TABLE,
  DRAKE_POWER_LEVELS,
  DRAKE_TABLE,
  EIDOLON_BASE_FORMS,
  EIDOLON_TABLE,
  EIDOLON_UNCHAINED_TABLE,
  PHANTOM_FOCI,
  PHANTOM_SLAM,
  PHANTOM_TABLE,
  type CompanionTable,
} from './companionTables';

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

export const KIND_LABELS: Record<Companion['kind'], string> = {
  animal: 'Animal companion',
  familiar: 'Familiar',
  eidolon: 'Eidolon',
  phantom: 'Phantom',
  drake: 'Drake',
  other: 'Companion',
};

/** The progression table a companion follows, if any. */
export function tableFor(comp: Companion): CompanionTable | null {
  switch (comp.kind) {
    case 'animal':
      return ANIMAL_TABLE;
    case 'eidolon':
      return comp.eidolon.unchained ? EIDOLON_UNCHAINED_TABLE : EIDOLON_TABLE;
    case 'phantom':
      return PHANTOM_TABLE;
    case 'drake':
      return DRAKE_TABLE;
    default:
      return null;
  }
}

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
  /** score/mod exclude temporary changes; tempScore/tempMod include them (like the character's table). */
  abilities: Record<Ability, { score: number; mod: number; tempScore: number; tempMod: number; hasTemp: boolean; breakdown: Total }>;
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
  /** Size after a drake's growth steps. */
  size: Size;
  /** Eidolon evolution pool (null for other kinds). */
  pool: { total: number; spent: number } | null;
  maxAttacks: number | null;
  freeEvolutions: string[];
  /** Phantom slam damage for its level and size. */
  naturalDamage: string | null;
  /** Drake powers available at this level (null for other kinds). */
  powers: number | null;
  /** Levels granting a +1 ability pick (empty when the kind has none). */
  increaseLevels: number[];
}

const clampLevel = (lvl: number) => Math.max(0, Math.min(20, lvl));

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
  const table = tableFor(comp);
  const col = (xs: number[]) => (table && level > 0 ? (xs[row] ?? 0) : 0);
  const animal = comp.kind === 'animal';
  const familiar = comp.kind === 'familiar';
  const eidolon = comp.kind === 'eidolon';
  const phantom = comp.kind === 'phantom';
  const drake = comp.kind === 'drake';
  const focus = phantom ? PHANTOM_FOCI[comp.phantom.focus] : undefined;

  const hd = comp.hd || (table ? col(table.hd) : familiar ? d.level : level);
  // Drakes grow one size at 5th, 9th, 13th and 17th level.
  const growth = table ? table.sizeStepLevels.filter((l) => level >= l).length : 0;
  const effectiveSize = shiftSize(comp.size, growth);
  const size = SIZE_MODS[effectiveSize] ?? SIZE_MODS.medium;

  // Abilities: base + misc + temp, plus the table's bonuses.
  const strDex = table ? col(table.strDex) : 0;
  const dexCha = table ? col(table.dexCha) : 0;
  const abilities = {} as CompanionDerived['abilities'];
  for (const a of ABILITIES) {
    const s = comp.abilities[a];
    const parts = [bonus(a, s.base, 'Base'), bonus(a, s.misc, 'Misc')];
    if ((a === 'str' || a === 'dex') && strDex) parts.push(bonus(a, strDex, 'Companion bonus'));
    if ((a === 'dex' || a === 'cha') && dexCha) parts.push(bonus(a, dexCha, 'Phantom bonus'));
    if (growth) {
      const per = a === 'str' ? 4 : a === 'dex' ? -2 : a === 'con' ? 2 : 0;
      if (per) parts.push(bonus(a, per * growth, `Growth ×${growth}`));
    }
    const delta = focus?.abilities?.[a];
    if (delta) parts.push(bonus(a, delta, `${comp.phantom.focus} focus`));
    table?.increaseLevels.forEach((lvl, i) => {
      if (level >= lvl && comp.abilityIncreases[i] === a) parts.push(bonus(a, 1, `Level ${lvl} increase`));
    });
    if (familiar && a === 'int') {
      const floor = 5 + Math.ceil(Math.max(1, level) / 2);
      const have = stack(parts).total;
      if (have < floor) parts.push(bonus(a, floor - have, `Familiar Int ${floor}`));
    }
    const perm = stack(parts);
    const temp = stack([...parts, bonus(a, s.temp, 'Temporary')]);
    abilities[a] = {
      score: perm.total,
      mod: abilityMod(perm.total),
      tempScore: temp.total,
      tempMod: abilityMod(temp.total),
      hasTemp: temp.total !== perm.total,
      breakdown: temp,
    };
  }
  // Everything below (AC, saves, attacks...) uses the temporary-adjusted modifiers.
  const mod = (a: Ability) => abilities[a].tempMod;

  const bab = table?.babIsHd ? hd : familiar ? d.bab : babFor(type.bab, hd);

  // Hit points: average per hit die + Con, or half the master's for familiars.
  const hpParts = familiar
    ? [bonus('hp', Math.floor(d.hp.max.total / 2), "Half master's HP")]
    : [bonus('hp', Math.floor(hd * (type.hd / 2 + 0.5)), `${hd}d${type.hd} (average)`), bonus('hp', mod('con') * hd, 'CON')];
  hpParts.push(bonus('hp', comp.hpMisc, 'Misc'));
  const hpMax = stack(hpParts);

  // Armor class. The eidolon and ectoplasmic-phantom armor column is natural armor;
  // an incorporeal phantom turns it into a deflection bonus (plus its Cha modifier).
  const incorporeal = phantom && comp.phantom.form === 'incorporeal';
  const tableNatural = animal
    ? col(ANIMAL_TABLE.natural)
    : familiar
      ? Math.min(10, Math.ceil(Math.max(1, level) / 2))
      : drake
        ? 2 * Math.floor(level / 3) + 2 * growth
        : eidolon || (phantom && !incorporeal)
          ? col(table!.armor)
          : 0;
  const dex = bonus('ac', mod('dex'), 'DEX');
  const sizeAc = bonus('ac', size.ac, 'Size', 'size');
  const natural = bonus('ac', comp.naturalArmor + tableNatural, tableNatural ? 'Natural armor (incl. companion)' : 'Natural armor', 'natural');
  const armor = bonus('ac', comp.armorBonus, 'Armor / barding', 'armor');
  const deflection = bonus('ac', incorporeal ? col(table!.armor) + mod('cha') : 0, 'Deflection (incorporeal)', 'deflection');
  const misc = bonus('ac', comp.acMisc, 'Misc');
  const ten = bonus('ac', 10, 'Base');
  const ac = {
    normal: stack([ten, dex, sizeAc, natural, armor, deflection, misc]),
    touch: stack([ten, dex, sizeAc, deflection, misc]),
    flatFooted: stack([ten, bonus('ac', Math.min(0, mod('dex')), 'DEX'), sizeAc, natural, armor, deflection, misc]),
  };

  const saves = {} as Record<Save, Total>;
  for (const s of SAVES) {
    const good = drake || comp.goodSaves.includes(s);
    const own = saveFor(good, hd);
    const fromMaster = familiar ? d.baseSaves[s] : 0;
    saves[s] = stack([
      bonus(s, Math.max(own, fromMaster), fromMaster > own ? "Master's base save" : 'Base save'),
      bonus(s, mod(SAVE_ABILITY[s]), SAVE_ABILITY[s].toUpperCase()),
      bonus(s, comp.saveMisc[s], 'Misc'),
    ]);
  }

  const tiny = ['fine', 'diminutive', 'tiny'].includes(effectiveSize);
  const cmbAbility: Ability = tiny ? 'dex' : 'str';
  const cmb = stack([bonus('cmb', bab, 'BAB'), bonus('cmb', mod(cmbAbility), cmbAbility.toUpperCase()), bonus('cmb', size.cm, 'Size', 'size')]);
  const cmd = stack([
    bonus('cmd', 10, 'Base'),
    bonus('cmd', bab, 'BAB'),
    bonus('cmd', mod('str'), 'STR'),
    bonus('cmd', mod('dex'), 'DEX'),
    bonus('cmd', size.cm, 'Size', 'size'),
  ]);
  const init = stack([bonus('init', mod('dex'), 'DEX')]);

  const attacks: Record<string, CompanionAttackDerived> = {};
  for (const atk of comp.attacks) {
    const ability: Ability = atk.finesse ? 'dex' : 'str';
    attacks[atk.id] = {
      attack: stack([
        bonus('attack', bab, 'BAB'),
        bonus('attack', mod(ability), ability.toUpperCase()),
        bonus('attack', size.ac, 'Size', 'size'),
        bonus('attack', atk.primary ? 0 : -5, 'Secondary attack'),
        bonus('attack', atk.attackMisc, 'Misc'),
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
        bonus('skill', ranks, ranks > sk.ranks ? "Master's ranks" : 'Ranks'),
        bonus('skill', mod(sk.ability), sk.ability.toUpperCase()),
        bonus('skill', sk.classSkill && ranks > 0 ? 3 : 0, 'Class skill'),
        bonus('skill', name === 'fly' ? size.fly : name === 'stealth' ? size.stealth : 0, 'Size', 'size'),
        bonus('skill', sk.misc, 'Misc'),
      ]),
    };
  }
  const available = familiar ? null : table?.skillsPerHd ? table.skillsPerHd * hd : Math.max(1, type.ranks + mod('int')) * hd;

  const unlocked = (list: [number, string][]) => list.filter(([lvl]) => level >= lvl).map(([, name]) => name);
  const spellResistance = familiar && level >= 11 ? level + 5 : 0;
  const powers = drake ? DRAKE_POWER_LEVELS.filter((l) => level >= l).length + (level >= (['fire', 'cold'].includes(comp.drake.subtype) ? 3 : 1) ? 1 : 0) : null;
  const phantomDr = phantom && !incorporeal ? (level >= 20 ? 'DR 15/—' : level >= 15 ? 'DR 15/magic' : level >= 10 ? 'DR 10/magic' : level >= 5 ? 'DR 5/magic' : 'DR 5/slashing') : null;
  const special = [
    ...(table ? unlocked(table.special) : familiar ? unlocked(FAMILIAR_SPECIAL) : []),
    ...(spellResistance ? [`Spell resistance ${spellResistance}`] : []),
    ...(phantomDr ? [phantomDr] : []),
    ...(focus ? [`${comp.phantom.focus} focus (${focus.skills.join(', ')})`] : []),
    ...(drake && comp.drake.subtype ? [`${comp.drake.subtype} drake`] : []),
    ...comp.special,
  ];
  const bonusTricks = animal ? col(ANIMAL_TABLE.tricks) : 0;
  const int = abilities.int.score;
  const slamRow = phantom ? [...PHANTOM_SLAM].reverse().find(([lvl]) => level >= lvl) : undefined;
  const naturalDamage = slamRow ? (['fine', 'diminutive', 'tiny', 'small'].includes(effectiveSize) ? slamRow[2] : slamRow[1]) : null;
  const form = comp.eidolon.baseForm ? EIDOLON_BASE_FORMS[comp.eidolon.baseForm] : undefined;

  const source = animal
    ? `Animal companion level ${level}: ${hd} HD (${type.label.toLowerCase()} progression)`
    : familiar
      ? `Familiar of a level ${level} master: HD ${hd}, half the master's HP, the master's BAB and the better base saves`
      : eidolon
        ? `${comp.eidolon.unchained ? 'Unchained eidolon' : 'Eidolon'} of a level ${level} summoner: ${hd} HD, BAB ${hd}`
        : phantom
          ? `Phantom of a level ${level} spiritualist: ${hd} HD, ${comp.phantom.form}`
          : drake
            ? `Drake at charge level ${level}: ${hd} HD, ${effectiveSize}`
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
    feats: table ? col(table.feats) : familiar ? null : hd > 0 ? 1 + Math.floor((hd - 1) / 2) : 0,
    tricks: { known: int <= 2 && comp.creatureType === 'animal' ? 3 * int + bonusTricks : null, bonus: bonusTricks },
    special,
    spellResistance,
    source,
    size: effectiveSize,
    pool: eidolon ? { total: col(table!.pool) + comp.eidolon.poolMisc, spent: comp.eidolon.evolutions.reduce((s, e) => s + e.cost, 0) } : null,
    maxAttacks: eidolon ? col(table!.maxAttacks) : null,
    freeEvolutions: form?.freeEvolutions ?? [],
    naturalDamage,
    powers,
    increaseLevels: table?.increaseLevels ?? [],
  };
}
