import { ABILITIES, ABILITY_NAMES } from '../model/types';
import { KNOWLEDGES, SKILLS } from './skills';

export interface KeyDef {
  key: string;
  label: string;
}

/** Every bonus key derive() reads, for pickers and validation. */
export const BONUS_KEYS: KeyDef[] = [
  ...ABILITIES.map((a) => ({ key: `ability.${a}`, label: `${ABILITY_NAMES[a]} score` })),
  { key: 'attack', label: 'All attack rolls' },
  { key: 'attack.melee', label: 'Melee attack rolls' },
  { key: 'attack.ranged', label: 'Ranged attack rolls' },
  { key: 'damage', label: 'All weapon damage' },
  { key: 'damage.melee', label: 'Melee weapon damage' },
  { key: 'damage.ranged', label: 'Ranged weapon damage' },
  { key: 'cmb', label: 'Combat maneuver bonus' },
  { key: 'cmd', label: 'Combat maneuver defense' },
  { key: 'ac', label: 'Armor class (type decides touch/flat-footed)' },
  { key: 'save', label: 'All saving throws' },
  { key: 'save.fort', label: 'Fortitude save' },
  { key: 'save.ref', label: 'Reflex save' },
  { key: 'save.will', label: 'Will save' },
  { key: 'init', label: 'Initiative' },
  { key: 'speed', label: 'Base speed (ft)' },
  { key: 'hp.max', label: 'Maximum hit points' },
  { key: 'size.steps', label: 'Size category steps (+1 = one size larger)' },
  { key: 'capacity.mult', label: 'Carrying capacity multiplier (highest applies)' },
  { key: 'skills', label: 'All skill checks' },
  ...SKILLS.map((s) => ({ key: `skill.${s.key}`, label: `${s.name}${s.multi ? ' (all)' : ''}` })),
  ...KNOWLEDGES.map((k) => ({ key: `skill.knowledge.${k}`, label: `Knowledge (${k})` })),
  { key: 'cl', label: 'Caster level' },
  { key: 'concentration', label: 'Concentration checks' },
  { key: 'spell.dc', label: 'Spell save DCs' },
  { key: 'spell.pen', label: 'Spell penetration (caster level checks vs SR)' },
];

export const KEY_LABELS: Record<string, string> = Object.fromEntries(
  BONUS_KEYS.map((k) => [k.key, k.label]),
);

/** Short names for narrow pickers (bonus rows); falls back to KEY_LABELS. */
export const KEY_SHORT: Record<string, string> = {
  attack: 'Attack',
  'attack.melee': 'Melee attack',
  'attack.ranged': 'Ranged attack',
  damage: 'Damage',
  'damage.melee': 'Melee damage',
  'damage.ranged': 'Ranged damage',
  cmb: 'CMB',
  cmd: 'CMD',
  ac: 'AC',
  save: 'All saves',
  'save.fort': 'Fortitude',
  'save.ref': 'Reflex',
  'save.will': 'Will',
  init: 'Initiative',
  speed: 'Speed',
  'hp.max': 'Max HP',
  skills: 'All skills',
};
export const keyShort = (k: string) => KEY_SHORT[k] ?? KEY_LABELS[k] ?? k;

/** Formula references available to macros and resource formulas. */
export const FORMULA_REFS = ['@level', '@hd', '@bab', '@cl', ...ABILITIES.flatMap((a) => [`@${a}`, `@${a}.mod`]), '@class.<name>.level', '@class.<name>.casterLevel'];
