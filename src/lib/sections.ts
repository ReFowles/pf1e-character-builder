import type { Character } from './model/types';

export const TABS = ['core', 'character', 'companions', 'spells', 'mythic', 'notes', 'settings'] as const;
export type Tab = (typeof TABS)[number];

export interface TabDef {
  label: string;
  /** Shown only once the character turns it on (Settings); always when absent. */
  enabled?: (c: Character) => boolean;
  /** Printed only when this holds (a tab with nothing on it skips its page); always when absent. */
  printable?: (c: Character) => boolean;
}

export const TAB_DEFS: Record<Tab, TabDef> = {
  core: { label: 'Core' },
  character: { label: 'Character' },
  companions: { label: 'Companions', enabled: (c) => c.companionTab, printable: (c) => c.companions.length > 0 },
  spells: { label: 'Spells', enabled: (c) => c.spellsTab, printable: (c) => c.spellcasting.length > 0 },
  mythic: { label: 'Mythic', enabled: (c) => c.mythic.enabled },
  notes: { label: 'Notes' },
  settings: { label: 'Settings', printable: () => false },
};

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
