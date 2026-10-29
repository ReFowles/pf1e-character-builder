// Feats whose whole effect is a fixed, always-on bonus. Picking one adds a row
// to the matching section's bonus list (c.bonuses), where it stays editable.
// Conditional feats (Power Attack, Deadly Aim…) stay macros.
import type { BonusType, ManualBonus } from '../model/types';

export interface FeatBonus {
  key: string;
  value: number;
  type: BonusType;
}

export const FEAT_BONUSES: Record<string, FeatBonus[]> = {
  'Improved Initiative': [{ key: 'init', value: 4, type: 'untyped' }],
  'Iron Will': [{ key: 'save.will', value: 2, type: 'untyped' }],
  'Great Fortitude': [{ key: 'save.fort', value: 2, type: 'untyped' }],
  'Lightning Reflexes': [{ key: 'save.ref', value: 2, type: 'untyped' }],
  Dodge: [{ key: 'ac', value: 1, type: 'dodge' }],
  // One weapon type: move the row to that weapon's attack misc when you carry several.
  'Weapon Focus': [{ key: 'attack', value: 1, type: 'untyped' }],
};

/** Feats derive() applies by name because they scale with level. */
export const SCALING_FEATS = ['Toughness'];

/** Canonical feat name for a typed name, ignoring case and a trailing "(choice)". */
export function featKey(name: string): string | undefined {
  const n = name.replace(/\s*\(.*\)\s*$/, '').trim().toLowerCase();
  return [...Object.keys(FEAT_BONUSES), ...SCALING_FEATS].find((k) => k.toLowerCase() === n);
}

/** Bonus rows a feat adds, with the feat as their source (empty for scaling feats). */
export function bonusRowsFor(name: string, uid: () => string): ManualBonus[] {
  const key = featKey(name);
  return key ? (FEAT_BONUSES[key] ?? []).map((b) => ({ id: uid(), ...b, source: key })) : [];
}

export const hasFeat = (feats: { name: string }[], key: string) => feats.some((f) => featKey(f.name) === key);

/** Old macro library ids that became feat bonuses (schema 7). */
export const RETIRED_MACRO_FEATS: Record<string, string> = {
  'improved-initiative': 'Improved Initiative',
  'iron-will': 'Iron Will',
  'great-fortitude': 'Great Fortitude',
  'lightning-reflexes': 'Lightning Reflexes',
  dodge: 'Dodge',
  'weapon-focus': 'Weapon Focus',
  toughness: 'Toughness',
};
