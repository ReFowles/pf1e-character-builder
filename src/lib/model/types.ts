// Character data holds inputs only. Everything displayed as a computed
// number comes from `derive()` in src/lib/rules.

export const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;
export type Ability = (typeof ABILITIES)[number];

export const SIZES = [
  'fine',
  'diminutive',
  'tiny',
  'small',
  'medium',
  'large',
  'huge',
  'gargantuan',
  'colossal',
] as const;
export type Size = (typeof SIZES)[number];

/** 'milestone' levels up by GM decision, so no experience is tracked. */
export type XpTrack = 'slow' | 'medium' | 'fast' | 'milestone';
export type BabProgression = 'full' | '3/4' | '1/2';
export type Save = 'fort' | 'ref' | 'will';

/** PF1 bonus types. Same-typed bonuses don't stack (highest wins), except the
 * ones listed in STACKING_TYPES in rules/bonuses.ts. */
export const BONUS_TYPES = [
  'untyped',
  'alchemical',
  'armor',
  'circumstance',
  'competence',
  'deflection',
  'dodge',
  'enhancement',
  'inherent',
  'insight',
  'luck',
  'morale',
  'natural',
  'profane',
  'racial',
  'resistance',
  'sacred',
  'shield',
  'size',
  'trait',
] as const;
export type BonusType = (typeof BONUS_TYPES)[number];

export interface Identified {
  id: string;
}

export interface AbilityScore {
  base: number;
  racial: number;
  /** Permanent +1s gained at 4th, 8th, 12th, 16th and 20th level. */
  level: number;
  enhancement: number;
  inherent: number;
  misc: number;
  /** Temporary adjustments (e.g. ability damage/drain, rage). */
  temp: number;
}

export interface ClassDef extends Identified {
  name: string;
  presetId?: string;
  hd: number;
  bab: BabProgression;
  goodSaves: Save[];
  skillRanks: number;
  classSkills: string[];
  /** Ability used for spellcasting, if any. */
  castingAbility?: Ability;
  /** Prestige classes can't be favored without the Favored Prestige Class feat. */
  prestige: boolean;
  spellType?: 'arcane' | 'divine' | 'psychic';
  /** Prestige levels (1–10) that grant "+1 level of existing spellcasting class". */
  castingAdvance?: { which: 'arcane' | 'divine' | 'psychic' | 'any' | 'both'; levels: number[] };
}

export type FcbKind = 'hp' | 'skill' | 'other';

/** One entry per character level, in the order they were taken. */
export interface LevelEntry extends Identified {
  classId: string;
  hpRoll: number;
  /** 'other' FCBs are named bonuses with a fractional amount, e.g. 1/3 channel damage. */
  fcb: { kind: FcbKind; label: string; amount: string };
  /** Ids of casting classes this (prestige) level advances by one caster level. */
  spellAdvance: string[];
  /** Second class taken at this level under the gestalt rule ('' = none); ignored while the rule is off. */
  gestaltClassId: string;
}

/** A manual modifier entered by the user against a stat key. */
export interface ManualBonus extends Identified {
  key: string;
  value: number;
  type: BonusType;
  source: string;
}

export interface SkillEntry extends Identified {
  /** Key from the skill catalog, e.g. 'acrobatics', 'craft', 'knowledge'. */
  skill: string;
  /** Subtype label for Craft/Perform/Profession/Knowledge rows. */
  subtype?: string;
  ranks: number;
  /** Overrides the class-skill flag derived from classes when set. */
  classSkill?: boolean;
  favorite: boolean;
  misc: number;
}

export interface OtherSpeed extends Identified {
  /** fly, swim, climb, burrow, or anything else. */
  mode: string;
  value: number;
  /** Fly maneuverability (clumsy…perfect). */
  maneuverability: string;
}

export interface Speeds {
  base: number;
  /** Override for speed in medium/heavy armor or load; 0 = calculate. */
  armored: number;
  other: OtherSpeed[];
}

export interface Weapon extends Identified {
  name: string;
  attackAbility: Ability;
  damageAbility: Ability | 'none';
  /** Multiplier for damage ability mod: 0.5 off-hand, 1, 1.5 two-handed. */
  damageMultiplier: number;
  kind: 'melee' | 'ranged';
  enhancement: number;
  attackMisc: number;
  damageMisc: number;
  damage: string;
  /** Threat range: 20 for a natural 20 only; 19 for 19–20, and so on. */
  critRange: number;
  /** Multiplier text, e.g. ×2. */
  crit: string;
  range: string;
  type: string;
  weight: number;
  /** Value in gp. */
  price: number;
  ammo: string;
  notes: string;
  extraDamage: ExtraDamage[];
}

/** Dice rolled along with a weapon's damage (Flaming 1d6 fire, sneak attack 3d6 precision). Never multiplied on a critical. */
export interface ExtraDamage extends Identified {
  /** Dice with an optional modifier, e.g. 1d6 or 2d6+1. */
  dice: string;
  /** Damage type or source, e.g. fire, precision. */
  type: string;
  /** Rows that are off aren't added (sneak attack only applies when the target is denied Dex or flanked). */
  active: boolean;
}

export interface ArmorPiece extends Identified {
  name: string;
  kind: 'armor' | 'shield';
  equipped: boolean;
  acBonus: number;
  enhancement: number;
  maxDex: number | null;
  checkPenalty: number;
  spellFailure: number;
  /** Light/medium/heavy for armor, or shield type. */
  category: string;
  weight: number;
  price: number;
  notes: string;
}

/** One chip, e.g. "fire 10" or "poison" for an immunity. */
export interface Resistance extends Identified {
  name: string;
}

export interface Resource extends Identified {
  name: string;
  max: number;
  /** Optional formula for max, e.g. `max(1, @wis.mod)`; overrides `max`. */
  maxExpr: string;
  current: number;
  notes: string;
}

export type UsePeriod = 'round' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year' | 'other';

export interface UseCounter extends Identified {
  max: number;
  maxExpr: string;
  per: UsePeriod;
  used: number;
}

export interface SpecialAbility extends Identified {
  name: string;
  source: string;
  uses: UseCounter[];
  notes: string;
}

export interface MacroEffect extends Identified {
  key: string;
  /** Number or expression, e.g. `-1 - floor(@bab/4)`. */
  value: string;
  type: BonusType;
}

export type MacroCategory = 'feat' | 'spell' | 'item' | 'condition' | 'class' | 'custom';

export interface Macro extends Identified {
  name: string;
  category: MacroCategory;
  libraryId?: string;
  active: boolean;
  effects: MacroEffect[];
  /** Damage dice added to matching weapons' damage rolls while active (sneak attack). */
  damageDice: MacroDice[];
  notes: string;
}

export interface MacroDice extends Identified {
  /** Number of dice: a number or formula, e.g. `ceil(@class.rogue.level / 2)`. */
  count: string;
  sides: number;
  /** Damage type, e.g. precision. */
  type: string;
  /** Which weapons roll these dice. */
  applies: 'all' | 'melee' | 'ranged';
}

export interface Trait extends Identified {
  name: string;
  kind: 'character' | 'racial' | 'drawback';
  category: string;
  description: string;
}

export interface Feat extends Identified {
  name: string;
  level: number;
  source: string;
  type: string;
  description: string;
}

export interface ClassAbility extends Identified {
  name: string;
  classId: string;
  level: number;
  description: string;
}

export interface Item extends Identified {
  name: string;
  quantity: number;
  /** Weight of one unit, in lb. */
  weight: number;
  /** Id of the container item this sits in, if any. */
  containerId: string | null;
  isContainer: boolean;
  /** Contents don't count toward carried weight (e.g. bag of holding). */
  weightless: boolean;
  /** Item (and contents) is not on the character (e.g. on a mount, at home). */
  notCarried: boolean;
  /** Value of one unit, in gp. */
  price: number;
  /** Worn/wielded; with a slot, it shows in Magic Items. */
  equipped: boolean;
  /** Magic item body slot ('' = not a slotted item). */
  slot: MagicSlot | '';
  /** Charges left (wands, staves); 0 = not charged. */
  charges: number;
  notes: string;
}

export const MAGIC_SLOTS = [
  'belt',
  'body',
  'chest',
  'eyes',
  'feet',
  'hands',
  'head',
  'headband',
  'neck',
  'ring',
  'shoulders',
  'wrist',
  'slotless',
] as const;
export type MagicSlot = (typeof MAGIC_SLOTS)[number];

export interface Coins {
  pp: number;
  gp: number;
  sp: number;
  cp: number;
}

export interface CoinLocation extends Identified {
  name: string;
  /** Coins here don't add to carried weight (stored, bag of holding, bank). */
  weightless: boolean;
  coins: Coins;
}

export interface SpellEntry extends Identified {
  name: string;
  level: number;
  school: string;
  duration: string;
  range: string;
  save: string;
  sr: string;
  /** Prepared in (or known for) the domain slot. */
  domain: boolean;
  /** Times prepared (prepared casters). */
  prepared: number;
  used: number;
  notes: string;
  /** Touch attack rolled with this spell (BAB + Str for melee, + Dex for ranged); 'none' for no attack roll. */
  attack: 'none' | 'melee' | 'ranged';
  attackMisc: number;
  /** Damage dice, e.g. "1d6"; empty for a spell that doesn't roll damage. */
  damage: string;
  /** Roll the dice once per caster level (fireball: 1d6 per level, max 10). */
  damageDicePerLevel: boolean;
  /** Flat damage added per caster level (cure light wounds: +1 per level, max 5). */
  damageBonusPerLevel: number;
  /** Caster levels that count for the per-level damage; 0 = no cap. */
  damageMax: number;
  damageBonus: number;
  damageType: string;
}

export interface Spellcasting extends Identified {
  /** Class this casting block belongs to (optional; free-form label fallback). */
  classId: string | null;
  label: string;
  kind: 'prepared' | 'spontaneous';
  ability: Ability;
  /** Spell table id (rules/spellTables.ts); '' = enter slots manually. */
  table: string;
  /** One extra domain spell slot per castable spell level 1+ (clerics). */
  domainSlot: boolean;
  /** Base caster level for blocks without a class ("Other"); class blocks use class level. */
  casterLevel: number;
  casterLevelMisc: number;
  concentrationMisc: number;
  spellPenMisc: number;
  /** Base slots per spell level 0..9 from the class table (null = cannot cast). */
  slots: (number | null)[];
  slotsMisc: number[];
  known: (number | null)[];
  /** Slots used today per spell level (spontaneous casters). */
  slotsUsed: number[];
  /** Class-specific details: domains, school, bloodline, patron, mystery... */
  details: { id: string; label: string; value: string }[];
  spells: SpellEntry[];
}

export const MYTHIC_PATHS = ['archmage', 'champion', 'guardian', 'hierophant', 'marshal', 'trickster'] as const;
export type MythicPath = (typeof MYTHIC_PATHS)[number];

export interface MythicEntry extends Identified {
  name: string;
  /** Tier gained (feats, path abilities) or spell level (spells). */
  tier: number;
  notes: string;
}

export interface Mythic {
  enabled: boolean;
  tier: number;
  path: MythicPath | '';
  /** Second path from the Dual Path feat. */
  secondPath: MythicPath | '';
  /** Mythic Paragon: tier counts 2 higher for the potency of mythic abilities, feats and spells. */
  paragon: boolean;
  /** Steps the surge die has been raised by feats or abilities. */
  surgeUpgrades: number;
  powerUsed: number;
  /** Ability raised by +2 at tiers 2, 4, 6, 8, 10. */
  abilityIncreases: (Ability | null)[];
  feats: MythicEntry[];
  pathAbilities: MythicEntry[];
  spells: MythicEntry[];
  notes: string;
}

export interface SectionUi {
  hidden: boolean;
  collapsed: boolean;
  printHidden: boolean;
}

export const COMPANION_KINDS = ['animal', 'familiar', 'eidolon', 'phantom', 'drake', 'other'] as const;
export const EIDOLON_BASE_FORMS = ['biped', 'quadruped', 'serpentine', 'aquatic', 'avian', 'tauric'] as const;
export type EidolonBaseForm = (typeof EIDOLON_BASE_FORMS)[number];

export interface EidolonEvolution extends Identified {
  name: string;
  cost: number;
  notes: string;
}
export type CompanionKind = (typeof COMPANION_KINDS)[number];
export const CREATURE_TYPES = ['animal', 'magicalBeast', 'outsider', 'dragon', 'vermin', 'other'] as const;
export type CreatureType = (typeof CREATURE_TYPES)[number];

export interface CompanionAttack extends Identified {
  name: string;
  /** Secondary natural attacks take −5 and add ½ Str to damage. */
  primary: boolean;
  /** Use Dex instead of Str to hit (Weapon Finesse). */
  finesse: boolean;
  damage: string;
  attackMisc: number;
  damageMisc: number;
  notes: string;
}

export interface CompanionSkill extends Identified {
  name: string;
  ability: Ability;
  ranks: number;
  classSkill: boolean;
  misc: number;
}

/** A familiar, animal companion, eidolon or other creature tied to the character. */
export interface Companion extends Identified {
  name: string;
  kind: CompanionKind;
  /** Shown after the kind in the title: "Mount", "Divine bond", "Plant companion"… */
  label: string;
  species: string;
  /** Small 3:4 JPEG data URL. */
  portrait: string | null;
  /** Class whose level drives the companion's progression. */
  masterClassId: string | null;
  /** Added to the master's class level (Boon Companion +4, ranger −3...). */
  levelMisc: number;
  creatureType: CreatureType;
  /** Good saves for the creature type (editable for outsiders etc.). */
  goodSaves: Save[];
  /** Hit dice override (0 = the progression table, or the master's level for other creatures). */
  hd: number;
  size: Size;
  speed: string;
  abilities: Record<Ability, { base: number; misc: number; temp: number }>;
  /** +1 ability score increases at the table's levels (animal 4/9/14, phantom 5/10/15, drake 5/10/15/20). */
  abilityIncreases: (Ability | null)[];
  eidolon: { unchained: boolean; baseForm: EidolonBaseForm | ''; subtype: string; evolutions: EidolonEvolution[]; poolMisc: number };
  phantom: { focus: string; form: 'ectoplasmic' | 'incorporeal' };
  drake: { subtype: string; powers: string[] };
  naturalArmor: number;
  armorBonus: number;
  acMisc: number;
  saveMisc: Record<Save, number>;
  hpMisc: number;
  hp: { damage: number; temp: number };
  attacks: CompanionAttack[];
  skills: CompanionSkill[];
  feats: string[];
  tricks: string[];
  special: string[];
  notes: string;
}

export interface Character {
  schemaVersion: number;
  id: string;
  info: {
    name: string;
    player: string;
    alignment: string;
    race: string;
    size: Size;
    deity: string;
    languages: string[];
    homeland: string;
  };
  bio: {
    age: string;
    gender: string;
    height: string;
    weight: string;
    build: string;
    skin: string;
    hair: string;
    eyes: string;
    likes: string;
    dislikes: string;
    fears: string;
    goals: string;
    backstory: string;
  };
  portrait: string | null;
  xp: { current: number; track: XpTrack };
  abilities: Record<Ability, AbilityScore>;
  classes: ClassDef[];
  /** Usually one; two for a half-elf (Multitalented) or with the Favored Prestige Class feat. */
  favoredClassIds: string[];
  levels: LevelEntry[];
  /** Max HP at first level instead of the roll. */
  maxHpFirstLevel: boolean;
  /** Gestalt rule: each level advances two classes, taking the better of each. */
  gestalt: boolean;
  hp: { damage: number; temp: number; nonlethal: number };
  conditions: string[];
  speeds: Speeds;
  heroPoints: number;
  skills: SkillEntry[];
  /** Favorite skill ids in display order. */
  favoriteOrder: string[];
  bonuses: ManualBonus[];
  weapons: Weapon[];
  armor: ArmorPiece[];
  naturalArmor: number;
  resistances: Resistance[];
  spellResistance: number;
  damageReduction: string;
  resources: Resource[];
  specialAbilities: SpecialAbility[];
  macros: Macro[];
  traits: Trait[];
  feats: Feat[];
  classAbilities: ClassAbility[];
  items: Item[];
  currency: { carried: Coins; locations: CoinLocation[] };
  spellcasting: Spellcasting[];
  /** Show the Spells tab. */
  spellsTab: boolean;
  /** Show the Companions tab. */
  companionTab: boolean;
  /** Critical hits: multiply the total of a normal roll, or roll the dice multiplied. */
  critMode: 'total' | 'dice';
  /** Campaign notes: HTML from the Notes tab's editor. */
  notes: { html: string };
  companions: Companion[];
  mythic: Mythic;
  ui: {
    sections: Record<string, SectionUi>;
  };
}
