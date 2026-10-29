import {
  ABILITIES,
  type Ability,
  type Character,
  type ClassDef,
  type Item,
  type Save,
  type SkillEntry,
  type Size,
} from '../model/types';
import { hasFeat } from './featBonuses';
import { gestaltConflicts, levelClassIds, classProgression } from './gestalt';
import { BonusSet, stack, type Bonus, type Total } from './bonuses';
import { findCondition } from './conditions';
import { tryEvaluate, type Vars } from './expr';
import { abilityMod } from './math';
import { SKILL_BY_KEY, isClassSkill, subtypeKey, type SkillDef } from './skills';
import { SPELL_TABLE_BY_ID } from './spellTables';
import { scaleDice } from './dice';
import { formatNotation, parseNotation } from '../dice/notation';
import { ABILITY_INCREASE_TIERS, PATH_HP, mythicPowerMax, surgeDie } from './mythic';
import { addFractions, formatFraction, parseFraction } from './fraction';
import {
  COINS_PER_LB,
  LOAD_PENALTIES,
  SIZE_MODS,
  bonusSpells,
  carryingCapacity,
  scaleCapacity,
  shiftSize,
  iteratives,
  loadFor,
  reducedSpeed,
  xpForNextLevel,
  type Capacity,
  type Load,
} from './tables';

export interface AbilityDerived {
  score: number;
  mod: number;
  /** Score including temporary adjustments, macros and conditions. */
  tempScore: number;
  tempMod: number;
  hasTemp: boolean;
  breakdown: Total;
}

export interface SkillDerived {
  def: SkillDef;
  label: string;
  total: number;
  classSkill: boolean;
  /** Trained-only skill with no ranks. */
  unusable: boolean;
  breakdown: Total;
}

export interface WeaponDerived {
  attacks: number[];
  /** Damage dice adjusted for size changes (Enlarge Person...). */
  damageDice: string;
  damageBonus: number;
  attackBreakdown: Total;
  damageBreakdown: Total;
  /** Active extra damage with rollable dice, e.g. { notation: '1d6', type: 'fire' }; `macro` names a macro that adds it. */
  extraDamage: { notation: string; type: string; macro?: string }[];
}

export interface WeightDerived {
  weapons: number;
  armor: number;
  items: number;
  coins: number;
  total: number;
}

export interface SpellcastingDerived {
  casterLevel: number;
  abilityMod: number;
  concentration: number;
  concentrationBreakdown: Total;
  dcs: number[];
  /** Total slots per level (null = cannot cast that level). */
  slots: (number | null)[];
  /** Base slots from the class table or manual entry. */
  base: (number | null)[];
  known: (number | null)[];
  bonus: number[];
  /** Extra domain slot per level (0 or 1), kept apart from `slots`. */
  domain: number[];
  /** Times prepared, excluding domain spells. */
  prepared: number[];
  domainPrepared: number[];
  spellPen: number;
  spellPenBreakdown: Total;
}

export interface WealthDerived {
  weapons: number;
  armor: number;
  items: number;
  coins: number;
  total: number;
}

export interface FcbSummary {
  hp: number;
  skill: number;
  /** Named "other" bonuses with their summed amounts. */
  other: { label: string; amount: string; value: number }[];
}

export interface Derived {
  /** Class levels plus prestige levels advancing each class's spellcasting. */
  castingLevels: Record<string, number>;
  level: number;
  classLevels: Record<string, number>;
  xpNext: number | null;
  /** Classes taken on both sides of a gestalt character (not allowed). */
  gestaltConflicts: string[];
  abilities: Record<Ability, AbilityDerived>;
  /** Ability modifiers used everywhere else (temp-inclusive). */
  mods: Record<Ability, number>;
  bab: number;
  attack: { melee: Total; ranged: Total };
  cmb: Total;
  cmd: Total;
  cmdFlatFooted: number;
  init: Total;
  saves: Record<Save, Total>;
  ac: { normal: Total; touch: Total; flatFooted: Total };
  maxDex: number | null;
  acp: number;
  spellFailure: number;
  speed: { base: number; encumbered: boolean };
  hp: { max: Total; current: number; perLevel: number[] };
  skills: Record<string, SkillDerived>;
  skillRanks: { spent: number; available: number };
  classSkills: Set<string>;
  weapons: Record<string, WeaponDerived>;
  weight: WeightDerived;
  wealth: WealthDerived;
  fcb: FcbSummary;
  /** Level-up ability increases: one every four levels vs the +1s entered. */
  abilityIncreases: { expected: number; used: number };
  mythic: { tier: number; effectiveTier: number; paragon: boolean; powerMax: number; surgeDie: string; hp: number } | null;
  capacity: Capacity;
  /** Size after size-changing effects, and the steps applied. */
  effectiveSize: Size;
  sizeSteps: number;
  load: Load;
  spellcasting: Record<string, SpellcastingDerived>;
  resources: Record<string, number>;
  /** Max uses per use-counter id. */
  uses: Record<string, number>;
  vars: Vars;
  /** Macro effects whose formula failed, by effect id. */
  macroErrors: Record<string, true>;
  conditionNotes: string[];
}

export const slug = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const SAVE_ABILITY: Record<Save, Ability> = { fort: 'con', ref: 'dex', will: 'wis' };

/** CMD counts these AC bonus types (plus penalties), but not armor/shield/natural/size. */
const CMD_AC_TYPES = new Set([
  'circumstance',
  'deflection',
  'dodge',
  'insight',
  'luck',
  'morale',
  'profane',
  'sacred',
]);

const base = (key: string, value: number, source: string): Bonus => ({
  key,
  value,
  type: 'untyped',
  source,
});

const sumTotal = (parts: Bonus[]): Total => stack(parts);

export function skillLabel(def: SkillDef, entry: SkillEntry): string {
  return def.multi ? `${def.name}${entry.subtype ? ` (${entry.subtype})` : ''}` : def.name;
}

function isEncumberingArmor(category: string) {
  return /medium|heavy/i.test(category);
}

export function derive(c: Character): Derived {
  // --- Levels and classes -------------------------------------------------
  const classById = new Map<string, ClassDef>(c.classes.map((k) => [k.id, k]));
  const classLevels: Record<string, number> = Object.fromEntries(c.classes.map((k) => [k.id, 0]));
  // Gestalt levels advance two classes; otherwise this is just the level's class.
  const levelClasses = c.levels.map((l) => levelClassIds(c, l));
  for (const ids of levelClasses) for (const id of ids) if (id in classLevels) classLevels[id]++;
  // Caster levels: class levels plus prestige levels that advance that class's spellcasting.
  const castingLevels: Record<string, number> = { ...classLevels };
  c.levels.forEach((l, i) => {
    for (const id of l.spellAdvance ?? []) if (id in castingLevels && !levelClasses[i].includes(id)) castingLevels[id]++;
  });
  const level = c.levels.length;
  const progression = classProgression(c, classById);
  const bab = progression.bab;
  const favored = new Set(c.favoredClassIds);
  const favoredLevels = c.levels.filter((_, i) => levelClasses[i].some((id) => favored.has(id)));
  const fcbHp = favoredLevels.filter((l) => l.fcb.kind === 'hp').length;
  const fcbSkill = favoredLevels.filter((l) => l.fcb.kind === 'skill').length;

  // --- Bonus collection ---------------------------------------------------
  const set = new BonusSet();
  for (const a of ABILITIES) {
    const s = c.abilities[a];
    set.add(
      { key: `ability.${a}`, value: s.racial, type: 'racial', source: 'Racial' },
      { key: `ability.${a}`, value: s.level, type: 'untyped', source: 'Level' },
      { key: `ability.${a}`, value: s.enhancement, type: 'enhancement', source: 'Enhancement' },
      { key: `ability.${a}`, value: s.inherent, type: 'inherent', source: 'Inherent' },
      { key: `ability.${a}`, value: s.misc, type: 'untyped', source: 'Misc' },
      { key: `ability.${a}`, value: s.temp, type: 'untyped', source: 'Temporary', temp: true },
    );
  }
  set.add(...c.bonuses.map((b) => ({ ...b, source: b.source || 'Misc' })));
  // Feats that scale with level are applied by name (fixed ones are bonus rows, see rules/featBonuses).
  if (hasFeat(c.feats, 'Toughness')) set.add({ key: 'hp.max', value: Math.max(3, level), type: 'untyped', source: 'Toughness' });

  const mythicOn = c.mythic.enabled && c.mythic.tier > 0;
  const tier = mythicOn ? Math.min(10, c.mythic.tier) : 0;
  // Mythic Paragon raises the tier for potency only (not power, surge or access).
  const effectiveTier = mythicOn ? tier + (c.mythic.paragon ? 2 : 0) : 0;
  const mythicHp = mythicOn && c.mythic.path ? PATH_HP[c.mythic.path] * tier : 0;
  if (mythicOn) {
    ABILITY_INCREASE_TIERS.forEach((t, i) => {
      const a = c.mythic.abilityIncreases[i];
      if (a && tier >= t) set.add({ key: `ability.${a}`, value: 2, type: 'untyped', source: `Mythic tier ${t}` });
    });
    set.add(
      { key: 'hp.max', value: mythicHp, type: 'untyped', source: 'Mythic path' },
      { key: 'init', value: tier >= 2 ? effectiveTier : 0, type: 'untyped', source: 'Amazing Initiative' },
    );
  }

  const equipped = c.armor.filter((a) => a.equipped);
  for (const a of equipped) {
    set.add({
      key: 'ac',
      value: a.acBonus + a.enhancement,
      type: a.kind === 'shield' ? 'shield' : 'armor',
      source: a.name || (a.kind === 'shield' ? 'Shield' : 'Armor'),
    });
  }
  set.add({ key: 'ac', value: c.naturalArmor, type: 'natural', source: 'Natural armor' });

  let loseDex = false;
  const conditionNotes: string[] = [];
  for (const label of c.conditions) {
    const def = findCondition(label);
    if (!def) continue;
    loseDex ||= !!def.loseDex;
    conditionNotes.push(`${def.name}: ${def.summary}`);
    set.add(
      ...def.effects.map((e) => ({
        key: e.key,
        value: e.value,
        type: e.type ?? ('untyped' as const),
        source: def.name,
        temp: true,
      })),
    );
  }

  // --- Abilities (pre-macro, so macro formulas can reference them) --------
  const scoreOf = (a: Ability, withTemp: boolean): Total => {
    const parts = set.list([`ability.${a}`], (b) => withTemp || !b.temp);
    return sumTotal([base(`ability.${a}`, c.abilities[a].base, 'Base'), ...parts]);
  };

  const classVars: Vars = {};
  for (const k of c.classes) {
    const name = slug(k.name);
    if (name) {
      classVars[`class.${name}.level`] = classLevels[k.id];
      classVars[`class.${name}.casterlevel`] = castingLevels[k.id];
    }
  }
  const makeVars = (): Vars => {
    const v: Vars = { level, bab, hd: level, ...classVars };
    for (const a of ABILITIES) {
      const score = scoreOf(a, true).total;
      v[a] = score;
      v[`${a}.mod`] = abilityMod(score);
    }
    return v;
  };

  // --- Macros -------------------------------------------------------------
  const preVars = makeVars();
  const macroErrors: Record<string, true> = {};
  const macroDice: { notation: string; type: string; macro: string; applies: 'all' | 'melee' | 'ranged' }[] = [];
  for (const m of c.macros) {
    if (!m.active) continue;
    for (const x of m.damageDice) {
      const count = Math.trunc(tryEvaluate(x.count, preVars, NaN));
      if (Number.isNaN(count)) macroErrors[x.id] = true;
      else if (count > 0 && x.sides >= 2) macroDice.push({ notation: `${count}d${x.sides}`, type: x.type.trim(), macro: m.name, applies: x.applies });
    }
    for (const e of m.effects) {
      const value = tryEvaluate(e.value, preVars, NaN);
      if (Number.isNaN(value)) {
        macroErrors[e.id] = true;
        continue;
      }
      set.add({ key: e.key, value: Math.trunc(value), type: e.type, source: m.name, temp: true });
    }
  }

  // --- Size (after macros, so Enlarge Person and the like shift it) -------
  const sizeSteps = set.total(['size.steps']).total;
  const effectiveSize = shiftSize(c.info.size, sizeSteps);
  const size = SIZE_MODS[effectiveSize];
  const sizeSource = sizeSteps ? `Size (${effectiveSize})` : 'Size';
  set.add(
    { key: 'ac', value: size.ac, type: 'size', source: sizeSource },
    { key: 'attack', value: size.ac, type: 'size', source: sizeSource },
    { key: 'cmb', value: size.cm, type: 'size', source: sizeSource },
    { key: 'cmd', value: size.cm, type: 'size', source: sizeSource },
    { key: 'skill.fly', value: size.fly, type: 'size', source: sizeSource },
    { key: 'skill.stealth', value: size.stealth, type: 'size', source: sizeSource },
  );

  const abilities = {} as Record<Ability, AbilityDerived>;
  const mods = {} as Record<Ability, number>;
  for (const a of ABILITIES) {
    const perm = scoreOf(a, false);
    const temp = scoreOf(a, true);
    abilities[a] = {
      score: perm.total,
      mod: abilityMod(perm.total),
      tempScore: temp.total,
      tempMod: abilityMod(temp.total),
      hasTemp: temp.total !== perm.total,
      breakdown: temp,
    };
    mods[a] = abilityMod(temp.total);
  }
  const vars = makeVars();

  // --- Favored class bonuses ----------------------------------------------
  const otherFcb = new Map<string, ReturnType<typeof parseFraction>>();
  for (const l of favoredLevels) {
    if (l.fcb.kind !== 'other' || !l.fcb.label.trim()) continue;
    const label = l.fcb.label.trim();
    otherFcb.set(label, addFractions(otherFcb.get(label) ?? { n: 0, d: 1 }, parseFraction(l.fcb.amount || '1')));
  }
  const fcb: FcbSummary = {
    hp: fcbHp,
    skill: fcbSkill,
    other: [...otherFcb].map(([label, f]) => ({ label, amount: formatFraction(f), value: Math.floor(f.n / f.d) })),
  };

  // --- Encumbrance --------------------------------------------------------
  const carried = carriedItems(c.items);
  const weight: WeightDerived = {
    weapons: c.weapons.reduce((s, w) => s + w.weight, 0),
    armor: c.armor.reduce((s, a) => s + a.weight, 0),
    items: carried.reduce((s, i) => s + i.weight * i.quantity, 0),
    coins: coinWeight(c),
    total: 0,
  };
  weight.total = round2(
    weight.weapons + weight.armor + weight.items + weight.coins,
  );
  const coinsGp = (k: { pp: number; gp: number; sp: number; cp: number }) =>
    k.pp * 10 + k.gp + k.sp / 10 + k.cp / 100;
  const wealth: WealthDerived = {
    weapons: c.weapons.reduce((s, w) => s + w.price, 0),
    armor: c.armor.reduce((s, a) => s + a.price, 0),
    items: c.items.reduce((s, i) => s + i.price * i.quantity, 0),
    coins: coinsGp(c.currency.carried) + c.currency.locations.reduce((s, l) => s + coinsGp(l.coins), 0),
    total: 0,
  };
  wealth.total = round2(wealth.weapons + wealth.armor + wealth.items + wealth.coins);
  // Capacity multipliers (Ant Haul ×3) don't stack: the highest applies.
  const capacityMult = Math.max(1, ...set.list(['capacity.mult']).map((b) => b.value));
  const capacity = scaleCapacity(carryingCapacity(abilities.str.tempScore, effectiveSize), capacityMult);
  const load = loadFor(weight.total, capacity);
  const loadPen = LOAD_PENALTIES[load];

  const armorMaxDex = equipped
    .map((a) => a.maxDex)
    .filter((d): d is number => d !== null && Number.isFinite(d));
  if (loadPen.maxDex !== null) armorMaxDex.push(loadPen.maxDex);
  const maxDex = armorMaxDex.length ? Math.min(...armorMaxDex) : null;
  const armorAcp = equipped.reduce((s, a) => s - Math.abs(a.checkPenalty), 0);
  const acp = Math.min(armorAcp, loadPen.acp);
  const spellFailure = equipped.reduce((s, a) => s + a.spellFailure, 0);

  const encumbered =
    load !== 'light' || equipped.some((a) => a.kind === 'armor' && isEncumberingArmor(a.category));
  const speedBase = c.speeds.base + set.total(['speed']).total;
  const speed = {
    base: encumbered ? c.speeds.armored || reducedSpeed(speedBase) : speedBase,
    encumbered,
  };

  // --- Defense ------------------------------------------------------------
  const dexToAc = maxDex === null ? mods.dex : Math.min(mods.dex, maxDex);
  const dexPart = base('ac', loseDex ? Math.min(dexToAc, 0) : dexToAc, 'Dex');
  const acBonuses = set.list(['ac']).filter((b) => !(loseDex && b.type === 'dodge' && b.value > 0));
  const touchTypes = new Set(['armor', 'shield', 'natural']);
  const ac = {
    normal: sumTotal([base('ac', 10, 'Base'), dexPart, ...acBonuses]),
    touch: sumTotal([
      base('ac', 10, 'Base'),
      dexPart,
      ...acBonuses.filter((b) => !touchTypes.has(b.type)),
    ]),
    flatFooted: sumTotal([
      base('ac', 10, 'Base'),
      base('ac', Math.min(dexPart.value, 0), 'Dex'),
      ...acBonuses.filter((b) => !(b.type === 'dodge' && b.value > 0)),
    ]),
  };

  const saves = {} as Record<Save, Total>;
  for (const s of ['fort', 'ref', 'will'] as Save[]) {
    const classBase = progression.saves[s];
    saves[s] = sumTotal([
      base(`save.${s}`, classBase, 'Class'),
      base(`save.${s}`, mods[SAVE_ABILITY[s]], SAVE_ABILITY[s].toUpperCase()),
      ...set.list(['save', `save.${s}`]),
    ]);
  }

  // --- Offense ------------------------------------------------------------
  const babPart = base('attack', bab, 'BAB');
  const attack = {
    melee: sumTotal([babPart, base('attack', mods.str, 'STR'), ...set.list(['attack', 'attack.melee'])]),
    ranged: sumTotal([
      babPart,
      base('attack', mods.dex, 'DEX'),
      ...set.list(['attack', 'attack.ranged']),
    ]),
  };
  const smallSize = ['fine', 'diminutive', 'tiny'].includes(effectiveSize);
  const cmbAbility: Ability = smallSize ? 'dex' : 'str';
  const cmb = sumTotal([
    base('cmb', bab, 'BAB'),
    base('cmb', mods[cmbAbility], cmbAbility.toUpperCase()),
    ...set.list(['cmb']),
  ]);
  const cmdAcParts = acBonuses.filter((b) => b.value < 0 || CMD_AC_TYPES.has(b.type));
  const cmd = sumTotal([
    base('cmd', 10, 'Base'),
    base('cmd', bab, 'BAB'),
    base('cmd', mods.str, 'STR'),
    base('cmd', loseDex ? Math.min(mods.dex, 0) : mods.dex, 'DEX'),
    ...set.list(['cmd']),
    ...cmdAcParts.filter((b) => b.type !== 'size'),
  ]);
  const cmdFlatFooted =
    cmd.total -
    Math.max(loseDex ? 0 : mods.dex, 0) -
    cmd.parts.filter((p) => p.applied && p.type === 'dodge' && p.value > 0).reduce((s, p) => s + p.value, 0);

  const init = sumTotal([base('init', mods.dex, 'DEX'), ...set.list(['init'])]);

  const weapons: Record<string, WeaponDerived> = {};
  for (const w of c.weapons) {
    const keys = ['attack', `attack.${w.kind}`];
    const attackBreakdown = sumTotal([
      babPart,
      base('attack', mods[w.attackAbility], w.attackAbility.toUpperCase()),
      { key: 'attack', value: w.enhancement, type: 'enhancement', source: 'Enhancement' },
      base('attack', w.attackMisc, 'Misc'),
      ...set.list(keys),
    ]);
    const offset = attackBreakdown.total - bab;
    const dmgMod = w.damageAbility === 'none' ? 0 : Math.floor(mods[w.damageAbility] * w.damageMultiplier);
    const damageBreakdown = sumTotal([
      base('damage', dmgMod, w.damageAbility === 'none' ? 'No ability' : `${w.damageAbility.toUpperCase()}${w.damageMultiplier !== 1 ? ` (×${w.damageMultiplier})` : ''}`),
      { key: 'damage', value: w.enhancement, type: 'enhancement', source: 'Enhancement' },
      base('damage', w.damageMisc, 'Misc'),
      ...set.list(['damage', `damage.${w.kind}`]),
    ]);
    const damageBonus = damageBreakdown.total;
    weapons[w.id] = {
      attacks: iteratives(bab).map((b) => b + offset),
      damageDice: scaleDice(w.damage, sizeSteps),
      damageBonus,
      attackBreakdown,
      damageBreakdown,
      extraDamage: [
        ...w.extraDamage.flatMap((x) => {
          const n = x.active ? parseNotation(x.dice) : null;
          return n ? [{ notation: formatNotation(n), type: x.type.trim() }] : [];
        }),
        ...macroDice.filter((x) => x.applies === 'all' || x.applies === w.kind).map(({ notation, type, macro }) => ({ notation, type, macro })),
      ],
    };
  }

  // --- HP -----------------------------------------------------------------
  // Gestalt levels use the larger hit die and skill ranks of their two classes.
  const best = (i: number, pick: (k: ClassDef) => number) =>
    Math.max(0, ...levelClasses[i].map((id) => classById.get(id)).filter((k): k is ClassDef => !!k).map(pick));
  const perLevel = c.levels.map((l, i) => {
    const hd = best(i, (k) => k.hd);
    const roll = i === 0 && c.maxHpFirstLevel ? hd : l.hpRoll;
    return Math.max(1, roll + mods.con);
  });
  const hpMax = sumTotal([
    base('hp.max', perLevel.reduce((s, n) => s + n, 0), 'Hit dice + CON'),
    base('hp.max', fcbHp, 'Favored class'),
    ...set.list(['hp.max']),
  ]);
  const hp = {
    max: hpMax,
    current: hpMax.total + c.hp.temp - c.hp.damage,
    perLevel,
  };

  // --- Skills -------------------------------------------------------------
  const classSkills = new Set(c.classes.flatMap((k) => k.classSkills));
  const skills: Record<string, SkillDerived> = {};
  let spent = 0;
  for (const e of c.skills) {
    const def = SKILL_BY_KEY[e.skill];
    if (!def) continue;
    spent += e.ranks;
    const cs = e.classSkill ?? isClassSkill(classSkills, e.skill, e.subtype);
    const keys = ['skills', `skill.${e.skill}`];
    if (e.subtype) keys.push(`skill.${e.skill}.${subtypeKey(e.subtype)}`);
    const breakdown = sumTotal([
      base('skill', e.ranks, 'Ranks'),
      base('skill', mods[def.ability], def.ability.toUpperCase()),
      base('skill', cs && e.ranks > 0 ? 3 : 0, 'Class skill'),
      base('skill', def.acp ? acp : 0, 'Armor check'),
      base('skill', e.misc, 'Misc'),
      ...set.list(keys),
    ]);
    skills[e.id] = {
      def,
      label: skillLabel(def, e),
      total: breakdown.total,
      classSkill: cs,
      unusable: def.trainedOnly && e.ranks <= 0,
      breakdown,
    };
  }
  const intMod = abilities.int.mod;
  const available =
    c.levels.reduce((s, _, i) => s + Math.max(1, best(i, (k) => k.skillRanks) + intMod), 0) +
    fcbSkill;

  // --- Spellcasting -------------------------------------------------------
  const spellcasting: Record<string, SpellcastingDerived> = {};
  for (const b of c.spellcasting) {
    const mod = mods[b.ability];
    const classLevel = b.classId ? (castingLevels[b.classId] ?? 0) : 0;
    const casterLevel = (b.classId ? classLevel : b.casterLevel) + b.casterLevelMisc + set.total(['cl']).total;
    // Spell tables are read by class level, or by caster level for blocks without a class.
    const tableLevel = b.classId ? classLevel : casterLevel;
    const dcBonus = set.total(['spell.dc']).total;
    const table = SPELL_TABLE_BY_ID[b.table];
    const tableRow = (rows: (number | null)[][] | undefined) =>
      rows && tableLevel > 0 ? rows[Math.min(tableLevel, 20) - 1] : undefined;
    // Manual blocks (no table): a level becomes castable once it has base or misc slots.
    const baseSlots = table
      ? (tableRow(table.perDay) ?? Array(10).fill(null))
      : b.slots.map((s, lvl) => (s === null && (b.slotsMisc[lvl] ?? 0) > 0 ? 0 : s));
    const known = (table ? tableRow(table.known) : undefined) ?? b.known;
    const misc = b.slotsMisc;
    const bonus = baseSlots.map((s, lvl) => (s === null ? 0 : bonusSpells(mod, lvl)));
    const domain = baseSlots.map((s, lvl) => (b.domainSlot && lvl > 0 && s !== null ? 1 : 0));
    const preparedAt = (lvl: number, isDomain: boolean) =>
      b.spells.filter((sp) => sp.level === lvl && !!sp.domain === isDomain).reduce((s, sp) => s + sp.prepared, 0);
    const concentrationBreakdown = sumTotal([
      base('concentration', casterLevel, 'Caster level'),
      base('concentration', mod, b.ability.toUpperCase()),
      base('concentration', b.concentrationMisc, 'Misc'),
      ...set.list(['concentration']),
    ]);
    const spellPenBreakdown = sumTotal([base('spell.pen', casterLevel, 'Caster level'), base('spell.pen', b.spellPenMisc, 'Misc'), ...set.list(['spell.pen'])]);
    spellcasting[b.id] = {
      casterLevel,
      abilityMod: mod,
      concentration: concentrationBreakdown.total,
      concentrationBreakdown,
      dcs: baseSlots.map((_, lvl) => 10 + lvl + mod + dcBonus),
      slots: baseSlots.map((s, lvl) => (s === null ? null : s + bonus[lvl] + (misc[lvl] ?? 0))),
      base: baseSlots,
      known,
      bonus,
      domain,
      prepared: baseSlots.map((_, lvl) => preparedAt(lvl, false)),
      domainPrepared: baseSlots.map((_, lvl) => preparedAt(lvl, true)),
      spellPen: spellPenBreakdown.total,
      spellPenBreakdown,
    };
  }
  const firstCl = Object.values(spellcasting)[0]?.casterLevel;
  if (firstCl !== undefined) vars.cl = firstCl;

  // --- Formula-driven maxima ------------------------------------------------
  const resources: Record<string, number> = {};
  for (const r of c.resources) resources[r.id] = Math.floor(tryEvaluate(r.maxExpr, vars, r.max));
  const uses: Record<string, number> = {};
  for (const a of c.specialAbilities)
    for (const u of a.uses) uses[u.id] = Math.floor(tryEvaluate(u.maxExpr, vars, u.max));

  return {
    level,
    classLevels,
    castingLevels,
    xpNext: xpForNextLevel(c.xp.track, level),
    gestaltConflicts: gestaltConflicts(c),
    abilities,
    mods,
    bab,
    attack,
    cmb,
    cmd,
    cmdFlatFooted,
    init,
    saves,
    ac,
    maxDex,
    acp,
    spellFailure,
    speed,
    hp,
    skills,
    skillRanks: { spent, available },
    classSkills,
    weapons,
    weight,
    wealth,
    fcb,
    abilityIncreases: { expected: Math.floor(level / 4), used: ABILITIES.reduce((s, a) => s + c.abilities[a].level, 0) },
    mythic: mythicOn
      ? { tier, effectiveTier, paragon: c.mythic.paragon, powerMax: mythicPowerMax(tier), surgeDie: surgeDie(tier, c.mythic.surgeUpgrades), hp: mythicHp }
      : null,
    capacity,
    effectiveSize,
    sizeSteps,
    load,
    spellcasting,
    resources,
    uses,
    vars,
    macroErrors,
    conditionNotes,
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Items whose weight counts: not inside a weightless or uncarried container. */
export function carriedItems(items: Item[]): Item[] {
  const byId = new Map(items.map((i) => [i.id, i]));
  const counts = (item: Item): boolean => {
    if (item.notCarried) return false;
    const seen = new Set<string>([item.id]);
    let parent = item.containerId ? byId.get(item.containerId) : undefined;
    while (parent && !seen.has(parent.id)) {
      if (parent.weightless || parent.notCarried) return false;
      seen.add(parent.id);
      parent = parent.containerId ? byId.get(parent.containerId) : undefined;
    }
    return true;
  };
  return items.filter(counts);
}

function coinWeight(c: Character): number {
  const count = (k: { pp: number; gp: number; sp: number; cp: number }) =>
    k.pp + k.gp + k.sp + k.cp;
  const coins =
    count(c.currency.carried) +
    c.currency.locations.filter((l) => !l.weightless).reduce((s, l) => s + count(l.coins), 0);
  return round2(coins / COINS_PER_LB);
}
