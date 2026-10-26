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

export interface DbData {
  spells: DbSpell[];
  feats: DbFeat[];
  items: DbItem[];
}
