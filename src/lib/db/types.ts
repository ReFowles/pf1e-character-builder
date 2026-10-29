// Shapes of the bundled rules data in public/data/*.json (built by
// scripts/import-data). Entries are copied into a character when picked;
// characters never reference the database at runtime.

export interface DbSpell {
  name: string;
  school: string;
  /** Spell level per class key, e.g. { wizard: 3, sorcerer: 3 }. */
  levels: Record<string, number>;
  components: string;
  castingTime: string;
  range: string;
  target: string;
  duration: string;
  save: string;
  sr: string;
  summary: string;
  description: string;
  source: string;
}

export interface DbFeat {
  name: string;
  tags: string[];
  summary: string;
  description: string;
  source: string;
}

export interface DbWeapon {
  damage: string;
  crit: string;
  range: string;
  type: string;
  /** light, 1h, 2h, ranged. */
  handedness: string;
  proficiency: string;
}

export interface DbArmor {
  kind: 'armor' | 'shield';
  ac: number;
  maxDex: number | null;
  acp: number;
  asf: number;
  category: string;
}

export interface DbItem {
  name: string;
  /** gear, magic, weapon, ammo, armor, shield, consumable… */
  category: string;
  slot: string;
  weight: number;
  price: string;
  summary: string;
  description: string;
  source: string;
  weapon?: DbWeapon;
  armor?: DbArmor;
}

export interface DbClass {
  /** Slug of the name: lowercase, non-alphanumerics → '-'. */
  id: string;
  name: string;
  kind: 'base' | 'unchained' | 'prestige';
  hd: number;
  /** Foundry high/med/low. */
  bab: 'full' | '3/4' | '1/2';
  goodSaves: ('fort' | 'ref' | 'will')[];
  /** Skill ranks per level (before Int). */
  skillRanks: number;
  /** App skill keys from src/lib/rules/skills.ts, plus "knowledge:arcana" style subtypes. */
  classSkills: string[];
  castingAbility?: 'int' | 'wis' | 'cha';
  /** From Foundry's system.casting when the class casts spells. */
  casting?: { type: string; progression: string; spells: string };
  summary: string;
  source: string;
}

export interface DbCompanion {
  name: string;
  kind: 'animal' | 'familiar';
  /** tiny/small/medium/large…, lowercase. */
  size: string;
  /** e.g. "40 ft, fly 60 ft (good)". */
  speed: string;
  naturalArmor: number;
  abilities: { str: number; dex: number; con: number; int: number; wis: number; cha: number };
  attacks: { name: string; damage: string; secondary?: boolean }[];
  senses: string;
  /** Special qualities and attacks. */
  special: string[];
  /** Plain text of the 4th/7th-level advancement paragraph(s); '' for familiars. */
  advancement: string;
  source: string;
}

export interface DbEvolution {
  name: string;
  /** Evolution points. */
  cost: number;
  summary: string;
  description: string;
  source: string;
}

export interface DbData {
  spells: DbSpell[];
  feats: DbFeat[];
  items: DbItem[];
  classes: DbClass[];
  companions: DbCompanion[];
  evolutions: DbEvolution[];
}
