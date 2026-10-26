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

export type XpTrack = 'slow' | 'medium' | 'fast';
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
}

export type FcbKind = 'hp' | 'skill' | 'other';

/** One entry per character level, in the order they were taken. */
export interface LevelEntry extends Identified {
  classId: string;
  hpRoll: number;
  /** 'other' FCBs are named bonuses with a fractional amount, e.g. 1/3 channel damage. */
  fcb: { kind: FcbKind; label: string; amount: string };
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
  crit: string;
  range: string;
  type: string;
  weight: number;
  /** Value in gp. */
  price: number;
  ammo: string;
  notes: string;
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

export interface Resistance extends Identified {
  name: string;
  value: string;
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
  notes: string;
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
  favoredClassId: string | null;
  levels: LevelEntry[];
  /** Max HP at first level instead of the roll. */
  maxHpFirstLevel: boolean;
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
  mythic: Mythic;
  ui: {
    sections: Record<string, SectionUi>;
  };
}
