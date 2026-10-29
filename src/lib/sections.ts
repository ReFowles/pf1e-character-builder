import type { Tab } from './state.svelte';

export const TAB_LABELS: Record<Tab, string> = { core: 'Core', character: 'Character', companions: 'Companions', spells: 'Spells', mythic: 'Mythic', notes: 'Notes', settings: 'Settings' };

export interface SectionDef {
  id: string;
  title: string;
  tab: Tab;
}

/** Every fixed section, in default mobile order per tab (users can reorder; see app.mobileOrder). Spell sections are per block (lib/spellBlocks.ts). */
export const SECTIONS: SectionDef[] = [
  { id: 'info', title: 'Character Info', tab: 'core' },
  { id: 'abilities', title: 'Ability Scores', tab: 'core' },
  { id: 'classes', title: 'Class Info', tab: 'core' },
  { id: 'skills', title: 'Skills', tab: 'core' },
  { id: 'readiness', title: 'Readiness', tab: 'core' },
  { id: 'hp', title: 'Hit Points', tab: 'core' },
  { id: 'macros', title: 'Macros', tab: 'core' },
  { id: 'offense', title: 'Offense', tab: 'core' },
  { id: 'defense', title: 'Defense', tab: 'core' },
  { id: 'special', title: 'Special Abilities', tab: 'core' },
  { id: 'currency', title: 'Currency', tab: 'core' },
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
  { id: 'notes', title: 'Campaign Notes', tab: 'notes' },
];

export const SECTION_BY_ID = Object.fromEntries(SECTIONS.map((s) => [s.id, s]));
