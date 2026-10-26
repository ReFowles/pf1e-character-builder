// Each spellcasting block is its own section on the Spells tab. Blocks are
// added and removed from Config (or from the section's edit mode).
import { make } from './model/defaults';
import type { Character, Spellcasting } from './model/types';
import { PRESET_BY_ID } from './rules/classPresets';
import { PRESET_SPELL_TABLE, SPELL_TABLE_BY_ID } from './rules/spellTables';

export const spellSectionId = (b: Spellcasting) => `spells-${b.id}`;

/** "Cleric Spells", or the label for blocks without a class ("Racial Spells"). */
export function spellSectionTitle(c: Character, b: Spellcasting): string {
  const k = c.classes.find((x) => x.id === b.classId);
  return `${k ? k.name || 'Unnamed' : b.label.trim() || 'Other'} Spells`;
}

export function addSpellBlock(c: Character): Spellcasting {
  const used = new Set(c.spellcasting.map((b) => b.classId));
  // Prefer a casting class that doesn't have a block yet.
  const k =
    c.classes.find((x) => !used.has(x.id) && (x.castingAbility || PRESET_SPELL_TABLE[x.presetId ?? ''])) ??
    c.classes.find((x) => !used.has(x.id));
  const block = make.spellcasting();
  if (k) {
    block.classId = k.id;
    const preset = PRESET_BY_ID[k.presetId ?? ''];
    block.ability = k.castingAbility ?? preset?.castingAbility ?? 'int';
    block.table = PRESET_SPELL_TABLE[k.presetId ?? ''] ?? '';
    block.kind = SPELL_TABLE_BY_ID[block.table]?.kind ?? 'prepared';
    block.domainSlot = k.presetId === 'cleric';
  }
  c.spellcasting.push(block);
  return block;
}

export function removeSpellBlock(c: Character, id: string) {
  const i = c.spellcasting.findIndex((b) => b.id === id);
  const b = c.spellcasting[i];
  if (!b) return;
  if (b.spells.length && !confirm(`Remove ${spellSectionTitle(c, b)} and its ${b.spells.length} spells?`)) return;
  c.spellcasting.splice(i, 1);
  delete c.ui.sections[spellSectionId(b)];
}
