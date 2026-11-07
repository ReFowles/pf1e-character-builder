// Class feature progressions for the importer. Foundry links each class
// feature at the level it's first gained; the levels where it improves or
// repeats come from its scaling formula (evaluated at every class level) and
// from its text ("every four levels thereafter", "at 5th, 10th and 15th
// level"). Prestige classes carry their real class table in the description.

const ORDINAL = /(\d+)(?:st|nd|rd|th)\b/gi;
const WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, other: 2 };

const ordinals = (s: string) => [...s.matchAll(ORDINAL)].map((m) => Number(m[1]));

// --- Formulas ----------------------------------------------------------------
/** Variables that equal the class level when a feature's formula is evaluated for one class. */
const LEVEL_VARS = /@(?:class\.(?:unlevel|level)|attributes\.hd\.total|cl)\b/g;
const FUNCS: Record<string, (...a: number[]) => number> = {
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  abs: Math.abs,
  min: Math.min,
  max: Math.max,
  clamp: (v, lo, hi) => Math.min(Math.max(v, lo), hi),
};

/**
 * A formula of the class level alone as a function, or null when it reads
 * anything else (ability modifiers, BAB, size). The text is whitelisted to
 * numbers, arithmetic and the functions above before it's compiled.
 */
function levelFormula(src: string): ((level: number) => number) | null {
  const body = src.replace(LEVEL_VARS, 'L').trim();
  if (!body || /@/.test(body) || !/^[\w\s+\-*/%().,]*$/.test(body)) return null;
  const ids = body.match(/[a-z_]\w*/gi) ?? [];
  if (!ids.every((id) => id === 'L' || id in FUNCS)) return null;
  if (!ids.includes('L')) return null;
  try {
    const fn = new Function(...Object.keys(FUNCS), 'L', `return (${body});`);
    const f = (level: number) => Number(fn(...Object.values(FUNCS), level));
    return Number.isFinite(f(1)) ? f : null;
  } catch {
    return null;
  }
}

interface Scaling {
  /** Displayed value at a level, e.g. "+2d6", "+3", "4/day". */
  at: (level: number) => string;
  /** Levels where the value changes, from the first. */
  changes: number[];
}

/** The first of a feature's formulas that scales with class level alone (damage dice, then changes, then uses). */
function scaling(sys: Record<string, any>, first: number, max: number): Scaling | null {
  const candidates: { formula: string; format: (n: number) => string }[] = [];
  for (const a of Object.values<any>(sys.actions ?? {})) {
    for (const p of a?.damage?.parts ?? []) {
      const f = String(Array.isArray(p) ? p[0] : (p?.formula ?? ''));
      const m = f.match(/^\s*\((.+)\)\s*d\s*(\d+)\s*$/) ?? f.match(/^\s*([^d]+?)\s*d\s*(\d+)\s*$/);
      if (m) candidates.push({ formula: m[1], format: (n) => `+${n}d${m[2]}` });
    }
  }
  for (const c of Object.values<any>(sys.changes ?? {})) {
    // Feat counts aren't worth a number in the table ("Bonus feat", not "Bonus feats +6").
    if (c?.formula && c.target !== 'bonusFeats') candidates.push({ formula: String(c.formula), format: (n) => (n >= 0 ? `+${n}` : `${n}`) });
  }
  if (sys.uses?.maxFormula) {
    const per = sys.uses.per === 'day' ? '/day' : '';
    candidates.push({ formula: String(sys.uses.maxFormula), format: (n) => `${n}${per}` });
  }
  for (const c of candidates) {
    const f = levelFormula(c.formula);
    if (!f) continue;
    const changes = [first];
    for (let l = first + 1; l <= max; l++) if (f(l) !== f(l - 1)) changes.push(l);
    // A value that grows every level (SR 10 + level) isn't a table entry per level.
    const everyLevel = changes.length > 4 && changes.slice(-4).every((l, i, a) => i === 0 || l === a[i - 1] + 1);
    if (changes.length < 2 || everyLevel) continue;
    return { at: (l) => c.format(f(l)), changes };
  }
  return null;
}

// --- Text ----------------------------------------------------------------------
/** Sentences that talk about requirements rather than when the feature arrives. */
const NOT_PROGRESSION = /\b(?:must be|at least|minimum|prerequisite|caster level|character level|hit dice)\b/i;

/** Levels the text says the feature repeats or improves at, after `first`. */
export function textLevels(plain: string, first: number, max: number): number[] {
  const out = new Set<number>();
  let cap = max;
  for (const sentence of plain.split(/(?<=[.!?])\s+/)) {
    if (NOT_PROGRESSION.test(sentence)) continue;
    const upTo = sentence.match(/\bup to (\d+)(?:st|nd|rd|th) level\b/i) ?? sentence.match(/\bmaximum of [^.]*? at (\d+)(?:st|nd|rd|th) level\b/i);
    if (upTo) cap = Math.min(cap, Number(upTo[1]));
    // "every four levels thereafter", "every 2 levels of rogue attained after 2nd level", "every even level thereafter".
    const every = sentence.match(/\b(?:every|each)\s+(\w+)(?:-numbered)?\s+(?:[a-z]+\s+)?levels?\b(?:\s+of\s+[\w ]+?)?(?:\s+(?:thereafter|after|beyond|attained|gained)(?:\s+(?:after\s+)?(\d+)(?:st|nd|rd|th))?)?/i);
    if (every) {
      const w = every[1].toLowerCase();
      const from = every[3] ? Number(every[3]) : first;
      if (w === 'even' || w === 'odd') {
        for (let l = from + 1; l <= max; l++) if (l % 2 === (w === 'even' ? 0 : 1)) out.add(l);
      } else {
        const step = WORDS[w] ?? Number(w);
        if (step >= 2) for (let l = from + step; l <= max; l += step) out.add(l);
      }
    }
    // Runs of two or more ordinals: "(9th, 13th, and 17th)", "At 5th, 10th, 15th, and 20th level".
    for (const run of sentence.matchAll(/\d+(?:st|nd|rd|th)\*?(?:,?\s*(?:and|or)?\s*\d+(?:st|nd|rd|th)\*?)+/gi)) {
      for (const l of ordinals(run[0])) out.add(l);
    }
  }
  return [...out].filter((l) => l > first && l <= cap).sort((a, b) => a - b);
}

export interface FeatureLevels {
  levels: number[];
  /** Per-level labels when the feature's value scales; omitted otherwise. */
  labels?: string[];
}

/** Levels a linked feature is gained and improves at, with its values when its formula scales. */
export function featureLevels(name: string, sys: Record<string, any>, plain: string, first: number, max: number): FeatureLevels {
  const s = scaling(sys, first, max);
  const levels = s ? s.changes : [first, ...textLevels(plain, first, max)];
  return s ? { levels, labels: levels.map((l) => `${name} ${s.at(l)}`) } : { levels };
}

/** "Bonus Feats (FGT)" → "Bonus Feats": Foundry's class abbreviations; "Armor Training (Heavy Armor)" keeps its qualifier. */
export const baseName = (name: string) => name.replace(/\s*\([A-Z]{2,4}\)\s*$/, '').trim();

/** "Weapon Training (Two-Handed Fighter)" → "Weapon Training": archetype features end with the archetype's name. */
export const archetypeFeatureName = (name: string) => name.replace(/\s*\([^)]*\)\s*$/, '').trim();

/** Name key for matching features across sources: lowercase, no abbreviations or punctuation, singular words. */
export const featureKey = (name: string) =>
  baseName(name)
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(\w+?)(ies|s)\b/g, (_, w: string, end: string) => (end === 'ies' ? `${w}y` : w))
    .trim();

// --- Archetype replacements -----------------------------------------------------------
export interface Replacement {
  name: string;
  levels?: number[];
}

/**
 * Base class features an archetype feature replaces, from its "This ability
 * replaces …" sentences. Links resolve by id; plain names match the base
 * class's feature names. Ordinals in the phrase ("the discoveries gained at
 * 6th and 12th level") and instance numbers ("armor training 1", the
 * feature's first step) limit the replacement to those levels.
 */
export function replacements(html: string, base: { id?: string; name: string; levels: number[] }[]): Replacement[] {
  const out: Replacement[] = [];
  const flat = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  for (const m of flat.matchAll(/\b(?:replaces?|in place of)\b([^.;]*)/gi)) {
    let phrase = m[1];
    const hits = new Map<string, number[] | undefined>();
    // Linked names first: @UUID[Compendium.pf1.class-abilities.Item.<id>]{label}.
    for (const link of phrase.matchAll(/@UUID\[[^\]]*?\.([A-Za-z0-9]{16})\](?:\{([^}]*)\})?/g)) {
      const f = base.find((b) => b.id === link[1]) ?? (link[2] ? base.find((b) => featureKey(b.name) === featureKey(link[2])) : undefined);
      if (f) hits.set(f.name, undefined);
    }
    phrase = phrase.replace(/@UUID\[[^\]]*\](?:\{([^}]*)\})?/g, ' ');
    const key = ` ${featureKey(phrase)} `;
    // Longest names first, so "improved uncanny dodge" isn't also read as "uncanny dodge".
    let rest = key;
    for (const f of [...base].sort((a, b) => b.name.length - a.name.length)) {
      const k = ` ${featureKey(f.name)} `;
      if (k.trim().length < 3 || !rest.includes(k)) continue;
      const steps = rest.match(new RegExp(`${k}((?:\\d{1,2} (?:and )?)+)`))?.[1].match(/\d+/g)?.map((n) => f.levels[Number(n) - 1]).filter((l) => l);
      rest = rest.replace(k, ' ');
      hits.set(f.name, steps?.length ? steps : undefined);
    }
    const levels = ordinals(phrase);
    for (const [name, steps] of hits) out.push(steps ? { name, levels: steps } : levels.length && hits.size === 1 ? { name, levels } : { name });
  }
  // One entry per base feature; a whole-feature replacement wins over a partial one.
  const merged = new Map<string, Replacement>();
  for (const r of out) {
    const prev = merged.get(r.name);
    if (!prev) merged.set(r.name, r);
    else if (!prev.levels || !r.levels) merged.set(r.name, { name: r.name });
    else merged.set(r.name, { name: r.name, levels: [...new Set([...prev.levels, ...r.levels])].sort((a, b) => a - b) });
  }
  return [...merged.values()];
}

// --- Prestige class tables ----------------------------------------------------------
export interface TableRow {
  bab: string;
  fort: string;
  ref: string;
  will: string;
  special: string[];
  spells: string;
}

const cellText = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&ndash;|&mdash;/g, '—')
    .replace(/\s+/g, ' ')
    .trim();

/** Split "Aura of law, sneak attack +1d6 (see text), order" on commas outside parentheses. */
function splitSpecial(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of s) {
    if (ch === '(') depth++;
    if (ch === ')') depth = Math.max(0, depth - 1);
    if ((ch === ',' || ch === ';') && !depth) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out.map((x) => x.trim()).filter((x) => x && !/^[—–-]+$/.test(x));
}

/** The class table in a prestige class description: one row per level. */
export function prestigeTable(html: string): TableRow[] {
  const table = html.match(/<table[\s\S]*?<\/table>/i)?.[0];
  if (!table) return [];
  const rows = [...table.matchAll(/<tr[\s\S]*?<\/tr>/gi)].map((r) => [...r[0].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => cellText(c[1])));
  const head = rows.find((r) => r.some((c) => /^level$/i.test(c)));
  if (!head) return [];
  const col = (re: RegExp) => head.findIndex((c) => re.test(c));
  const ix = { bab: col(/base attack/i), fort: col(/^fort/i), ref: col(/^ref/i), will: col(/^will/i), special: col(/^special/i), spells: col(/spells/i) };
  const lvl = col(/^level$/i);
  const out: TableRow[] = [];
  for (const r of rows) {
    const n = Number(r[lvl]?.match(/^(\d+)(?:st|nd|rd|th)?$/i)?.[1]);
    if (n !== out.length + 1) continue;
    const at = (i: number) => (i >= 0 ? (r[i] ?? '') : '');
    const spells = at(ix.spells);
    out.push({ bab: at(ix.bab), fort: at(ix.fort), ref: at(ix.ref), will: at(ix.will), special: splitSpecial(at(ix.special)), spells: /^[—–-]*$/.test(spells) ? '' : spells });
  }
  return out;
}

/** "Sneak attack +2d6" → "sneak attack"; "Signifer armor training 2" → "signifer armor training". */
export const specialKey = (s: string) =>
  featureKey(
    s
      .replace(/\s*\([^)]*\)/g, '')
      .replace(/\s+[+−-]?\d+(?:d\d+)?(?:\/(?:day|round))?(?:\s*(?:ft\.?|feet))?$/i, '')
      .replace(/\s+(?:\d+\/day|[ivx]+)$/i, ''),
  );

/** Feature descriptions in a prestige class description: paragraphs that open with a bold name. */
export function boldParagraphs(html: string, plain: (h: string) => string): Map<string, { name: string; text: string }> {
  const out = new Map<string, { name: string; text: string }>();
  const after = html.replace(/<table[\s\S]*?<\/table>/gi, '');
  let current: { name: string; text: string } | null = null;
  for (const p of after.split(/<\/p>/i)) {
    const m = p.match(/^\s*<p[^>]*>\s*<strong>([^<]{2,80})<\/strong>\s*:?([\s\S]*)$/i);
    if (m) {
      const name = m[1].replace(/:$/, '').trim();
      current = { name, text: plain(m[2]).replace(/^:\s*/, '') };
      out.set(featureKey(name.replace(/\s*\((?:Ex|Su|Sp)\)/i, '')), current);
    } else if (current) {
      const t = plain(p);
      if (t) current.text += `\n${t}`;
    }
  }
  return out;
}

// --- Tables inside feature descriptions ----------------------------------------------
export interface FeatureTable {
  title: string;
  head: string[];
  rows: string[][];
}

/** The description with its HTML tables taken out, and the tables as data (the Unarmed Strike damage table). */
export function extractTables(html: string): { html: string; tables: FeatureTable[] } {
  const tables: FeatureTable[] = [];
  const rest = html.replace(/<table[\s\S]*?<\/table>/gi, (t) => {
    const title = cellText(t.match(/<caption[^>]*>([\s\S]*?)<\/caption>/i)?.[1] ?? '').replace(/^table:\s*/i, '');
    const rows = [...t.matchAll(/<tr[\s\S]*?<\/tr>/gi)].map((r) => ({
      header: !/<td/i.test(r[0]),
      cells: [...r[0].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => cellText(c[1])),
    }));
    const head = rows[0]?.header ? rows.shift()!.cells : [];
    const body = rows.map((r) => r.cells).filter((r) => r.some(Boolean));
    if (body.length) tables.push({ title, head, rows: body });
    return '';
  });
  return { html: rest, tables };
}
