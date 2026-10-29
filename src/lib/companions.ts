// Companions are sections on the optional Companions tab, added and removed
// from Settings (or the section's edit mode), like spellcasting sections.
import { make } from './model/defaults';
import type { Character, Companion, CompanionKind } from './model/types';
import { KIND_LABELS } from './rules/companions';
import { levelClassIds } from './rules/gestalt';

export const companionSectionId = (comp: Companion) => `companion-${comp.id}`;

/** "Hati (Animal companion · Mount)". */
export const companionTitle = (comp: Companion) => `${comp.name.trim() || 'Unnamed'} (${KIND_LABELS[comp.kind]}${comp.label.trim() ? ` · ${comp.label.trim()}` : ''})`;

/** What the character's classes suggest: druids get animals, cavaliers mounts, wizards familiars, summoners eidolons… */
export function guessKind(c: Character): { kind: CompanionKind; classId: string | null; label: string; unchained: boolean } {
  // Only classes the character has levels in.
  const has = (re: RegExp) =>
    c.classes.find((k) => c.levels.some((l) => levelClassIds(c, l).includes(k.id)) && re.test(k.presetId ?? k.name.toLowerCase()));
  const pick = (kind: CompanionKind, k: { id: string } | undefined, label = '', unchained = false) => ({ kind, classId: k?.id ?? null, label, unchained });
  const drake = has(/drake/);
  if (drake) return pick('drake', drake);
  const phantom = has(/spiritualist/);
  if (phantom) return pick('phantom', phantom);
  const summoner = has(/summoner/);
  if (summoner) return pick('eidolon', summoner, '', /unchained/.test(summoner.presetId ?? summoner.name.toLowerCase()));
  const mount = has(/cavalier|samurai|paladin/);
  if (mount) return pick('animal', mount, 'Mount');
  const animal = has(/druid|ranger|hunter/);
  if (animal) return pick('animal', animal);
  const familiar = has(/wizard|witch|arcanist|sorcerer|magus|shaman/);
  if (familiar) return pick('familiar', familiar, /shaman/.test(familiar.presetId ?? familiar.name.toLowerCase()) ? 'Spirit animal' : '');
  return pick('animal', c.classes[0]);
}

export function addCompanion(c: Character): Companion {
  const { kind, classId, label, unchained } = guessKind(c);
  const comp = { ...make.companion(kind), masterClassId: classId, label };
  comp.eidolon.unchained = unchained;
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
