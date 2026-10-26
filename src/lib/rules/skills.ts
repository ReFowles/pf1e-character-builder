import type { Ability } from '../model/types';

export interface SkillDef {
  key: string;
  name: string;
  ability: Ability;
  trainedOnly: boolean;
  /** Armor check penalty applies. */
  acp: boolean;
  /** Can have multiple rows with a subtype (Craft, Knowledge, ...). */
  multi: boolean;
}

const s = (
  key: string,
  name: string,
  ability: Ability,
  trainedOnly = false,
  acp = false,
  multi = false,
): SkillDef => ({ key, name, ability, trainedOnly, acp, multi });

export const SKILLS: SkillDef[] = [
  s('acrobatics', 'Acrobatics', 'dex', false, true),
  s('appraise', 'Appraise', 'int'),
  s('bluff', 'Bluff', 'cha'),
  s('climb', 'Climb', 'str', false, true),
  s('craft', 'Craft', 'int', false, false, true),
  s('diplomacy', 'Diplomacy', 'cha'),
  s('disableDevice', 'Disable Device', 'dex', true, true),
  s('disguise', 'Disguise', 'cha'),
  s('escapeArtist', 'Escape Artist', 'dex', false, true),
  s('fly', 'Fly', 'dex', false, true),
  s('handleAnimal', 'Handle Animal', 'cha', true),
  s('heal', 'Heal', 'wis'),
  s('intimidate', 'Intimidate', 'cha'),
  s('knowledge', 'Knowledge', 'int', true, false, true),
  s('linguistics', 'Linguistics', 'int', true),
  s('perception', 'Perception', 'wis'),
  s('perform', 'Perform', 'cha', false, false, true),
  s('profession', 'Profession', 'wis', true, false, true),
  s('ride', 'Ride', 'dex', false, true),
  s('senseMotive', 'Sense Motive', 'wis'),
  s('sleightOfHand', 'Sleight of Hand', 'dex', true, true),
  s('spellcraft', 'Spellcraft', 'int', true),
  s('stealth', 'Stealth', 'dex', false, true),
  s('survival', 'Survival', 'wis'),
  s('swim', 'Swim', 'str', false, true),
  s('useMagicDevice', 'Use Magic Device', 'cha', true),
];

export const SKILL_BY_KEY: Record<string, SkillDef> = Object.fromEntries(
  SKILLS.map((d) => [d.key, d]),
);

export const KNOWLEDGES = [
  'arcana',
  'dungeoneering',
  'engineering',
  'geography',
  'history',
  'local',
  'nature',
  'nobility',
  'planes',
  'religion',
];

/** Normalize a subtype into a key fragment: "Arcana" -> "arcana". */
export function subtypeKey(subtype: string | undefined): string {
  return (subtype ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

/**
 * Class skill lists hold either a skill key ("stealth", "knowledge" for all
 * knowledges) or "skill:subtype" ("knowledge:arcana").
 */
export function isClassSkill(classSkills: Iterable<string>, skill: string, subtype?: string) {
  const set = new Set(classSkills);
  return set.has(skill) || (!!subtype && set.has(`${skill}:${subtypeKey(subtype)}`));
}
