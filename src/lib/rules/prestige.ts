// Prestige classes that advance an existing spellcasting class ("+1 level of
// existing arcane spellcasting class"). Keyed by the class id (slug of its
// name). Levels are the prestige class's own levels 1–10 that advance; the
// Prestigious Spellcaster feat is "tick one more level" on the sheet.
import type { Ability, Character, ClassDef, LevelEntry } from '../model/types';

export type SpellType = 'arcane' | 'divine' | 'psychic';
export interface CastingAdvance {
  which: SpellType | 'any' | 'both';
  levels: number[];
}

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
const SKIP_5_9 = [2, 3, 4, 6, 7, 8, 10];

export const CASTING_ADVANCE: Record<string, CastingAdvance> = {
  'arcane-archer': { which: 'arcane', levels: SKIP_5_9 },
  'arcane-trickster': { which: 'arcane', levels: range(1, 10) },
  'dragon-disciple': { which: 'arcane', levels: SKIP_5_9 },
  'eldritch-knight': { which: 'arcane', levels: range(2, 10) },
  loremaster: { which: 'any', levels: range(1, 10) },
  'mystic-theurge': { which: 'both', levels: range(1, 10) },
  'pathfinder-savant': { which: 'any', levels: range(2, 10) },
  'holy-vindicator': { which: 'divine', levels: SKIP_5_9 },
  'nature-warden': { which: 'divine', levels: SKIP_5_9 },
  'rage-prophet': { which: 'divine', levels: [2, 3, 4, 6, 7, 9, 10] },
  'hellknight-signifer': { which: 'any', levels: range(1, 10) },
  evangelist: { which: 'any', levels: range(2, 10) },
  diabolist: { which: 'any', levels: range(2, 10) },
  harrower: { which: 'any', levels: range(1, 10) },
  'agent-of-the-grave': { which: 'any', levels: SKIP_5_9 },
  cyphermage: { which: 'arcane', levels: SKIP_5_9 },
  riftwarden: { which: 'any', levels: range(2, 10) },
  'veiled-illusionist': { which: 'arcane', levels: range(2, 10) },
  'magaambyan-arcanist': { which: 'arcane', levels: range(2, 10) },
  'arclord-of-nex': { which: 'arcane', levels: range(2, 10) },
  'blackfire-adept': { which: 'any', levels: range(1, 10) },
  'green-faith-acolyte': { which: 'divine', levels: range(2, 10) },
  'envoy-of-balance': { which: 'any', levels: range(2, 10) },
  'divine-scion': { which: 'divine', levels: range(2, 10) },
  'mystery-cultist': { which: 'divine', levels: range(2, 10) },
  'sanguine-angel': { which: 'any', levels: range(2, 10) },
  ritualist: { which: 'any', levels: range(1, 10) },
  'razmiran-priest': { which: 'arcane', levels: [2, 3, 4, 6, 7, 8, 10] },
  'winter-witch': { which: 'arcane', levels: range(2, 10) },
  'bloatmage': { which: 'arcane', levels: range(1, 10) },
  daivrat: { which: 'any', levels: range(2, 10) },
  'genie-binder': { which: 'any', levels: range(2, 10) },
  'brightness-seeker': { which: 'any', levels: SKIP_5_9 },
  'souldrinker': { which: 'any', levels: SKIP_5_9 },
  'student-of-perfection': { which: 'any', levels: range(2, 10) },
  'tattooed-mystic': { which: 'arcane', levels: range(2, 10) },
  'umbral-court-agent': { which: 'any', levels: SKIP_5_9 },
};

/** Spell type of the base class presets that cast spells. */
export const PRESET_SPELL_TYPE: Record<string, SpellType> = {
  wizard: 'arcane',
  sorcerer: 'arcane',
  bard: 'arcane',
  magus: 'arcane',
  witch: 'arcane',
  arcanist: 'arcane',
  bloodrager: 'arcane',
  skald: 'arcane',
  summoner: 'arcane',
  'unchained-summoner': 'arcane',
  cleric: 'divine',
  druid: 'divine',
  paladin: 'divine',
  antipaladin: 'divine',
  ranger: 'divine',
  oracle: 'divine',
  inquisitor: 'divine',
  shaman: 'divine',
  warpriest: 'divine',
  hunter: 'divine',
  psychic: 'psychic',
  occultist: 'psychic',
  mesmerist: 'psychic',
  spiritualist: 'psychic',
  medium: 'psychic',
};

export const slugOf = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export function castingAdvanceFor(k: Pick<ClassDef, 'name' | 'presetId'>): CastingAdvance | undefined {
  return CASTING_ADVANCE[k.presetId ?? ''] ?? CASTING_ADVANCE[slugOf(k.name)];
}

export const spellTypeOf = (k: ClassDef): SpellType | undefined => k.spellType ?? PRESET_SPELL_TYPE[k.presetId ?? ''] ?? PRESET_SPELL_TYPE[slugOf(k.name)];

/** Casting classes (ones with a spell block) this advancement can apply to. */
export function eligibleCastingClasses(c: Character, adv: CastingAdvance): ClassDef[] {
  const cast = c.classes.filter((k) => !k.prestige && c.spellcasting.some((b) => b.classId === k.id));
  if (adv.which === 'any' || adv.which === 'both') return cast;
  return cast.filter((k) => (spellTypeOf(k) ?? adv.which) === adv.which);
}

/** Which of the character's levels this is for its class (1 for the first level taken in it). */
export function prestigeLevelOf(levels: LevelEntry[], i: number): number {
  return levels.slice(0, i + 1).filter((l) => l.classId === levels[i].classId).length;
}

/** Default casting classes a prestige level advances: by the class table, first arcane + first divine for "both". */
export function defaultSpellAdvance(c: Character, k: ClassDef, prestigeLevel: number): string[] {
  const adv = k.castingAdvance;
  if (!adv || !adv.levels.includes(prestigeLevel)) return [];
  const eligible = eligibleCastingClasses(c, adv);
  if (adv.which === 'both') {
    const arcane = eligible.find((x) => spellTypeOf(x) === 'arcane');
    const divine = eligible.find((x) => spellTypeOf(x) === 'divine');
    return [arcane, divine].filter((x): x is ClassDef => !!x).map((x) => x.id);
  }
  return eligible[0] ? [eligible[0].id] : [];
}

export const CASTING_ABILITY_DEFAULT: Record<SpellType, Ability> = { arcane: 'int', divine: 'wis', psychic: 'int' };
