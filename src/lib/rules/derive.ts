import {
  ABILITIES,
  SAVES,
  type Ability,
  type Character,
  type ClassDef,
  type Item,
  type Save,
  type SkillEntry,
  type Size,
} from '../model/types';
import { slug } from '../slug';
import { hasFeat } from './featBonuses';
import { pointBuy } from './pointBuy';
import { gestaltConflicts, levelClassIds, classProgression } from './gestalt';
import { BonusSet, bonus, stack, type Total } from './bonuses';
import { findCondition } from './conditions';
import { tryEvaluate, type Vars } from './expr';
import { abilityMod, round2 } from './math';
import { SKILL_BY_KEY, isClassSkill, subtypeKey, type SkillDef } from './skills';
import { SPELL_TABLE_BY_ID } from './spellTables';
import { scaleDice } from './dice';
import { formatNotation, parseNotation } from '../dice/notation';
import { ABILITY_INCREASE_TIERS, PATH_HP, mythicPowerMax, surgeDie } from './mythic';
import { addFractions, formatFraction, parseFraction } from './fraction';
import {
  COINS_PER_LB,
  LOAD_PENALTIES,
  SAVE_ABILITY,
  SIZE_MODS,
  bonusSpells,
  carryingCapacity,
  coinCount,
  coinsToGp,
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
  /** Dice rolled along with the check while a macro is active (Inspiration +1d6). */
  extraDice: RollExtra[];
}

/** Dice (or a flat amount) a macro adds to a roll; `label` names the macro. */
export interface RollExtra {
  label: string;
  notation: string;
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
  /** Macro dice rolled along with each attack roll. */
  attackDice: RollExtra[];
}

/** Per-category sums for carried weight (lb) or owned value (gp). */
export interface GearTotals {
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
  /** Macro dice rolled with melee / ranged attack rolls. */
  attackDice: { melee: RollExtra[]; ranged: RollExtra[] };
  cmb: Total;
  cmd: Total;
  cmdFlatFooted: number;
  init: Total;
  saves: Record<Save, Total>;
  /** Macro dice rolled along with each saving throw. */
  saveDice: Record<Save, RollExtra[]>;
  /** Class base saves before ability modifiers and bonuses (familiars borrow these). */
  baseSaves: Record<Save, number>;
  ac: { normal: Total; touch: Total; flatFooted: Total };
  /** Natural armor: base plus bonuses to it (amulet of natural armor), stacked on their own. */
  naturalArmor: Total;
  /** Miss chance (%): the highest of the base value and `concealment` bonuses; they don't stack. */
  concealment: { total: number; sources: { source: string; value: number }[] };
  maxDex: number | null;
  acp: number;
  spellFailure: number;
  /** `reduced` is the calculated encumbered speed; `reason` says what slows you ('' when nothing does). */
  speed: { base: number; encumbered: boolean; reduced: number; reason: string };
  hp: { max: Total; current: number; perLevel: number[] };
  skills: Record<string, SkillDerived>;
  skillRanks: { spent: number; available: number };
  classSkills: Set<string>;
  weapons: Record<string, WeaponDerived>;
  weight: GearTotals;
  wealth: GearTotals;
  fcb: FcbSummary;
  /** Level-up ability increases: one every four levels vs the +1s entered. */
  abilityIncreases: { expected: number; used: number };
  /** Points spent on the base scores under the point-buy rule, and what's left of the budget. */
  pointBuy: { spent: number; remaining: number; costs: Record<Ability, number> };
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
  /** Macro effects and dice whose formula failed, by id. */
  macroErrors: Record<string, true>;
  conditionNotes: string[];
}

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
  // Armor, shield and natural armor each total their own bonuses first (an
  // enhancement to armor doesn't compete with one to natural armor); see Defense.
  for (const a of equipped) {
    const key = a.kind === 'shield' ? 'ac.shield' : 'ac.armor';
    const name = a.name || (a.kind === 'shield' ? 'Shield' : 'Armor');
    set.add(
      { key, value: a.acBonus, type: a.kind === 'shield' ? 'shield' : 'armor', source: name },
      { key, value: a.enhancement, type: 'enhancement', source: `${name} enhancement` },
    );
  }
  for (const a of equipped) {
    if (a.nonProficient && a.checkPenalty) {
      set.add({ key: 'attack', value: -Math.abs(a.checkPenalty), type: 'untyped', source: `${a.name || 'Armor'} (not proficient)` });
    }
  }
  set.add({ key: 'ac.natural', value: c.naturalArmor, type: 'natural', source: 'Natural armor' });

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
    return stack([bonus(`ability.${a}`, c.abilities[a].base, 'Base'), ...parts]);
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
    const v: Vars = { level, bab, hd: level, cl: 0, ...classVars };
    for (const a of ABILITIES) {
      const score = scoreOf(a, true).total;
      v[a] = score;
      v[`${a}.mod`] = abilityMod(score);
    }
    return v;
  };

  // --- Macros -------------------------------------------------------------
  const preVars = makeVars();
  // Caster level for macro formulas (Tears to Wine): the first spellcasting block, before CL bonuses.
  const firstBlock = c.spellcasting[0];
  if (firstBlock) preVars.cl = (firstBlock.classId ? (castingLevels[firstBlock.classId] ?? 0) : firstBlock.casterLevel) + firstBlock.casterLevelMisc;
  const macroErrors: Record<string, true> = {};
  const activeMacros = c.macros.filter((m) => m.active);
  // Pass 1: each macro's dice count as @macro.<slug>.dice (0 while off), so a
  // macro can build on another's dice (+1 damage per sneak attack die).
  const macroVars: Vars = {};
  for (const m of c.macros) {
    const id = macroSlug(m);
    if (id) macroVars[`macro.${id}.dice`] = 0;
  }
  for (const m of activeMacros) {
    const id = macroSlug(m);
    if (!id) continue;
    for (const x of m.damageDice) macroVars[`macro.${id}.dice`] += Math.max(0, Math.trunc(tryEvaluate(x.count, { ...preVars, ...macroVars }, 0)));
  }
  Object.assign(preVars, macroVars);
  // Pass 2: dice with those vars, then effects.
  const macroDice: (RollExtra & { type: string; applies: string })[] = [];
  for (const m of activeMacros) {
    for (const x of m.damageDice) {
      const count = Math.trunc(tryEvaluate(x.count, preVars, NaN));
      const flat = x.bonus.trim() ? Math.trunc(tryEvaluate(x.bonus, preVars, NaN)) : 0;
      if (Number.isNaN(count) || Number.isNaN(flat)) {
        macroErrors[x.id] = true;
        continue;
      }
      const dice = count > 0 && x.sides >= 2 ? [{ count, sides: x.sides, sign: 1 as const }] : [];
      if (!dice.length && !flat) continue;
      macroDice.push({ notation: formatNotation({ dice, modifier: flat }), type: x.type.trim(), label: m.name, applies: x.applies });
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
  /** Macro dice whose target is one of `targets`, for a roll's extras. */
  const diceFor = (targets: string[]): RollExtra[] =>
    macroDice.filter((x) => targets.includes(x.applies)).map(({ label, notation }) => ({ label, notation }));

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
  const vars = { ...makeVars(), ...macroVars };

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
  const weight: GearTotals = {
    weapons: c.weapons.reduce((s, w) => s + w.weight, 0),
    armor: c.armor.reduce((s, a) => s + a.weight, 0),
    items: carried.reduce((s, i) => s + i.weight * i.quantity, 0),
    coins: coinWeight(c),
    total: 0,
  };
  weight.total = round2(
    weight.weapons + weight.armor + weight.items + weight.coins,
  );
  const wealth: GearTotals = {
    weapons: c.weapons.reduce((s, w) => s + w.price, 0),
    armor: c.armor.reduce((s, a) => s + a.price, 0),
    items: c.items.reduce((s, i) => s + i.price * i.quantity, 0),
    coins: coinsToGp(c.currency.carried) + c.currency.locations.reduce((s, l) => s + coinsToGp(l.coins), 0),
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

  const heavyArmor = equipped.filter((a) => a.kind === 'armor' && isEncumberingArmor(a.category));
  const encumbered = load !== 'light' || heavyArmor.length > 0;
  const speedBonus = set.total(['speed']).total;
  const speedBase = c.speeds.base + speedBonus;
  const reduced = reducedSpeed(speedBase);
  const speed = {
    base: encumbered ? (c.speeds.armored ? c.speeds.armored + speedBonus : reduced) : speedBase,
    encumbered,
    reduced,
    reason: [...heavyArmor.map((a) => `${a.name || 'Armor'} (${a.category.trim()})`), ...(load !== 'light' ? [`${load} load`] : [])].join(', '),
  };

  // --- Defense ------------------------------------------------------------
  const dexToAc = maxDex === null ? mods.dex : Math.min(mods.dex, maxDex);
  const dexPart = bonus('ac', loseDex ? Math.min(dexToAc, 0) : dexToAc, 'Dex');
  const naturalArmor = set.total(['ac.natural']);
  // Each sub-total enters AC as one bonus of its type, so touch AC still drops it
  // and it still competes with other bonuses of that type (mage armor vs armor).
  const subtotal = (key: string, type: 'armor' | 'shield' | 'natural', label: string) => {
    const t = key === 'ac.natural' ? naturalArmor : set.total([key]);
    const named = t.parts.filter((p) => p.applied);
    const source = named.length === 1 ? named[0].source : `${label} (${named.map((p) => fmtSigned(p.value)).join(' ')})`;
    return t.total ? [{ key: 'ac', value: t.total, type, source }] : [];
  };
  const acBonuses = [
    ...subtotal('ac.armor', 'armor', 'Armor'),
    ...subtotal('ac.shield', 'shield', 'Shield'),
    ...subtotal('ac.natural', 'natural', 'Natural armor'),
    ...set.list(['ac']),
  ].filter((b) => !(loseDex && b.type === 'dodge' && b.value > 0));
  const touchTypes = new Set(['armor', 'shield', 'natural']);
  const ten = bonus('ac', 10, 'Base');
  const ac = {
    normal: stack([ten, dexPart, ...acBonuses]),
    touch: stack([ten, dexPart, ...acBonuses.filter((b) => !touchTypes.has(b.type))]),
    flatFooted: stack([ten, bonus('ac', Math.min(dexPart.value, 0), 'Dex'), ...acBonuses.filter((b) => !(b.type === 'dodge' && b.value > 0))]),
  };

  const concealmentSources = [
    { source: 'Base', value: c.concealment },
    ...set.list(['concealment']).map((b) => ({ source: b.source, value: b.value })),
  ].filter((x) => x.value > 0);
  const concealment = { total: Math.min(100, Math.max(0, ...concealmentSources.map((x) => x.value))), sources: concealmentSources };

  const saves = {} as Record<Save, Total>;
  const saveDice = {} as Record<Save, RollExtra[]>;
  for (const s of SAVES) {
    saveDice[s] = diceFor(['save', `save.${s}`]);
    const classBase = progression.saves[s];
    saves[s] = stack([
      bonus(`save.${s}`, classBase, 'Class'),
      bonus(`save.${s}`, mods[SAVE_ABILITY[s]], SAVE_ABILITY[s].toUpperCase()),
      ...set.list(['save', `save.${s}`]),
    ]);
  }

  // --- Offense ------------------------------------------------------------
  const babPart = bonus('attack', bab, 'BAB');
  const attack = {
    melee: stack([babPart, bonus('attack', mods.str, 'STR'), ...set.list(['attack', 'attack.melee'])]),
    ranged: stack([
      babPart,
      bonus('attack', mods.dex, 'DEX'),
      ...set.list(['attack', 'attack.ranged']),
    ]),
  };
  const smallSize = ['fine', 'diminutive', 'tiny'].includes(effectiveSize);
  const cmbAbility: Ability = smallSize ? 'dex' : 'str';
  const cmb = stack([
    bonus('cmb', bab, 'BAB'),
    bonus('cmb', mods[cmbAbility], cmbAbility.toUpperCase()),
    ...set.list(['cmb']),
  ]);
  const cmdAcParts = acBonuses.filter((b) => b.value < 0 || CMD_AC_TYPES.has(b.type));
  const cmd = stack([
    bonus('cmd', 10, 'Base'),
    bonus('cmd', bab, 'BAB'),
    bonus('cmd', mods.str, 'STR'),
    bonus('cmd', loseDex ? Math.min(mods.dex, 0) : mods.dex, 'DEX'),
    ...set.list(['cmd']),
    ...cmdAcParts.filter((b) => b.type !== 'size'),
  ]);
  const cmdFlatFooted =
    cmd.total -
    Math.max(loseDex ? 0 : mods.dex, 0) -
    cmd.parts.filter((p) => p.applied && p.type === 'dodge' && p.value > 0).reduce((s, p) => s + p.value, 0);

  const init = stack([bonus('init', mods.dex, 'DEX'), ...set.list(['init'])]);

  const weapons: Record<string, WeaponDerived> = {};
  for (const w of c.weapons) {
    const keys = ['attack', `attack.${w.kind}`];
    const attackBreakdown = stack([
      babPart,
      bonus('attack', mods[w.attackAbility], w.attackAbility.toUpperCase()),
      { key: 'attack', value: w.enhancement, type: 'enhancement', source: 'Enhancement' },
      bonus('attack', w.attackMisc, 'Misc'),
      bonus('attack', w.nonProficient ? -4 : 0, 'Not proficient'),
      ...set.list(keys),
    ]);
    const offset = attackBreakdown.total - bab;
    const dmgMod = w.damageAbility === 'none' ? 0 : Math.floor(mods[w.damageAbility] * w.damageMultiplier);
    const damageBreakdown = stack([
      bonus('damage', dmgMod, w.damageAbility === 'none' ? 'No ability' : `${w.damageAbility.toUpperCase()}${w.damageMultiplier !== 1 ? ` (×${w.damageMultiplier})` : ''}`),
      { key: 'damage', value: w.enhancement, type: 'enhancement', source: 'Enhancement' },
      bonus('damage', w.damageMisc, 'Misc'),
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
        ...macroDice
          .filter((x) => x.applies === 'all' || x.applies === w.kind || x.applies === `weapon:${w.id}`)
          .map(({ notation, type, label }) => ({ notation, type, macro: label })),
      ],
      attackDice: diceFor(['attack', `attack.${w.kind}`]),
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
  const hpMax = stack([
    bonus('hp.max', perLevel.reduce((s, n) => s + n, 0), 'Hit dice + CON'),
    bonus('hp.max', fcbHp, 'Favored class'),
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
    const keys = ['skills', `skills.${def.ability}`, `skill.${e.skill}`];
    if (e.subtype) keys.push(`skill.${e.skill}.${subtypeKey(e.subtype)}`);
    const breakdown = stack([
      bonus('skill', e.ranks, 'Ranks'),
      bonus('skill', mods[def.ability], def.ability.toUpperCase()),
      bonus('skill', cs && e.ranks > 0 ? 3 : 0, 'Class skill'),
      bonus('skill', def.acp ? acp : 0, 'Armor check'),
      bonus('skill', e.misc, 'Misc'),
      ...set.list(keys),
    ]);
    skills[e.id] = {
      def,
      label: skillLabel(def, e),
      total: breakdown.total,
      classSkill: cs,
      unusable: def.trainedOnly && e.ranks <= 0,
      breakdown,
      extraDice: diceFor(keys),
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
    const bonusSlots = baseSlots.map((s, lvl) => (s === null ? 0 : bonusSpells(mod, lvl)));
    const domain = baseSlots.map((s, lvl) => (b.domainSlot && lvl > 0 && s !== null ? 1 : 0));
    const preparedAt = (lvl: number, isDomain: boolean) =>
      b.spells.filter((sp) => sp.level === lvl && !!sp.domain === isDomain).reduce((s, sp) => s + sp.prepared, 0);
    const concentrationBreakdown = stack([
      bonus('concentration', casterLevel, 'Caster level'),
      bonus('concentration', mod, b.ability.toUpperCase()),
      bonus('concentration', b.concentrationMisc, 'Misc'),
      ...set.list(['concentration']),
    ]);
    const spellPenBreakdown = stack([bonus('spell.pen', casterLevel, 'Caster level'), bonus('spell.pen', b.spellPenMisc, 'Misc'), ...set.list(['spell.pen'])]);
    spellcasting[b.id] = {
      casterLevel,
      abilityMod: mod,
      concentration: concentrationBreakdown.total,
      concentrationBreakdown,
      dcs: baseSlots.map((_, lvl) => 10 + lvl + mod + dcBonus),
      slots: baseSlots.map((s, lvl) => (s === null ? null : s + bonusSlots[lvl] + (misc[lvl] ?? 0))),
      base: baseSlots,
      known,
      bonus: bonusSlots,
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
    attackDice: { melee: diceFor(['attack', 'attack.melee']), ranged: diceFor(['attack', 'attack.ranged']) },
    cmb,
    cmd,
    cmdFlatFooted,
    init,
    saves,
    saveDice,
    baseSaves: progression.saves,
    ac,
    naturalArmor,
    concealment,
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
    pointBuy: pointBuy(c),
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

/** Name formulas use for a macro's dice: its library id, else its name as a slug. */
export const macroSlug = (m: { libraryId?: string; name: string }) => m.libraryId || slug(m.name);

const fmtSigned = (n: number) => (n < 0 ? `${n}` : `+${n}`);

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
  const coins = coinCount(c.currency.carried) + c.currency.locations.filter((l) => !l.weightless).reduce((s, l) => s + coinCount(l.coins), 0);
  return round2(coins / COINS_PER_LB);
}
