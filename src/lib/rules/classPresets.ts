import type { Ability, BabProgression, Save } from '../model/types';

export interface ClassPreset {
  id: string;
  name: string;
  hd: number;
  bab: BabProgression;
  goodSaves: Save[];
  skillRanks: number;
  /** Skill keys; "knowledge" = all knowledges, "knowledge:arcana" = one. */
  classSkills: string[];
  castingAbility?: Ability;
  source: string;
}

const k = (...subs: string[]) => subs.map((s) => `knowledge:${s}`);

const p = (
  id: string,
  name: string,
  hd: number,
  bab: BabProgression,
  goodSaves: Save[],
  skillRanks: number,
  classSkills: string[],
  source: string,
  castingAbility?: Ability,
): ClassPreset => ({ id, name, hd, bab, goodSaves, skillRanks, classSkills, source, castingAbility });

export const CLASS_PRESETS: ClassPreset[] = [
  // Core Rulebook
  p('barbarian', 'Barbarian', 12, 'full', ['fort'], 4,
    ['acrobatics', 'climb', 'craft', 'handleAnimal', 'intimidate', ...k('nature'), 'perception', 'ride', 'survival', 'swim'], 'CRB'),
  p('bard', 'Bard', 8, '3/4', ['ref', 'will'], 6,
    ['acrobatics', 'appraise', 'bluff', 'climb', 'craft', 'diplomacy', 'disguise', 'escapeArtist', 'intimidate', 'knowledge', 'linguistics', 'perception', 'perform', 'profession', 'senseMotive', 'sleightOfHand', 'spellcraft', 'stealth', 'useMagicDevice'], 'CRB', 'cha'),
  p('cleric', 'Cleric', 8, '3/4', ['fort', 'will'], 2,
    ['appraise', 'craft', 'diplomacy', 'heal', ...k('arcana', 'history', 'nobility', 'planes', 'religion'), 'linguistics', 'profession', 'senseMotive', 'spellcraft'], 'CRB', 'wis'),
  p('druid', 'Druid', 8, '3/4', ['fort', 'will'], 4,
    ['climb', 'craft', 'fly', 'handleAnimal', 'heal', ...k('geography', 'nature'), 'perception', 'profession', 'ride', 'spellcraft', 'survival', 'swim'], 'CRB', 'wis'),
  p('fighter', 'Fighter', 10, 'full', ['fort'], 2,
    ['climb', 'craft', 'handleAnimal', 'intimidate', ...k('dungeoneering', 'engineering'), 'profession', 'ride', 'survival', 'swim'], 'CRB'),
  p('monk', 'Monk', 8, '3/4', ['fort', 'ref', 'will'], 4,
    ['acrobatics', 'climb', 'craft', 'escapeArtist', 'intimidate', ...k('history', 'religion'), 'perception', 'perform', 'profession', 'ride', 'senseMotive', 'stealth', 'swim'], 'CRB'),
  p('paladin', 'Paladin', 10, 'full', ['fort', 'will'], 2,
    ['craft', 'diplomacy', 'handleAnimal', 'heal', ...k('nobility', 'religion'), 'profession', 'ride', 'senseMotive', 'spellcraft'], 'CRB', 'cha'),
  p('ranger', 'Ranger', 10, 'full', ['fort', 'ref'], 6,
    ['climb', 'craft', 'handleAnimal', 'heal', 'intimidate', ...k('dungeoneering', 'geography', 'nature'), 'perception', 'profession', 'ride', 'spellcraft', 'stealth', 'survival', 'swim'], 'CRB', 'wis'),
  p('rogue', 'Rogue', 8, '3/4', ['ref'], 8,
    ['acrobatics', 'appraise', 'bluff', 'climb', 'craft', 'diplomacy', 'disableDevice', 'disguise', 'escapeArtist', 'intimidate', ...k('dungeoneering', 'local'), 'linguistics', 'perception', 'perform', 'profession', 'senseMotive', 'sleightOfHand', 'stealth', 'swim', 'useMagicDevice'], 'CRB'),
  p('sorcerer', 'Sorcerer', 6, '1/2', ['will'], 2,
    ['appraise', 'bluff', 'craft', 'fly', 'intimidate', ...k('arcana'), 'profession', 'spellcraft', 'useMagicDevice'], 'CRB', 'cha'),
  p('wizard', 'Wizard', 6, '1/2', ['will'], 2,
    ['appraise', 'craft', 'fly', 'knowledge', 'linguistics', 'profession', 'spellcraft'], 'CRB', 'int'),
  // Advanced Player's Guide
  p('alchemist', 'Alchemist', 8, '3/4', ['fort', 'ref'], 4,
    ['appraise', 'craft', 'disableDevice', 'fly', 'heal', ...k('arcana', 'nature'), 'perception', 'profession', 'sleightOfHand', 'spellcraft', 'survival', 'useMagicDevice'], 'APG', 'int'),
  p('antipaladin', 'Antipaladin', 10, 'full', ['fort', 'will'], 2,
    ['bluff', 'climb', 'craft', 'disguise', 'handleAnimal', 'intimidate', ...k('religion'), 'profession', 'ride', 'senseMotive', 'spellcraft', 'stealth'], 'APG', 'cha'),
  p('cavalier', 'Cavalier', 10, 'full', ['fort'], 4,
    ['bluff', 'climb', 'craft', 'diplomacy', 'handleAnimal', 'intimidate', 'profession', 'ride', 'senseMotive', 'swim'], 'APG'),
  p('inquisitor', 'Inquisitor', 8, '3/4', ['fort', 'will'], 6,
    ['bluff', 'climb', 'craft', 'diplomacy', 'disguise', 'heal', 'intimidate', ...k('dungeoneering', 'nature', 'planes', 'religion'), 'perception', 'profession', 'ride', 'senseMotive', 'spellcraft', 'stealth', 'survival', 'swim'], 'APG', 'wis'),
  p('oracle', 'Oracle', 8, '3/4', ['will'], 4,
    ['craft', 'diplomacy', 'heal', ...k('history', 'planes', 'religion'), 'profession', 'senseMotive', 'spellcraft'], 'APG', 'cha'),
  p('summoner', 'Summoner', 8, '3/4', ['will'], 2,
    ['craft', 'fly', 'handleAnimal', 'knowledge', 'linguistics', 'profession', 'ride', 'spellcraft', 'useMagicDevice'], 'APG', 'cha'),
  p('unchained-summoner', 'Summoner (Unchained)', 8, '3/4', ['will'], 2,
    ['craft', 'fly', 'handleAnimal', 'knowledge', 'linguistics', 'profession', 'ride', 'spellcraft', 'useMagicDevice'], 'PU', 'cha'),
  p('witch', 'Witch', 6, '1/2', ['will'], 2,
    ['craft', 'fly', 'heal', 'intimidate', ...k('arcana', 'history', 'nature', 'planes'), 'profession', 'spellcraft', 'useMagicDevice'], 'APG', 'int'),
  // Ultimate Magic / Ultimate Combat
  p('magus', 'Magus', 8, '3/4', ['fort', 'will'], 2,
    ['climb', 'craft', 'fly', 'intimidate', ...k('arcana', 'dungeoneering', 'planes'), 'profession', 'ride', 'spellcraft', 'swim', 'useMagicDevice'], 'UM', 'int'),
  p('gunslinger', 'Gunslinger', 10, 'full', ['fort', 'ref'], 4,
    ['acrobatics', 'bluff', 'climb', 'craft', 'handleAnimal', 'heal', 'intimidate', ...k('engineering', 'local'), 'perception', 'profession', 'ride', 'sleightOfHand', 'survival', 'swim'], 'UC'),
  p('ninja', 'Ninja', 8, '3/4', ['ref'], 8,
    ['acrobatics', 'appraise', 'bluff', 'climb', 'craft', 'diplomacy', 'disableDevice', 'disguise', 'escapeArtist', 'intimidate', ...k('local', 'nobility'), 'linguistics', 'perception', 'perform', 'profession', 'senseMotive', 'sleightOfHand', 'stealth', 'swim', 'useMagicDevice'], 'UC'),
  p('samurai', 'Samurai', 10, 'full', ['fort'], 4,
    ['bluff', 'climb', 'craft', 'diplomacy', 'handleAnimal', 'intimidate', 'profession', 'ride', 'senseMotive', 'swim'], 'UC'),
  // Advanced Class Guide
  p('arcanist', 'Arcanist', 6, '1/2', ['will'], 2,
    ['appraise', 'craft', 'fly', 'knowledge', 'linguistics', 'profession', 'spellcraft', 'useMagicDevice'], 'ACG', 'int'),
  p('bloodrager', 'Bloodrager', 10, 'full', ['fort'], 4,
    ['acrobatics', 'climb', 'craft', 'handleAnimal', 'intimidate', ...k('arcana'), 'perception', 'ride', 'spellcraft', 'survival', 'swim'], 'ACG', 'cha'),
  p('brawler', 'Brawler', 10, 'full', ['fort', 'ref'], 4,
    ['acrobatics', 'climb', 'craft', 'escapeArtist', 'handleAnimal', 'intimidate', ...k('dungeoneering', 'local'), 'perception', 'profession', 'ride', 'senseMotive', 'swim'], 'ACG'),
  p('hunter', 'Hunter', 8, '3/4', ['fort', 'ref'], 6,
    ['climb', 'craft', 'handleAnimal', 'heal', 'intimidate', ...k('dungeoneering', 'geography', 'nature'), 'perception', 'profession', 'ride', 'spellcraft', 'stealth', 'survival', 'swim'], 'ACG', 'wis'),
  p('investigator', 'Investigator', 8, '3/4', ['ref', 'will'], 6,
    ['acrobatics', 'appraise', 'bluff', 'climb', 'craft', 'diplomacy', 'disableDevice', 'disguise', 'escapeArtist', 'heal', 'intimidate', 'knowledge', 'linguistics', 'perception', 'perform', 'profession', 'senseMotive', 'sleightOfHand', 'spellcraft', 'stealth', 'useMagicDevice'], 'ACG', 'int'),
  p('shaman', 'Shaman', 8, '3/4', ['will'], 4,
    ['craft', 'diplomacy', 'fly', 'handleAnimal', 'heal', ...k('nature', 'planes', 'religion'), 'profession', 'ride', 'spellcraft', 'survival'], 'ACG', 'wis'),
  p('skald', 'Skald', 8, '3/4', ['fort', 'will'], 4,
    ['acrobatics', 'appraise', 'bluff', 'climb', 'craft', 'diplomacy', 'escapeArtist', 'handleAnimal', 'intimidate', 'knowledge', 'linguistics', 'perception', 'perform', 'profession', 'ride', 'senseMotive', 'spellcraft', 'swim', 'useMagicDevice'], 'ACG', 'cha'),
  p('slayer', 'Slayer', 10, 'full', ['fort', 'ref'], 6,
    ['acrobatics', 'bluff', 'climb', 'craft', 'disguise', 'heal', 'intimidate', ...k('dungeoneering', 'geography', 'local'), 'perception', 'profession', 'ride', 'senseMotive', 'stealth', 'survival', 'swim'], 'ACG'),
  p('swashbuckler', 'Swashbuckler', 10, 'full', ['ref'], 4,
    ['acrobatics', 'bluff', 'climb', 'craft', 'diplomacy', 'escapeArtist', 'intimidate', ...k('local', 'nobility'), 'perception', 'perform', 'profession', 'ride', 'senseMotive', 'sleightOfHand', 'swim'], 'ACG'),
  p('warpriest', 'Warpriest', 8, '3/4', ['fort', 'will'], 2,
    ['climb', 'craft', 'diplomacy', 'handleAnimal', 'heal', 'intimidate', ...k('engineering', 'religion'), 'profession', 'ride', 'senseMotive', 'spellcraft', 'survival', 'swim'], 'ACG', 'wis'),
  // Occult Adventures / Pathfinder Unchained
  p('kineticist', 'Kineticist', 8, '3/4', ['fort', 'ref'], 4,
    ['acrobatics', 'craft', 'heal', 'intimidate', 'perception', 'profession', 'stealth', 'useMagicDevice'], 'OA'),
  p('unchained-monk', 'Monk (Unchained)', 10, 'full', ['fort', 'ref', 'will'], 4,
    ['acrobatics', 'climb', 'craft', 'escapeArtist', 'intimidate', ...k('history', 'religion'), 'perception', 'perform', 'profession', 'ride', 'senseMotive', 'stealth', 'swim'], 'PU'),
  p('unchained-rogue', 'Rogue (Unchained)', 8, '3/4', ['ref'], 8,
    ['acrobatics', 'appraise', 'bluff', 'climb', 'craft', 'diplomacy', 'disableDevice', 'disguise', 'escapeArtist', 'intimidate', ...k('dungeoneering', 'local'), 'linguistics', 'perception', 'perform', 'profession', 'senseMotive', 'sleightOfHand', 'stealth', 'swim', 'useMagicDevice'], 'PU'),
];

export const PRESET_BY_ID = Object.fromEntries(CLASS_PRESETS.map((c) => [c.id, c]));

export function findPreset(name: string): ClassPreset | undefined {
  const n = name.trim().toLowerCase();
  return CLASS_PRESETS.find((c) => c.name.toLowerCase() === n || c.id === n);
}
