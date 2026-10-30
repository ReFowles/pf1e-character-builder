// Option lists shared by the Select dropdowns across tabs.
import { ABILITIES, type ClassDef } from '../model/types';
import { opts, type SelectOption } from './Select.svelte';

export const UNNAMED_CLASS = 'Unnamed class';

/** A class's name for labels and titles, with a fallback for a blank one. */
export const classLabel = (k: Pick<ClassDef, 'name'>) => k.name || UNNAMED_CLASS;

/** One option per class (by id), optionally preceded by a blank/none choice. */
export function classOptions<B = never>(classes: ClassDef[], blank?: SelectOption<B>): SelectOption<string | B>[] {
  const list: SelectOption<string | B>[] = classes.map((k) => ({ value: k.id, label: classLabel(k) }));
  return blank ? [blank, ...list] : list;
}

/** STR … CHA. */
export const ABILITY_OPTIONS = opts(ABILITIES, (a) => a.toUpperCase());
