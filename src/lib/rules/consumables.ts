// Potions, scrolls and wands are built from spells at the standard prices
// (Core Rulebook): the item's spell level is the lowest level any class casts
// it at, and its caster level is the minimum for that class.
import type { DbSpell } from '../db/types';
import { PRESET_SPELL_TABLE, SPELL_TABLE_BY_ID } from './spellTables';

export type ConsumableKind = 'potion' | 'scroll' | 'wand';

export const CONSUMABLE_MAX_LEVEL: Record<ConsumableKind, number> = { potion: 3, scroll: 9, wand: 4 };
const CONSUMABLE_LABEL: Record<ConsumableKind, string> = { potion: 'Potion of', scroll: 'Scroll of', wand: 'Wand of' };

/** Foundry spell-list keys that don't match a preset id. */
const CLASS_ALIAS: Record<string, string> = { summonerUnchained: 'unchained-summoner', arcanist: 'wizard', psychic: 'sorcerer', occultist: 'magus', mesmerist: 'bard', spiritualist: 'bard', medium: 'bard', adept: 'paladin' };

/** First class level with a slot of the given spell level on the class's table (null when unknown). */
function minCasterLevel(classKey: string, spellLevel: number): number | null {
  const tableId = PRESET_SPELL_TABLE[CLASS_ALIAS[classKey] ?? classKey];
  const table = tableId ? SPELL_TABLE_BY_ID[tableId] : undefined;
  if (!table) return null;
  const row = table.perDay.findIndex((r) => r[spellLevel] !== null);
  return row < 0 ? null : row + 1;
}

export interface ConsumableSpec {
  level: number;
  casterLevel: number;
  classKey: string;
}

/** Lowest spell level (and the cheapest caster level for it) a consumable of this spell can use; null when not allowed. */
export function consumableSpec(spell: DbSpell, kind: ConsumableKind): ConsumableSpec | null {
  let best: ConsumableSpec | null = null;
  for (const [classKey, level] of Object.entries(spell.levels)) {
    if (level > CONSUMABLE_MAX_LEVEL[kind]) continue;
    const casterLevel = minCasterLevel(classKey, level) ?? Math.max(1, level * 2 - 1);
    if (!best || level < best.level || (level === best.level && casterLevel < best.casterLevel)) best = { level, casterLevel, classKey };
  }
  return best;
}

/** Market price in gp. Level 0 counts as half a level. */
export function consumablePrice(kind: ConsumableKind, level: number, casterLevel: number): number {
  const per: Record<ConsumableKind, number> = { potion: 50, scroll: 25, wand: 750 };
  return per[kind] * (level === 0 ? 0.5 : level) * casterLevel;
}

export function consumableName(kind: ConsumableKind, spell: string, spec: ConsumableSpec): string {
  const cl = kind === 'potion' && spec.casterLevel === 1 ? '' : ` (CL ${spec.casterLevel})`;
  return `${CONSUMABLE_LABEL[kind]} ${spell}${cl}`;
}

export const CONSUMABLE_CHARGES: Record<ConsumableKind, number> = { potion: 0, scroll: 0, wand: 50 };
