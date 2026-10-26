import type { BonusType } from '../model/types';

export interface ConditionDef {
  name: string;
  effects: { key: string; value: number; type?: BonusType }[];
  /** Character loses Dex bonus to AC (and dodge bonuses). */
  loseDex?: boolean;
  summary: string;
}

const pen = (keys: string[], value: number) => keys.map((key) => ({ key, value }));
const ALL_D20 = ['attack', 'save', 'skills'];

/** Standard PF1 conditions. Effects apply through the bonus engine as untyped penalties. */
export const CONDITIONS: Record<string, ConditionDef> = {
  bleed: { name: 'Bleed', effects: [], summary: 'Takes damage each turn until healed.' },
  blinded: {
    name: 'Blinded',
    effects: pen(['ac'], -2),
    loseDex: true,
    summary: '-2 AC, loses Dex to AC, -4 on most Str/Dex skills and opposed Perception.',
  },
  confused: { name: 'Confused', effects: [], summary: 'Acts randomly (roll d%).' },
  cowering: {
    name: 'Cowering',
    effects: pen(['ac'], -2),
    loseDex: true,
    summary: 'Frozen in fear; -2 AC, loses Dex to AC.',
  },
  dazed: { name: 'Dazed', effects: [], summary: 'Can take no actions.' },
  dazzled: {
    name: 'Dazzled',
    effects: [...pen(['attack'], -1), ...pen(['skill.perception'], -1)],
    summary: '-1 attack and sight-based Perception.',
  },
  deafened: {
    name: 'Deafened',
    effects: pen(['init'], -4),
    summary: '-4 initiative, 20% verbal spell failure.',
  },
  entangled: {
    name: 'Entangled',
    effects: [...pen(['attack'], -2), ...pen(['ability.dex'], -4)],
    summary: '-2 attack, -4 Dex, half speed, concentration to cast.',
  },
  exhausted: {
    name: 'Exhausted',
    effects: pen(['ability.str', 'ability.dex'], -6),
    summary: '-6 Str and Dex, half speed, cannot run or charge.',
  },
  fatigued: {
    name: 'Fatigued',
    effects: pen(['ability.str', 'ability.dex'], -2),
    summary: '-2 Str and Dex, cannot run or charge.',
  },
  flatFooted: {
    name: 'Flat-Footed',
    effects: [],
    loseDex: true,
    summary: 'Loses Dex to AC, cannot make attacks of opportunity.',
  },
  frightened: {
    name: 'Frightened',
    effects: pen(ALL_D20, -2),
    summary: '-2 attack, saves, skills and ability checks; flees.',
  },
  grappled: {
    name: 'Grappled',
    effects: [...pen(['attack', 'cmb'], -2), ...pen(['ability.dex'], -4)],
    summary: '-2 attack and CMB (except to grapple), -4 Dex, cannot move.',
  },
  helpless: {
    name: 'Helpless',
    effects: [],
    loseDex: true,
    summary: 'Dex treated as 0; melee attackers get +4.',
  },
  nauseated: { name: 'Nauseated', effects: [], summary: 'Only a single move action per turn.' },
  panicked: {
    name: 'Panicked',
    effects: pen(ALL_D20, -2),
    summary: '-2 attack, saves, skills and ability checks; drops held items and flees.',
  },
  paralyzed: {
    name: 'Paralyzed',
    effects: [],
    loseDex: true,
    summary: 'Helpless; effective Str and Dex 0.',
  },
  pinned: {
    name: 'Pinned',
    effects: pen(['ac'], -4),
    loseDex: true,
    summary: 'Flat-footed, additional -4 AC, limited actions.',
  },
  prone: {
    name: 'Prone',
    effects: pen(['attack.melee'], -4),
    summary: '-4 melee attack; +4 AC vs ranged, -4 AC vs melee.',
  },
  shaken: {
    name: 'Shaken',
    effects: pen(ALL_D20, -2),
    summary: '-2 attack, saves, skills and ability checks.',
  },
  sickened: {
    name: 'Sickened',
    effects: pen([...ALL_D20, 'damage'], -2),
    summary: '-2 attack, weapon damage, saves, skills and ability checks.',
  },
  staggered: { name: 'Staggered', effects: [], summary: 'Only a single move or standard action.' },
  stunned: {
    name: 'Stunned',
    effects: pen(['ac'], -2),
    loseDex: true,
    summary: 'Drops held items, no actions, -2 AC, loses Dex to AC.',
  },
};

/** Look up a condition by key, or by name for free-typed chips. */
export function findCondition(label: string): ConditionDef | undefined {
  if (CONDITIONS[label]) return CONDITIONS[label];
  const norm = label.trim().toLowerCase().replace(/[^a-z]/g, '');
  return Object.entries(CONDITIONS).find(([k]) => k.toLowerCase() === norm)?.[1];
}
