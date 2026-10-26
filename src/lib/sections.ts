import type { Tab } from './state.svelte';

export interface SectionDef {
  id: string;
  title: string;
  tab: Tab;
}

/** Every fixed section, in mobile (mockup-numbered) order per tab. Spell sections are per block (lib/spellBlocks.ts). */
export const SECTIONS: SectionDef[] = [
  { id: 'info', title: 'Character Info', tab: 'combat' },
  { id: 'currency', title: 'Currency', tab: 'combat' },
  { id: 'abilities', title: 'Ability Scores', tab: 'combat' },
  { id: 'classes', title: 'Class Info', tab: 'combat' },
  { id: 'skills', title: 'Skills', tab: 'combat' },
  { id: 'readiness', title: 'Readiness', tab: 'combat' },
  { id: 'hp', title: 'Hit Points', tab: 'combat' },
  { id: 'macros', title: 'Macros', tab: 'combat' },
  { id: 'offense', title: 'Offense', tab: 'combat' },
  { id: 'defense', title: 'Defense', tab: 'combat' },
  { id: 'special', title: 'Special Abilities', tab: 'combat' },
  { id: 'bio', title: 'Character Bio', tab: 'character' },
  { id: 'portrait', title: 'Portrait', tab: 'character' },
  { id: 'traits', title: 'Traits', tab: 'character' },
  { id: 'feats', title: 'Feats', tab: 'character' },
  { id: 'classAbilities', title: 'Class Abilities', tab: 'character' },
  { id: 'equipment', title: 'Equipment', tab: 'character' },
  { id: 'magicItems', title: 'Magic Items', tab: 'character' },
  { id: 'mythicOverview', title: 'Mythic', tab: 'mythic' },
  { id: 'mythicAbilities', title: 'Mythic Abilities', tab: 'mythic' },
  { id: 'mythicFeats', title: 'Mythic Feats', tab: 'mythic' },
  { id: 'mythicPathAbilities', title: 'Path Abilities', tab: 'mythic' },
  { id: 'mythicSpells', title: 'Mythic Spells', tab: 'mythic' },
];

export const SECTION_BY_ID = Object.fromEntries(SECTIONS.map((s) => [s.id, s]));
