// Companions are sections on the optional Companions tab, added and removed
// from Config (or the section's edit mode), like spellcasting sections.
import { make } from './model/defaults';
import type { Character, Companion, CompanionKind } from './model/types';
import { KIND_LABELS } from './rules/companions';

export const companionSectionId = (comp: Companion) => `companion-${comp.id}`;

/** "Hati (Animal companion)". */
export const companionTitle = (comp: Companion) => `${comp.name.trim() || 'Unnamed'} (${KIND_LABELS[comp.kind]})`;

/** Kinds the character's classes suggest: druids and rangers get animals, wizards familiars, summoners eidolons. */
function guessKind(c: Character): { kind: CompanionKind; classId: string | null } {
  const has = (re: RegExp) => c.classes.find((k) => re.test(k.presetId ?? k.name.toLowerCase()));
  const animal = has(/druid|ranger|hunter|cavalier|paladin/);
  if (animal) return { kind: 'animal', classId: animal.id };
  const familiar = has(/wizard|witch|arcanist|sorcerer|magus|shaman/);
  if (familiar) return { kind: 'familiar', classId: familiar.id };
  const eidolon = has(/summoner/);
  if (eidolon) return { kind: 'eidolon', classId: eidolon.id };
  return { kind: 'animal', classId: c.classes[0]?.id ?? null };
}

export function addCompanion(c: Character): Companion {
  const { kind, classId } = guessKind(c);
  const comp = { ...make.companion(kind), masterClassId: classId };
  c.companions.push(comp);
  return comp;
}

export function removeCompanion(c: Character, id: string) {
  const i = c.companions.findIndex((x) => x.id === id);
  const comp = c.companions[i];
  if (!comp) return;
  if (!confirm(`Remove ${companionTitle(comp)}?`)) return;
  c.companions.splice(i, 1);
  delete c.ui.sections[companionSectionId(comp)];
}
