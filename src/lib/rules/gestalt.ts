// Gestalt rule (optional): each level advances two classes at once, taking the
// better hit die and skill ranks of the two, and the better BAB and saves of the
// two tracks. One favored class bonus per level, earned if either side is
// favored. A class can't be taken on both sides.
import type { Character, ClassDef, LevelEntry, Save } from '../model/types';
import { babFor, saveFor } from './tables';
import { classLabel } from '../ui/options';

type Rules = Pick<Character, 'gestalt' | 'classes'>;

/** Classes a level advances: its class, plus the gestalt class while the rule is on. */
export function levelClassIds(c: Rules, l: LevelEntry): string[] {
  const g = l.gestaltClassId;
  return c.gestalt && g && g !== l.classId && c.classes.some((k) => k.id === g) ? [l.classId, g] : [l.classId];
}

/**
 * BAB and base saves: the better of the two tracks (the levels' own classes, and
 * their gestalt classes), each summed per class as usual. Comparing whole
 * tracks keeps a poor save's late +1 from beating a good save's flat step.
 * Without gestalt there is only the first track.
 */
export function classProgression(c: Rules & Pick<Character, 'levels'>, classById: Map<string, ClassDef>) {
  const tracks: Record<string, number>[] = [{}, {}];
  for (const l of c.levels)
    levelClassIds(c, l).forEach((id, side) => (tracks[side][id] = (tracks[side][id] ?? 0) + 1));
  const best = (f: (k: ClassDef, n: number) => number) =>
    Math.max(...tracks.map((t) => Object.entries(t).reduce((s, [id, n]) => s + (classById.has(id) ? f(classById.get(id)!, n) : 0), 0)));
  const save = (s: Save) => best((k, n) => saveFor(k.goodSaves.includes(s), n));
  return { bab: best((k, n) => babFor(k.bab, n)), saves: { fort: save('fort'), ref: save('ref'), will: save('will') } as Record<Save, number> };
}

/** Names of classes taken on both sides, which the gestalt rule forbids. */
export function gestaltConflicts(c: Rules & Pick<Character, 'levels'>): string[] {
  if (!c.gestalt) return [];
  const main = new Set(c.levels.map((l) => l.classId));
  const side = new Set(c.levels.map((l) => l.gestaltClassId).filter(Boolean));
  return c.classes.filter((k) => main.has(k.id) && side.has(k.id)).map(classLabel);
}
