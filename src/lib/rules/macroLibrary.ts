import type { BonusType, MacroCategory } from '../model/types';

export interface LibraryMacro {
  id: string;
  name: string;
  category: MacroCategory;
  effects: { key: string; value: string; type: BonusType }[];
  notes: string;
}

type Fx = [key: string, value: string | number, type?: BonusType];

const m = (id: string, name: string, category: MacroCategory, fx: Fx[], notes = ''): LibraryMacro => ({
  id,
  name,
  category,
  effects: fx.map(([key, value, type = 'untyped']) => ({ key, value: String(value), type })),
  notes,
});

const stat = (id: string, name: string, ability: string) =>
  m(id, name, 'spell', [[`ability.${ability}`, 4, 'enhancement']]);

const SCALE = 'floor(@bab / 4)';

export const MACRO_LIBRARY: LibraryMacro[] = [
  // Combat feats and actions
  m('power-attack', 'Power Attack', 'feat', [['attack.melee', `-1 - ${SCALE}`], ['damage.melee', `2 * (1 + ${SCALE})`]],
    'Damage bonus is ×1.5 with two-handed weapons and ×0.5 with off-hand weapons; adjust the weapon misc.'),
  m('deadly-aim', 'Deadly Aim', 'feat', [['attack.ranged', `-1 - ${SCALE}`], ['damage.ranged', `2 * (1 + ${SCALE})`]]),
  m('combat-expertise', 'Combat Expertise', 'feat', [['attack', `-1 - ${SCALE}`], ['ac', `1 + ${SCALE}`, 'dodge']]),
  m('fighting-defensively', 'Fighting Defensively', 'condition', [['attack', -4], ['ac', 2, 'dodge']],
    '+3 dodge with 3 or more ranks in Acrobatics.'),
  m('total-defense', 'Total Defense', 'condition', [['ac', 4, 'dodge']], '+6 with 3 or more ranks in Acrobatics.'),
  m('charge', 'Charge', 'condition', [['attack.melee', 2], ['ac', -2]]),
  m('flanking', 'Flanking', 'condition', [['attack.melee', 2]]),
  m('higher-ground', 'Higher Ground', 'condition', [['attack.melee', 1]]),
  m('cover', 'Cover', 'condition', [['ac', 4], ['save.ref', 2]]),
  m('shooting-into-melee', 'Shooting into Melee', 'condition', [['attack.ranged', -4]], 'Precise Shot removes this.'),
  m('two-weapon-fighting', 'Two-Weapon Fighting', 'feat', [['attack', -2]],
    'With the feat and a light off-hand weapon. Main hand -4 / off-hand -8 without the feat.'),
  m('rapid-shot', 'Rapid Shot', 'feat', [['attack.ranged', -2]], 'One extra ranged attack at highest bonus.'),
  // Always-on feats (Toughness, Improved Initiative, Iron Will…) are not macros:
  // picking the feat adds a row to the section's bonus list (rules/featBonuses.ts).
  // Class features
  m('rage', 'Rage', 'class', [['ability.str', 4, 'morale'], ['ability.con', 4, 'morale'], ['save.will', 2, 'morale'], ['ac', -2]],
    'Greater rage: +6/+3. Mighty rage: +8/+4.'),
  m('smite-evil', 'Smite Evil', 'class', [['attack', '@cha.mod'], ['damage', '@level'], ['ac', '@cha.mod', 'deflection']],
    'Damage uses paladin level; change @level to @class.paladin.level when multiclassed.'),
  m('inspire-courage', 'Inspire Courage', 'class', [['attack', 1, 'competence'], ['damage', 1, 'competence']],
    '+2 at bard level 5, +3 at 11, +4 at 17. Also a morale bonus on saves against charm and fear.'),
  // Spells
  m('bless', 'Bless', 'spell', [['attack', 1, 'morale']], 'Also +1 morale on saves against fear.'),
  m('prayer', 'Prayer', 'spell', [['attack', 1, 'luck'], ['damage', 1, 'luck'], ['save', 1, 'luck'], ['skills', 1, 'luck']]),
  m('heroism', 'Heroism', 'spell', [['attack', 2, 'morale'], ['save', 2, 'morale'], ['skills', 2, 'morale']]),
  m('greater-heroism', 'Greater Heroism', 'spell', [['attack', 4, 'morale'], ['save', 4, 'morale'], ['skills', 4, 'morale']]),
  m('haste', 'Haste', 'spell', [['attack', 1], ['ac', 1, 'dodge'], ['save.ref', 1, 'dodge'], ['speed', 30, 'enhancement']],
    'One extra attack at your highest bonus when making a full attack.'),
  m('divine-favor', 'Divine Favor', 'spell', [['attack', 1, 'luck'], ['damage', 1, 'luck']], '+1 per three caster levels (max +3).'),
  // One size step covers AC, attack, CMB/CMD, Fly, Stealth, carrying capacity and weapon dice.
  m('enlarge-person', 'Enlarge Person', 'spell', [['size.steps', 1], ['ability.str', 2, 'size'], ['ability.dex', -2, 'size']],
    'One size larger: reach increases and weapon damage dice go up one step.'),
  m('reduce-person', 'Reduce Person', 'spell', [['size.steps', -1], ['ability.str', -2, 'size'], ['ability.dex', 2, 'size']],
    'One size smaller: weapon damage dice go down one step.'),
  m('ant-haul', 'Ant Haul', 'spell', [['capacity.mult', 3]], 'Carrying capacity triples.'),
  m('shield', 'Shield (spell)', 'spell', [['ac', 4, 'shield']], 'Negates magic missile.'),
  m('mage-armor', 'Mage Armor', 'spell', [['ac', 4, 'armor']]),
  m('barkskin', 'Barkskin', 'spell', [['ac', 2, 'natural']], '+1 per three caster levels above 3rd (max +5).'),
  m('protection-from-evil', 'Protection from Evil', 'spell', [['ac', 2, 'deflection'], ['save', 2, 'resistance']], 'Against evil creatures.'),
  m('resistance', 'Resistance', 'spell', [['save', 1, 'resistance']]),
  stat('bulls-strength', "Bull's Strength", 'str'),
  stat('cats-grace', "Cat's Grace", 'dex'),
  stat('bears-endurance', "Bear's Endurance", 'con'),
  stat('foxs-cunning', "Fox's Cunning", 'int'),
  stat('owls-wisdom', "Owl's Wisdom", 'wis'),
  stat('eagles-splendor', "Eagle's Splendor", 'cha'),
];
