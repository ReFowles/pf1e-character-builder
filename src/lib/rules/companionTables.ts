// Progression tables for companions that scale with their master's class
// level: animal companions (CRB), eidolons (APG and Unchained), phantoms
// (Occult Adventures) and drakes (Legacy of Dragons). Index = level − 1.
import type { Ability, Save, Size } from '../model/types';

export interface CompanionTable {
  id: 'animal' | 'eidolon' | 'eidolonUnchained' | 'phantom' | 'drake';
  hd: number[];
  feats: number[];
  /** Armor bonus column (eidolon and phantom): natural armor, or deflection for an incorporeal phantom. */
  armor: number[];
  /** Added to both Str and Dex (animal, eidolon) … */
  strDex: number[];
  /** … or to Dex and Cha (phantom). */
  dexCha: number[];
  /** Natural armor column (animal companions only; drakes are computed). */
  natural: number[];
  pool: number[];
  maxAttacks: number[];
  tricks: number[];
  /** Skill ranks per hit die; null = creature-type ranks + Int. */
  skillsPerHd: number | null;
  /** BAB equals hit dice (outsiders and dragons) instead of the creature type's rate. */
  babIsHd: boolean;
  /** Levels granting a +1 ability score increase (one pick each). */
  increaseLevels: number[];
  /** Levels where a drake grows one size (+4 Str, −2 Dex, +2 Con). */
  sizeStepLevels: number[];
  special: [number, string][];
}

const Z = Array(20).fill(0) as number[];
const HD = [1, 2, 3, 3, 4, 5, 6, 6, 7, 8, 9, 9, 10, 11, 12, 12, 13, 14, 15, 15];
const FEATS = [1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 5, 5, 5, 6, 6, 6, 7, 7, 8, 8];
const ARMOR = [0, 2, 2, 2, 4, 4, 6, 6, 6, 8, 8, 10, 10, 10, 12, 12, 14, 14, 14, 16];
const STR_DEX = [0, 1, 1, 1, 2, 2, 3, 3, 3, 4, 4, 5, 5, 5, 6, 6, 7, 7, 7, 8];
const MAX_ATTACKS = [3, 3, 3, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 7, 7];

export const ANIMAL_TABLE: CompanionTable = {
  id: 'animal',
  hd: [2, 3, 3, 4, 5, 6, 6, 7, 8, 9, 9, 10, 11, 12, 12, 13, 14, 15, 15, 16],
  feats: FEATS,
  armor: Z,
  strDex: [0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6],
  dexCha: Z,
  natural: [0, 0, 2, 2, 2, 4, 4, 4, 6, 6, 6, 8, 8, 8, 10, 10, 10, 12, 12, 12],
  pool: Z,
  maxAttacks: Z,
  tricks: [1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6, 7, 7, 7],
  skillsPerHd: null,
  babIsHd: false,
  increaseLevels: [4, 9, 14],
  sizeStepLevels: [],
  special: [
    [1, 'Link'],
    [1, 'Share spells'],
    [3, 'Evasion'],
    [6, 'Devotion (+4 morale vs enchantment)'],
    [9, 'Multiattack'],
    [15, 'Improved evasion'],
  ],
};

const EIDOLON_SPECIAL: [number, string][] = [
  [1, 'Darkvision 60 ft'],
  [1, 'Link'],
  [1, 'Share spells'],
  [2, 'Evasion'],
  [5, 'Devotion (+4 morale vs enchantment)'],
  [7, 'Multiattack'],
  [11, 'Improved evasion'],
];

export const EIDOLON_TABLE: CompanionTable = {
  id: 'eidolon',
  hd: HD,
  feats: FEATS,
  armor: ARMOR,
  strDex: STR_DEX,
  dexCha: Z,
  natural: Z,
  pool: [3, 4, 5, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17, 19, 20, 21, 22, 23, 25, 26],
  maxAttacks: MAX_ATTACKS,
  tricks: Z,
  skillsPerHd: 4,
  babIsHd: true,
  increaseLevels: [],
  sizeStepLevels: [],
  special: EIDOLON_SPECIAL,
};

export const EIDOLON_UNCHAINED_TABLE: CompanionTable = {
  ...EIDOLON_TABLE,
  id: 'eidolonUnchained',
  pool: [1, 2, 3, 3, 4, 5, 6, 6, 7, 8, 9, 9, 10, 11, 12, 12, 13, 14, 15, 15],
};

export const PHANTOM_TABLE: CompanionTable = {
  id: 'phantom',
  hd: HD,
  feats: FEATS,
  armor: ARMOR,
  strDex: Z,
  dexCha: [0, 1, 1, 1, 2, 2, 2, 3, 3, 4, 4, 5, 5, 5, 6, 6, 7, 7, 7, 8],
  natural: Z,
  pool: Z,
  maxAttacks: Z,
  tricks: Z,
  skillsPerHd: 2,
  babIsHd: true,
  increaseLevels: [5, 10, 15],
  sizeStepLevels: [],
  special: [
    [1, 'Darkvision 60 ft'],
    [1, 'Link'],
    [1, 'Share spells'],
    [3, 'Deliver touch spells (30 ft)'],
    [4, 'Magic attacks'],
    [6, 'Devotion (+4 morale vs enchantment)'],
    [9, 'Incorporeal flight 40 ft'],
    [12, 'Deliver touch spells (50 ft)'],
  ],
};

export const DRAKE_TABLE: CompanionTable = {
  id: 'drake',
  hd: HD,
  feats: FEATS,
  armor: Z,
  strDex: Z,
  dexCha: Z,
  natural: Z, // computed: +2 at 3rd and every three levels, +2 per size step
  pool: Z,
  maxAttacks: Z,
  tricks: Z,
  skillsPerHd: 3,
  babIsHd: true,
  increaseLevels: [5, 10, 15, 20],
  sizeStepLevels: [5, 9, 13, 17],
  special: [
    [1, 'Darkvision 60 ft'],
    [1, 'Low-light vision'],
    [1, 'Immunities (paralysis, sleep, subtype energy)'],
  ],
};

export const DRAKE_POWER_LEVELS = [3, 7, 11, 15, 19];
export const DRAKE_SUBTYPES = ['aether', 'air', 'cold', 'earth', 'fire', 'water'];
export const DRAKE_POWERS = [
  'Aether Bite',
  'Blindsense',
  'Breath Weapon',
  'Breath Weapon, Improved',
  'Breath Weapon, Greater',
  'Burrow',
  'Burrow, Improved',
  'Energy Bite',
  'Flight',
  'Flight, Improved',
  'Flight, Greater',
  'Glide',
  'Intellect',
  'Keen Mind',
  'Magic Attacks',
  'Mount',
  'Mount, Improved',
  'Scent',
  'Swim',
  'Swim, Improved',
];

/** Phantom slam damage by spiritualist level, Medium (one step lower when Small). */
export const PHANTOM_SLAM: [number, string, string][] = [
  [1, '1d6', '1d4'],
  [5, '1d8', '1d6'],
  [9, '1d10', '1d8'],
  [13, '2d6', '1d10'],
  [17, '2d8', '2d6'],
];

export interface PhantomFocus {
  goodSaves: Save[];
  skills: string[];
  /** Permanent score changes, e.g. Anger's +2 Str −2 Dex. */
  abilities?: Partial<Record<Ability, number>>;
}

export const PHANTOM_FOCI: Record<string, PhantomFocus> = {
  Anger: { goodSaves: ['fort', 'will'], skills: ['Intimidate', 'Survival'], abilities: { str: 2, dex: -2 } },
  Dedication: { goodSaves: ['ref', 'will'], skills: ['Diplomacy', 'Sense Motive'] },
  Despair: { goodSaves: ['fort', 'will'], skills: ['Intimidate', 'Stealth'] },
  Desperation: { goodSaves: ['ref', 'will'], skills: ['Acrobatics', 'Escape Artist'] },
  Fear: { goodSaves: ['ref', 'will'], skills: ['Intimidate', 'Stealth'] },
  Greed: { goodSaves: ['fort', 'ref'], skills: ['Appraise', 'Sleight of Hand'] },
  Hatred: { goodSaves: ['fort', 'ref'], skills: ['Acrobatics', 'Perception'] },
  Jealousy: { goodSaves: ['ref', 'will'], skills: ['Appraise', 'Bluff'] },
  Kindness: { goodSaves: ['fort', 'will'], skills: ['Diplomacy', 'Heal'] },
  Lust: { goodSaves: ['fort', 'will'], skills: ['Bluff', 'Diplomacy'], abilities: { con: 2, dex: -2 } },
  Pride: { goodSaves: ['ref', 'will'], skills: ['Intimidate', 'Perception'] },
  Remorse: { goodSaves: ['fort', 'will'], skills: ['Perception', 'Sense Motive'] },
  Suffering: { goodSaves: ['fort', 'will'], skills: ['Climb', 'Heal'] },
  Whimsey: { goodSaves: ['ref', 'will'], skills: ['Acrobatics', 'Perception'] },
  Zeal: { goodSaves: ['fort', 'ref'], skills: ['Acrobatics', 'Survival'] },
};

export interface EidolonBaseForm {
  size: Size;
  speed: string;
  natural: number;
  goodSaves: Save[];
  attacks: { name: string; damage: string }[];
  abilities: Record<Ability, number>;
  freeEvolutions: string[];
}

const scores = (str: number, dex: number, con: number, int: number, wis: number, cha: number) => ({ str, dex, con, int, wis, cha });

export const EIDOLON_BASE_FORMS: Record<string, EidolonBaseForm> = {
  biped: {
    size: 'medium',
    speed: '30 ft',
    natural: 2,
    goodSaves: ['fort', 'will'],
    attacks: [{ name: '2 claws', damage: '1d4' }],
    abilities: scores(16, 12, 13, 7, 10, 11),
    freeEvolutions: ['Claws', 'Limbs (arms)', 'Limbs (legs)'],
  },
  quadruped: {
    size: 'medium',
    speed: '40 ft',
    natural: 2,
    goodSaves: ['fort', 'ref'],
    attacks: [{ name: 'Bite', damage: '1d6' }],
    abilities: scores(14, 14, 13, 7, 10, 11),
    freeEvolutions: ['Bite', 'Limbs (legs)', 'Limbs (legs)'],
  },
  serpentine: {
    size: 'medium',
    speed: '20 ft, climb 20 ft',
    natural: 2,
    goodSaves: ['ref', 'will'],
    attacks: [
      { name: 'Bite', damage: '1d6' },
      { name: 'Tail slap', damage: '1d6' },
    ],
    abilities: scores(12, 16, 13, 7, 10, 11),
    freeEvolutions: ['Bite', 'Climb', 'Reach (bite)', 'Tail', 'Tail slap'],
  },
  aquatic: {
    size: 'medium',
    speed: '20 ft, swim 40 ft',
    natural: 4,
    goodSaves: ['fort', 'ref'],
    attacks: [{ name: 'Bite', damage: '1d6' }],
    abilities: scores(16, 12, 13, 7, 10, 11),
    freeEvolutions: ['Bite', 'Improved natural armor', 'Gills', 'Swim', 'Swim'],
  },
  avian: {
    size: 'small',
    speed: '30 ft, fly 30 ft',
    natural: 2,
    goodSaves: ['ref', 'will'],
    attacks: [{ name: '2 claws', damage: '1d3' }],
    abilities: scores(12, 16, 13, 7, 10, 11),
    freeEvolutions: ['Claws', 'Flight', 'Limbs (legs)'],
  },
  tauric: {
    size: 'small',
    speed: '40 ft',
    natural: 2,
    goodSaves: ['fort', 'will'],
    attacks: [{ name: '2 claws', damage: '1d4' }],
    abilities: scores(14, 14, 13, 7, 10, 11),
    freeEvolutions: ['Claws', 'Limbs (arms)', 'Limbs (legs)', 'Limbs (legs)'],
  },
};

/** Unchained eidolon subtypes (Pathfinder Unchained); others can be typed in. */
export const EIDOLON_SUBTYPES = ['Agathion', 'Angel', 'Archon', 'Azata', 'Daemon', 'Demon', 'Devil', 'Div', 'Elemental', 'Inevitable', 'Protean', 'Psychopomp'];

/** Labels a companion of a given kind often carries (shown after the kind in its title). */
export const COMPANION_LABELS: Record<string, string[]> = {
  animal: ['Mount', 'Divine bond', 'Fiendish servant', 'Plant companion', 'Vermin companion', 'Monstrous companion', "Hunter's bond"],
  familiar: ['Spirit animal', 'Improved familiar', 'Tumor familiar', 'Bonded'],
  eidolon: [],
  phantom: [],
  drake: [],
  other: ['Cohort', 'Follower', 'Pet'],
};
