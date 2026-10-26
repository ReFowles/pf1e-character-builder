import { SCHEMA_VERSION, make, newCharacter } from './defaults';
import { migrate } from './migrate';
import type { Character } from './types';

type Plain = Record<string, unknown>;

const isPlain = (v: unknown): v is Plain =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

// Item factories for array collections, keyed by path. Imported rows are
// merged over a fresh item so missing fields get defaults.
const ITEM_FACTORIES: Record<string, () => unknown> = {
  classes: make.classDef,
  levels: () => make.level(),
  skills: () => make.skill(),
  bonuses: make.bonus,
  weapons: make.weapon,
  armor: () => make.armor(),
  resistances: make.resistance,
  resources: make.resource,
  specialAbilities: make.specialAbility,
  'specialAbilities.uses': make.useCounter,
  macros: make.macro,
  'macros.effects': make.macroEffect,
  traits: () => make.trait(),
  feats: () => make.feat(),
  classAbilities: () => make.classAbility(),
  items: make.item,
  'currency.locations': make.coinLocation,
  spellcasting: make.spellcasting,
  'speeds.other': () => make.otherSpeed(),
  'mythic.feats': () => make.mythicEntry(),
  'mythic.pathAbilities': () => make.mythicEntry(),
  'mythic.spells': () => make.mythicEntry(),
  'spellcasting.spells': () => make.spell(),
  companions: () => make.companion(),
  'companions.attacks': make.companionAttack,
  'companions.skills': () => make.companionSkill(),
};

function merge(def: unknown, val: unknown, path: string): unknown {
  if (val === undefined) return def;
  if (isPlain(def)) {
    if (!isPlain(val)) return def;
    const out: Plain = {};
    // Keep unknown keys too, so open-ended maps (ui.sections) survive.
    for (const k of new Set([...Object.keys(def), ...Object.keys(val)])) {
      out[k] = merge(def[k], val[k], path ? `${path}.${k}` : k);
    }
    return out;
  }
  if (Array.isArray(def)) {
    if (!Array.isArray(val)) return def;
    const factory = ITEM_FACTORIES[path];
    return factory ? val.map((v) => merge(factory(), v, path)) : val;
  }
  if (def === null || def === undefined) return val;
  // Primitive: keep the incoming value only if it has the same type.
  return typeof val === typeof def ? val : def;
}

/** Bring any stored or imported data up to the current Character shape. */
export function normalize(raw: unknown): Character {
  const data = migrate(isPlain(raw) ? raw : {});
  const merged = merge(newCharacter(), data, '') as Character;
  merged.schemaVersion = SCHEMA_VERSION;
  return merged;
}
