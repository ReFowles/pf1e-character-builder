// A class's progression table from the bundled class data: BAB, saves,
// features and spells per day at each class level, with archetypes swapped
// in. Also the universal level-up rewards by character level.
import type { DbArchetype, DbClass, DbFeatureTable } from '../db/types';
import type { BabProgression, Character, ClassDef, Save } from '../model/types';
import { SAVES } from '../model/types';
import { slug } from '../slug';
import { levelClassIds } from './gestalt';
import { SPELL_TABLE_BY_ID, PRESET_SPELL_TABLE } from './spellTables';
import { babFor, iteratives, saveFor } from './tables';

export interface ProgressionFeature {
  name: string;
  /** Text for this level, e.g. "Sneak Attack +2d6". */
  label: string;
  /** False when the feature improves or repeats here rather than arriving. */
  first: boolean;
  /** Archetype that grants it; absent for the base class. */
  archetype?: string;
  /** Archetype that replaces this base feature at this level. */
  replacedBy?: string;
  summary: string;
  description: string;
  tables?: DbFeatureTable[];
}

export interface ProgressionRow {
  level: number;
  bab: string;
  saves: Record<Save, string>;
  features: ProgressionFeature[];
  /** Spells per day by spell level 0..9 (null = can't cast that level yet). */
  perDay: (number | null)[] | null;
  /** Spells known by spell level 0..9, for spontaneous casters. */
  known: (number | null)[] | null;
  /** Prestige classes: the table's spellcasting text ("+1 level of existing class"). */
  spellsText: string;
}

export interface Progression {
  rows: ProgressionRow[];
  /** Spell levels that appear anywhere in the table (cantrips at will count). */
  spellLevels: number[];
  /** "Bravery: Archer, Two-Handed Fighter": features more than one chosen archetype changes, which can't be combined. */
  conflicts: string[];
}

const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

/** The class data entry for a character's class: by preset id, then by name. */
export function findDbClass(rows: DbClass[], k: Pick<ClassDef, 'name' | 'presetId'>): DbClass | undefined {
  const name = k.name.trim().toLowerCase();
  if (!name && !k.presetId) return undefined;
  return (
    rows.find((r) => r.id === k.presetId) ??
    rows.find((r) => r.name.toLowerCase() === name) ??
    rows.find((r) => r.id === slug(k.name))
  );
}

/** Archetypes for a class data entry, by name. */
export const archetypesFor = (all: DbArchetype[], classId: string) => all.filter((a) => a.classId === classId);

/** Spell table id for a sheet class: its spells section's table, else the preset's. */
export function spellTableFor(c: Pick<Character, 'spellcasting'>, k: Pick<ClassDef, 'id' | 'name' | 'presetId'>): string {
  return c.spellcasting.find((b) => b.classId === k.id)?.table || PRESET_SPELL_TABLE[k.presetId ?? ''] || PRESET_SPELL_TABLE[slug(k.name)] || '';
}

/**
 * The progression table for a class, with the chosen archetypes applied. BAB
 * and saves follow the sheet's class settings (prestige classes print their
 * own table); spells per day follow `sheet.spellTable`.
 */
export function progression(
  k: DbClass,
  sheet: { bab: BabProgression; goodSaves: Save[]; spellTable?: string },
  archetypes: DbArchetype[] = [],
): Progression {
  const max = k.table?.length || k.maxLevel || 20;
  const spellTable = SPELL_TABLE_BY_ID[sheet.spellTable ?? ''];

  // Which base features (at which levels) each archetype replaces.
  const replaced = new Map<string, { by: string; levels?: number[] }[]>();
  for (const a of archetypes)
    for (const f of a.features)
      for (const r of f.replaces) {
        const list = replaced.get(r.name) ?? [];
        list.push({ by: a.name, levels: r.levels });
        replaced.set(r.name, list);
      }
  const conflicts = [...replaced]
    .map(([name, list]) => [name, [...new Set(list.map((x) => x.by))]] as const)
    .filter(([, by]) => by.length > 1)
    .map(([name, by]) => `${name}: ${by.join(', ')}`);
  const replacedAt = (name: string, level: number) => replaced.get(name)?.find((r) => !r.levels || r.levels.includes(level))?.by;

  const rows: ProgressionRow[] = [];
  for (let level = 1; level <= max; level++) {
    const t = k.table?.[level - 1];
    const features: ProgressionFeature[] = [];
    const add = (f: DbClass['features'][number], archetype?: string) => {
      const i = f.levels.indexOf(level);
      if (i < 0) return;
      features.push({
        name: f.name,
        label: f.labels?.[i] ?? f.name,
        first: i === 0,
        ...(archetype ? { archetype } : { replacedBy: replacedAt(f.name, level) }),
        summary: f.summary,
        description: f.description,
        tables: f.tables,
      });
    };
    for (const f of k.features) add(f);
    for (const a of archetypes) for (const f of a.features) add(f, a.name);

    rows.push({
      level,
      bab: t?.bab || iteratives(babFor(sheet.bab, level)).map(signed).join('/'),
      saves: Object.fromEntries(SAVES.map((s) => [s, t?.[s] || signed(saveFor(sheet.goodSaves.includes(s), level))])) as Record<Save, string>,
      features,
      perDay: spellTable?.perDay[level - 1] ?? null,
      known: spellTable?.known?.[level - 1] ?? null,
      spellsText: t?.spells ?? '',
    });
  }
  const spellLevels = spellTable
    ? Array.from({ length: 10 }, (_, s) => s).filter((s) => rows.some((r) => r.perDay?.[s] != null || r.known?.[s] != null))
    : [];
  return { rows, spellLevels, conflicts };
}

/** Whether a Class Abilities entry is this feature: the same name, or the name with a value ("Bravery +1", "Armor Training 2"). */
export function isFeature(entry: string, feature: string): boolean {
  const n = entry.trim().toLowerCase();
  const f = feature.trim().toLowerCase();
  return n === f || (n.startsWith(`${f} `) && /^[+−-]?\d/.test(n.slice(f.length + 1)));
}

/** Rewards every character gets at a character level: a feat at odd levels, +1 to an ability score every fourth. */
export function universalGains(characterLevel: number): { feat: boolean; ability: boolean } {
  return { feat: characterLevel % 2 === 1, ability: characterLevel > 0 && characterLevel % 4 === 0 };
}

/**
 * The character level at which each level of a class was (or would be) taken,
 * index 0 = class level 1. Levels not taken yet assume every level from now
 * on goes to this class. Either side of a gestalt level counts.
 */
export function characterLevelsFor(c: Pick<Character, 'gestalt' | 'classes' | 'levels'>, classId: string, max: number): number[] {
  const out: number[] = [];
  c.levels.forEach((l, i) => {
    if (levelClassIds(c, l).includes(classId)) out.push(i + 1);
  });
  let next = c.levels.length;
  while (out.length < max) out.push(++next);
  return out.slice(0, max);
}

/** Spell levels whose slots or spells known go up at this class level ("new spell level" when it was uncastable before). */
export function spellGains(rows: ProgressionRow[], level: number): { perDay: number[]; known: { level: number; count: number }[]; newLevels: number[] } {
  const now = rows[level - 1];
  const before = rows[level - 2];
  const out = { perDay: [] as number[], known: [] as { level: number; count: number }[], newLevels: [] as number[] };
  if (!now) return out;
  for (let s = 0; s < 10; s++) {
    const p = now.perDay?.[s];
    const q = before?.perDay?.[s];
    if (p != null && (q == null || p > q)) out.perDay.push(s);
    if (p != null && q == null) out.newLevels.push(s);
    const kn = now.known?.[s] ?? 0;
    const kb = before?.known?.[s] ?? 0;
    if (kn > kb) out.known.push({ level: s, count: kn - kb });
  }
  return out;
}
