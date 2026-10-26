// Spells per day (and spells known) by class level. Each row lists spell
// levels 0..9; `null` means the level isn't castable yet. A 0 means only
// bonus spells from a high ability score.

type Row = (number | null)[];

/** Expand compact rows: 'x' = not castable; missing trailing levels = not castable. */
function rows(src: string[]): Row[] {
  return src.map((r) => {
    const cells: Row = r.split(' ').map((v) => (v === 'x' ? null : Number(v)));
    while (cells.length < 10) cells.push(null);
    return cells;
  });
}

export interface SpellTable {
  id: string;
  name: string;
  kind: 'prepared' | 'spontaneous';
  perDay: Row[];
  known?: Row[];
}

const FULL_PREPARED = rows([
  '3 1', '4 2', '4 2 1', '4 3 2', '4 3 2 1', '4 3 3 2', '4 4 3 2 1', '4 4 3 3 2', '4 4 4 3 2 1', '4 4 4 3 3 2',
  '4 4 4 4 3 2 1', '4 4 4 4 3 3 2', '4 4 4 4 4 3 2 1', '4 4 4 4 4 3 3 2', '4 4 4 4 4 4 3 2 1', '4 4 4 4 4 4 3 3 2',
  '4 4 4 4 4 4 4 3 2 1', '4 4 4 4 4 4 4 3 3 2', '4 4 4 4 4 4 4 4 3 3', '4 4 4 4 4 4 4 4 4 4',
]);

// Cantrips/orisons are at will for spontaneous casters, shown as 0 slots.
const FULL_SPONTANEOUS = rows([
  'x 3', 'x 4', 'x 5', 'x 6 3', 'x 6 4', 'x 6 5 3', 'x 6 6 4', 'x 6 6 5 3', 'x 6 6 6 4', 'x 6 6 6 5 3',
  'x 6 6 6 6 4', 'x 6 6 6 6 5 3', 'x 6 6 6 6 6 4', 'x 6 6 6 6 6 5 3', 'x 6 6 6 6 6 6 4', 'x 6 6 6 6 6 6 5 3',
  'x 6 6 6 6 6 6 6 4', 'x 6 6 6 6 6 6 6 5 3', 'x 6 6 6 6 6 6 6 6 4', 'x 6 6 6 6 6 6 6 6 6',
]);

const FULL_SPONTANEOUS_KNOWN = rows([
  '4 2', '5 2', '5 3', '6 3 1', '6 4 2', '7 4 2 1', '7 5 3 2', '8 5 3 2 1', '8 5 4 3 2', '9 5 4 3 2 1',
  '9 5 5 4 3 2', '9 5 5 4 3 2 1', '9 5 5 4 4 3 2', '9 5 5 4 4 3 2 1', '9 5 5 4 4 4 3 2', '9 5 5 4 4 4 3 2 1',
  '9 5 5 4 4 4 3 3 2', '9 5 5 4 4 4 3 3 2 1', '9 5 5 4 4 4 3 3 3 2', '9 5 5 4 4 4 3 3 3 3',
]);

const SIX_SPONTANEOUS = rows([
  'x 1', 'x 2', 'x 3', 'x 3 1', 'x 4 2', 'x 4 3', 'x 4 3 1', 'x 4 4 2', 'x 5 4 3', 'x 5 4 3 1',
  'x 5 4 4 2', 'x 5 5 4 3', 'x 5 5 4 3 1', 'x 5 5 4 4 2', 'x 5 5 5 4 3', 'x 5 5 5 4 3 1',
  'x 5 5 5 4 4 2', 'x 5 5 5 5 4 3', 'x 5 5 5 5 5 4', 'x 5 5 5 5 5 5',
]);

const SIX_SPONTANEOUS_KNOWN = rows([
  '4 2', '5 3', '6 4', '6 4 2', '6 4 3', '6 4 4', '6 5 4 2', '6 5 4 3', '6 5 4 4', '6 5 5 4 2',
  '6 6 5 4 3', '6 6 5 4 4', '6 6 5 5 4 2', '6 6 6 5 4 3', '6 6 6 5 4 4', '6 6 6 5 5 4 2',
  '6 6 6 6 5 4 3', '6 6 6 6 5 4 4', '6 6 6 6 5 5 4', '6 6 6 6 6 5 5',
]);

const SIX_PREPARED = rows([
  '3 1', '4 2', '4 3', '4 3 1', '4 4 2', '5 4 3', '5 4 3 1', '5 4 4 2', '5 5 4 3', '5 5 4 3 1',
  '5 5 4 4 2', '5 5 5 4 3', '5 5 5 4 3 1', '5 5 5 4 4 2', '5 5 5 5 4 3', '5 5 5 5 4 3 1',
  '5 5 5 5 4 4 2', '5 5 5 5 5 4 3', '5 5 5 5 5 5 4', '5 5 5 5 5 5 5',
]);

const ALCHEMIST = rows([
  'x 1', 'x 2', 'x 3', 'x 3 1', 'x 4 2', 'x 4 3', 'x 4 3 1', 'x 4 4 2', 'x 5 4 3', 'x 5 4 3 1',
  'x 5 4 4 2', 'x 5 5 4 3', 'x 5 5 4 3 1', 'x 5 5 4 4 2', 'x 5 5 5 4 3', 'x 5 5 5 4 3 1',
  'x 5 5 5 4 4 2', 'x 5 5 5 5 4 3', 'x 5 5 5 5 5 4', 'x 5 5 5 5 5 5',
]);

const FOUR_LEVEL = rows([
  'x', 'x', 'x', 'x 0', 'x 1', 'x 1', 'x 1 0', 'x 1 1', 'x 2 1', 'x 2 1 0',
  'x 2 1 1', 'x 2 2 1', 'x 3 2 1 0', 'x 3 2 1 1', 'x 3 2 2 1', 'x 3 3 2 1',
  'x 4 3 2 1', 'x 4 3 2 2', 'x 4 3 3 2', 'x 4 4 3 3',
]);

export const SPELL_TABLES: SpellTable[] = [
  { id: 'wizard', name: 'Wizard / Witch', kind: 'prepared', perDay: FULL_PREPARED },
  { id: 'cleric', name: 'Cleric', kind: 'prepared', perDay: FULL_PREPARED },
  { id: 'druid', name: 'Druid / Shaman', kind: 'prepared', perDay: FULL_PREPARED },
  { id: 'sorcerer', name: 'Sorcerer / Oracle', kind: 'spontaneous', perDay: FULL_SPONTANEOUS, known: FULL_SPONTANEOUS_KNOWN },
  { id: 'bard', name: 'Bard / Hunter / Inquisitor / Skald / Summoner', kind: 'spontaneous', perDay: SIX_SPONTANEOUS, known: SIX_SPONTANEOUS_KNOWN },
  { id: 'magus', name: 'Magus / Warpriest', kind: 'prepared', perDay: SIX_PREPARED },
  { id: 'alchemist', name: 'Alchemist / Investigator (extracts)', kind: 'prepared', perDay: ALCHEMIST },
  { id: 'paladin', name: 'Paladin / Ranger / Antipaladin / Bloodrager', kind: 'prepared', perDay: FOUR_LEVEL },
];

export const SPELL_TABLE_BY_ID: Record<string, SpellTable> = Object.fromEntries(
  SPELL_TABLES.map((t) => [t.id, t]),
);

/** Which table a class preset uses by default. */
export const PRESET_SPELL_TABLE: Record<string, string> = {
  wizard: 'wizard',
  witch: 'wizard',
  cleric: 'cleric',
  druid: 'druid',
  shaman: 'druid',
  sorcerer: 'sorcerer',
  oracle: 'sorcerer',
  bard: 'bard',
  inquisitor: 'bard',
  skald: 'bard',
  hunter: 'bard',
  summoner: 'bard',
  'unchained-summoner': 'bard',
  investigator: 'alchemist',
  magus: 'magus',
  warpriest: 'magus',
  alchemist: 'alchemist',
  paladin: 'paladin',
  ranger: 'paladin',
  antipaladin: 'paladin',
  bloodrager: 'paladin',
};

/** Spell range bands by caster level. */
export function spellRanges(cl: number) {
  return {
    close: 25 + 5 * Math.floor(cl / 2),
    medium: 100 + 10 * cl,
    long: 400 + 40 * cl,
  };
}
