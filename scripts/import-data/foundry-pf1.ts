// Convert Foundry VTT PF1 compendium packs (OGL 1.0a game content) into
// compact JSON for the app. Run against extracted copies (see README,
// "Rebuilding the rules data"):
//
//   node scripts/import-data/foundry-pf1.ts <system>/packs \
//     [--content <pf1-content>/src] [--archetypes <pf1e-archetypes>/src] \
//     [--ogl-content <file>] [--ogl-archetypes <file>]
//
// Each root's OGL text defaults to <root>/../OGL.txt.
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { parse } from 'yaml';
import type { DbClass, DbCompanion, DbEvolution, DbFeat, DbItem, DbSpell } from '../../src/lib/db/types.ts';

const { values: opts, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    content: { type: 'string' },
    archetypes: { type: 'string' },
    'ogl-content': { type: 'string' },
    'ogl-archetypes': { type: 'string' },
  },
});
const root = positionals[0];
if (!root) throw new Error('usage: node scripts/import-data/foundry-pf1.ts <packs-dir> [--content <dir>] [--archetypes <dir>]');
const out = 'public/data';
mkdirSync(out, { recursive: true });

type Doc = { name: string; type: string; system: Record<string, any>; items?: Doc[] };

function* walk(dir: string): Generator<string> {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (f.endsWith('.yaml') && !f.startsWith('_')) yield p;
  }
}

function load(pack: string, base = root): Doc[] {
  const docs: Doc[] = [];
  for (const file of walk(join(base, pack))) {
    const d = parse(readFileSync(file, 'utf8')) as Doc;
    if (d?.name && d.system) docs.push(d);
  }
  return docs;
}

/** Counts of fallbacks taken where the source data lacks a field; reported at the end. */
const fallbacks: Record<string, number> = {};
const fallback = (what: string) => (fallbacks[what] = (fallbacks[what] ?? 0) + 1);

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', times: '×', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', frac12: '½' };

/** HTML to plain text, keeping paragraph breaks. Foundry inline rolls become their label. */
function text(html: unknown, max = 1500): string {
  if (typeof html !== 'string') return '';
  let s = html
    .replace(/\r/g, '')
    .replace(/\[\[[^\]]*?\[([^\]]+)\]\]\]/g, '$1')
    .replace(/@\w+\[[^\]]*\]\{([^}]*)\}/g, '$1')
    .replace(/@\w+\[([^\]]*)\]/g, '$1')
    .replace(/<\/?(p|li|h\d|tr|div)(\s[^>]*)?>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&(#\d+|\w+);/g, (m, e) => (e[0] === '#' ? String.fromCharCode(Number(e.slice(1))) : (ENTITIES[e] ?? m)))
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
  if (s.length > max) s = s.slice(0, max).replace(/\s+\S*$/, '') + '…';
  return s;
}

/** First sentence of a plain-text passage, for summaries. */
const firstSentence = (s: string) => (s.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? s.split('\n')[0]).trim();

const source = (sys: Record<string, any>) => (sys.sources ?? []).map((x: any) => x.id + (x.pages ? ` p${x.pages}` : '')).join(', ');
const firstAction = (sys: Record<string, any>) => Object.values(sys.actions ?? {})[0] as Record<string, any> | undefined;
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const RANGE: Record<string, string> = { close: 'close', medium: 'medium', long: 'long', touch: 'touch', personal: 'personal', melee: 'melee', reach: 'reach', unlimited: 'unlimited', seeText: 'see text' };
function range(r: any): string {
  if (!r?.units) return '';
  if (RANGE[r.units]) return RANGE[r.units];
  return [r.value, r.units].filter(Boolean).join(' ');
}

const DURATION: Record<string, string> = { inst: 'instantaneous', perm: 'permanent', spec: 'see text', seeText: 'see text', turn: 'turn', round: 'round', minute: 'minute', hour: 'hour', day: 'day', month: 'month', year: 'year' };
function duration(d: any): string {
  if (!d?.units) return '';
  const unit = DURATION[d.units] ?? d.units;
  const v = String(d.value ?? '').trim();
  if (!v) return unit;
  // Free-text durations ("concentration, up to 1 round/level") are stored with a "see text" unit.
  if (d.units === 'spec' || d.units === 'seeText') return v;
  const perLevel = v.replace(/@cl/g, 'level').replace(/\s+/g, ' ');
  if (perLevel === 'level') return `1 ${unit}/level`;
  const scaled = perLevel.match(/^(\d+)\s*\*\s*level$/);
  if (scaled) return `${scaled[1]} ${unit}s/level`;
  if (/level/.test(perLevel)) return `${perLevel} ${unit}s`;
  return `${v} ${unit}${v === '1' ? '' : 's'}`;
}

const SCHOOLS: Record<string, string> = { abj: 'abjuration', con: 'conjuration', div: 'divination', enc: 'enchantment', evo: 'evocation', ill: 'illusion', nec: 'necromancy', trs: 'transmutation', uni: 'universal' };

// --- Spells ------------------------------------------------------------------
const spells: DbSpell[] = load('spells').map((d) => {
  const s = d.system;
  const a = firstAction(s) ?? {};
  const comp = s.components ?? {};
  const components = [comp.verbal && 'V', comp.somatic && 'S', comp.material && 'M', comp.focus && 'F', comp.divineFocus && 'DF'].filter(Boolean).join(', ');
  return {
    name: d.name,
    school: SCHOOLS[s.school] ?? s.school ?? '',
    levels: { ...(s.learnedAt?.class ?? {}) },
    components,
    castingTime: [a.activation?.cost, a.activation?.type].filter(Boolean).join(' '),
    range: range(a.range),
    target: a.target?.value ?? a.effect ?? a.area ?? '',
    duration: duration(a.duration),
    save: a.save?.description ?? (a.save?.type ? `${a.save.type} negates` : 'none'),
    // Foundry stores `sr` only when false; spells allow SR by default.
    sr: s.sr === false ? 'no' : 'yes',
    summary: text(s.description?.summary, 200),
    description: text(s.description?.value),
    source: source(s),
  };
});

// --- Feats -------------------------------------------------------------------
function feat(d: Doc): DbFeat {
  const description = text(d.system.description?.value);
  let summary = text(d.system.description?.summary, 200);
  if (!summary) {
    // pf-content feats have no summary; use the first sentence of the "Benefit(s):" paragraph.
    const benefit = description.match(/Benefits?:\s*([^\n]+)/)?.[1];
    summary = text(firstSentence(benefit ?? ''), 200);
  }
  return { name: d.name, tags: d.system.tags ?? [], summary, description, source: source(d.system) };
}

// The system pack goes first so the by-name dedupe below keeps its entries (they carry sources).
const feats: DbFeat[] = [
  ...load('feats').filter((d) => d.system.subType === 'feat' || !d.system.subType),
  ...(opts.content ? load('pf-feats', opts.content).filter((d) => d.type === 'feat') : []),
].map(feat);

// --- Items, weapons, armor ---------------------------------------------------
function price(p: any): string {
  if (!p?.base) return '';
  return `${p.base} ${p.unit ?? 'gp'}`;
}

const HAND: Record<string, string> = { light: 'light', '1h': 'one-handed', '2h': 'two-handed', ranged: 'ranged' };
const ARMOR_CAT: Record<string, string> = { lightArmor: 'light', mediumArmor: 'medium', heavyArmor: 'heavy', lightShield: 'light shield', heavyShield: 'heavy shield', towerShield: 'tower', buckler: 'buckler', other: '' };

/** "sizeRoll(1, 6, @size)" → "1d6". */
const dice = (formula: unknown) => String(formula ?? '').replace(/sizeRoll\((\d+),\s*(\d+).*\)/, '$1d$2');

function item(d: Doc): DbItem | null {
  const s = d.system;
  const base: DbItem = {
    name: d.name,
    category: d.type === 'loot' ? (s.subType ?? 'gear') : d.type,
    slot: s.slot && s.slot !== 'slotless' ? s.slot : s.slot === 'slotless' ? 'slotless' : '',
    weight: Number(s.weight?.value ?? 0) || 0,
    price: price(s.price),
    summary: text(s.description?.summary, 200),
    description: text(s.description?.value ?? s.description?.unidentified, 800),
    source: source(s),
  };
  if (d.type === 'weapon') {
    const a = firstAction(s) ?? {};
    base.weapon = {
      damage: dice(a.damage?.parts?.[0]?.formula),
      crit: `${a.ability?.critRange && a.ability.critRange < 20 ? `${a.ability.critRange}-20/` : ''}×${a.ability?.critMult ?? 2}`,
      range: Number(a.range?.value) > 0 ? `${a.range.value} ft` : '',
      type: (a.damage?.parts?.[0]?.types ?? []).map((t: string) => t[0].toUpperCase()).join('/'),
      handedness: HAND[s.weaponSubtype] ?? s.weaponSubtype ?? '',
      proficiency: s.subType ?? '',
    };
  }
  if (d.type === 'equipment' && (s.subType === 'armor' || s.subType === 'shield')) {
    const isShield = s.subType === 'shield';
    base.category = isShield ? 'shield' : 'armor';
    base.armor = {
      kind: isShield ? 'shield' : 'armor',
      ac: Number(s.armor.value ?? 0),
      maxDex: s.armor.dex === null || s.armor.dex === undefined || s.armor.dex === '' ? null : Number(s.armor.dex),
      acp: -Math.abs(Number(s.armor.acp ?? 0)),
      asf: Number(s.spellFailure ?? 0),
      category: ARMOR_CAT[s.equipmentSubtype] ?? '',
    };
  } else if (d.type === 'equipment') {
    base.category = 'magic';
  }
  return base;
}

const items: DbItem[] = ['items', 'ultimate-equipment', 'weapons-and-ammo', 'armors-and-shields']
  .flatMap((p) => load(p))
  .map(item)
  .filter((x): x is DbItem => !!x);

// --- Classes -----------------------------------------------------------------
// Class skill keys as the app stores them (src/lib/rules/skills.ts). The
// system pack uses full names ("knowledge.arcana"); pf1e-archetypes uses
// Foundry's three-letter codes. Note "kno" is Knowledge (nobility) in that
// data (verified against the class descriptions), not "all knowledges".
const APP_SKILLS = new Set(['acrobatics', 'appraise', 'bluff', 'climb', 'craft', 'diplomacy', 'disableDevice', 'disguise', 'escapeArtist', 'fly', 'handleAnimal', 'heal', 'intimidate', 'knowledge', 'linguistics', 'perception', 'perform', 'profession', 'ride', 'senseMotive', 'sleightOfHand', 'spellcraft', 'stealth', 'survival', 'swim', 'useMagicDevice']);
const SKILL_CODES: Record<string, string> = {
  acr: 'acrobatics', apr: 'appraise', blf: 'bluff', clm: 'climb', crf: 'craft', dev: 'disableDevice', dip: 'diplomacy', dis: 'disguise',
  esc: 'escapeArtist', fly: 'fly', han: 'handleAnimal', hea: 'heal', int: 'intimidate', kar: 'knowledge:arcana', kdu: 'knowledge:dungeoneering',
  ken: 'knowledge:engineering', kge: 'knowledge:geography', khi: 'knowledge:history', klo: 'knowledge:local', kna: 'knowledge:nature',
  kno: 'knowledge:nobility', kpl: 'knowledge:planes', kre: 'knowledge:religion', lin: 'linguistics', per: 'perception', prf: 'perform',
  pro: 'profession', rid: 'ride', sen: 'senseMotive', slt: 'sleightOfHand', spl: 'spellcraft', ste: 'stealth', sur: 'survival', swm: 'swim',
  umd: 'useMagicDevice',
};
// Background skills from Pathfinder Unchained that the sheet does not track.
const IGNORED_SKILLS = new Set(['artistry', 'lore']);
const unknownSkills = new Set<string>();

function classSkill(code: string): string | null {
  if (SKILL_CODES[code]) return SKILL_CODES[code];
  const [skill, sub] = code.split('.');
  if (APP_SKILLS.has(skill)) return sub ? `${skill}:${slug(sub)}` : skill;
  if (!IGNORED_SKILLS.has(code)) unknownSkills.add(code);
  return null;
}

const BAB: Record<string, DbClass['bab']> = { high: 'full', med: '3/4', low: '1/2' };
const NPC_CLASSES = new Set(['adept', 'aristocrat', 'commoner', 'expert', 'warrior']);

function cls(d: Doc, kind: DbClass['kind']): DbClass {
  const s = d.system;
  const saves = (['fort', 'ref', 'will'] as const).filter((k) => s.savingThrows?.[k]?.value === 'high');
  const c: DbClass = {
    id: slug(d.name),
    name: d.name,
    kind,
    hd: Number(s.hd ?? 8) || 8,
    bab: BAB[s.bab] ?? '3/4',
    goodSaves: saves,
    skillRanks: Number(s.skillsPerLevel ?? 2) || 2,
    classSkills: [...new Set<string>((s.classSkills ?? []).map(classSkill).filter((x: string | null): x is string => !!x))],
    summary: text(s.description?.summary, 200),
    source: source(s),
  };
  if (!BAB[s.bab]) fallback('class bab');
  if (s.casting?.ability) c.castingAbility = s.casting.ability;
  if (s.casting) c.casting = { type: String(s.casting.type ?? ''), progression: String(s.casting.progression ?? ''), spells: String(s.casting.spells ?? '') };
  return c;
}

const classes: DbClass[] = [
  ...load('classes')
    .filter((d) => d.type === 'class' && d.system.subType !== 'npc' && !NPC_CLASSES.has(slug(d.name)))
    .map((d) => cls(d, /unchained/i.test(d.name) ? 'unchained' : 'base')),
  ...(opts.archetypes ? load('pf-prestige-classes', opts.archetypes).filter((d) => d.type === 'class').map((d) => cls(d, 'prestige')) : []),
];

// --- Companions (animal companions and familiars) ----------------------------
const SIZES: Record<string, string> = { fine: 'fine', dim: 'diminutive', tiny: 'tiny', sm: 'small', med: 'medium', lg: 'large', huge: 'huge', grg: 'gargantuan', col: 'colossal' };
/** Size from the AC line's size modifier. */
const SIZE_MOD: Record<string, string> = { '+8': 'fine', '+4': 'diminutive', '+2': 'tiny', '+1': 'small', '+0': 'medium', '-1': 'large', '-2': 'huge', '-4': 'gargantuan', '-8': 'colossal' };
const SENSES: Record<string, string> = { ll: 'low-light vision', dv: 'darkvision', sc: 'scent', ts: 'tremorsense', bs: 'blindsense', bse: 'blindsense', bl: 'blindsight', si: 'see invisibility', sid: 'see in darkness', tr: 'true seeing' };
const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;

/** Plain text of an actor's notes. pf-content familiars end with a "RAW INPUT" copy of the stat block; it is the most complete part. */
function notes(d: Doc): { base: string; raw: string; advancement: string } {
  const all = text(d.system.details?.notes?.value, 20000);
  const adv = all.search(/^Advancement\b/m);
  const raw = all.indexOf('RAW INPUT');
  return {
    base: all.slice(0, adv >= 0 ? adv : raw >= 0 ? raw : undefined),
    raw: raw >= 0 ? all.slice(raw + 'RAW INPUT'.length) : all,
    advancement: adv >= 0 ? all.slice(adv) : '',
  };
}

/** "Str : 13, Dex : 15" or "Str 6, Dex 17" from a stat block. */
const notedAbility = (s: string, a: string) => Number(s.match(new RegExp(`\\b${a[0].toUpperCase()}${a.slice(1)}\\s*:?\\s*(\\d+)`))?.[1]);

/** Familiar stat-block speed line: "Speed 10 ft., fly 60 ft. (average)". */
const notedSpeed = (raw: string) => raw.match(/\bSpeed:?\s+(\d+ ft\.?[^\n]*?)(?=\s+(?:Melee|Ranged|Space|Special|Spell|Statistics)\b|\n|$)/)?.[1]?.replace(/\bft\./g, 'ft').replace(/\s*;\s*$/, '').trim();

function speed(d: Doc, raw: string): string {
  const sp = d.system.attributes?.speed;
  if (sp) {
    const parts: string[] = [];
    if (sp.land?.base > 0) parts.push(`${sp.land.base} ft`);
    else {
      // Some actors only record the special movement modes; the land speed is in the stat block.
      const land = notedSpeed(raw)?.match(/^(\d+ ft)/)?.[1];
      if (land) { parts.push(land); fallback('companion land speed from notes'); }
    }
    for (const k of ['fly', 'swim', 'climb', 'burrow']) {
      if (!(sp[k]?.base > 0)) continue;
      parts.push(`${k} ${sp[k].base} ft${k === 'fly' && sp[k].maneuverability ? ` (${sp[k].maneuverability})` : ''}`);
    }
    if (parts.length) return parts.join(', ');
  }
  const m = notedSpeed(raw);
  fallback(m ? 'companion speed from notes' : 'companion speed missing');
  return m ?? '';
}

/** Base damage dice of a natural attack: "sizeRoll(1, 6, @size)" → "1d6", "1d3+-4" → "1d3", "0d0+6" → "". */
const naturalDice = (formula: unknown) => dice(formula).replace(/^(\d+d\d+)(?:\+-?\d+)?$/, '$1').replace(/^0d0.*$/, '');

/** "plus trip" riders from an attack's footer notes or its name ("Bite (plus grab)"); stat-line restatements ("bite +4 (1d4 plus disease)") contribute only their rider. */
function riders(name: string, footer: unknown[]): string[] {
  const out: string[] = [];
  for (const raw of [name.match(/\((.*)\)/)?.[1], ...footer.map((n: any) => (typeof n === 'string' ? n : n?.text))]) {
    if (typeof raw !== 'string') continue;
    let f = raw.trim();
    const stat = f.match(/^[^()]*[+-]\d+\s*\(([^)]*)\)$/);
    if (stat) f = stat[1].replace(/^\d+d\d+(?:[+-]\d+)?(?:\/\d+-\d+)?\s*/, '');
    f = f.toLowerCase();
    if (!f || /^(reach:|\d)/.test(f)) continue;
    if (!/^(plus|and|or)\b/.test(f)) f = `plus ${f}`;
    if (!out.includes(f)) out.push(f);
  }
  return out;
}

/** Natural attacks from embedded attack items; the stat line in the notes supplies the count ("2 claws"). */
function attacks(d: Doc, base: string, raw: string): DbCompanion['attacks'] {
  const list = (d.items ?? []).filter((i) => i.type === 'attack');
  if (list.length) {
    return list.map((i) => {
      const a = firstAction(i.system) ?? {};
      const lower = i.name.replace(/\s*\(.*\)\s*$/, '').toLowerCase();
      const damage = [naturalDice(a.damage?.parts?.[0]?.formula), ...riders(i.name, a.notes?.footer ?? [])].filter(Boolean).join(' ');
      const count = Number((base || raw).match(new RegExp(`(?<![+\\-\\d])\\b(\\d+) ${lower.replace(/s$/, '')}s?\\b`, 'i'))?.[1]);
      const attack: DbCompanion['attacks'][number] = { name: count > 1 ? `${count} ${lower}` : lower, damage };
      if (i.system.primaryAttack === false || i.system.naturalAttack?.primaryAttack === false) attack.secondary = true;
      return attack;
    });
  }
  // Fallbacks: "Attacks: bite (1d6 plus trip), 2 claws (1d4)" (companions) or "Melee 2 talons +5 (1d4-2)" (familiars).
  const line = base.match(/\bAttacks?[ \t]*:[ \t]*([^\n]+)/)?.[1] ?? raw.match(/\bMelee\s+([^\n]+?)(?=\s+(?:Ranged|Space|Special|Spell|Statistics)\b|\n|$)/)?.[1] ?? '';
  const parsed = [...line.matchAll(/([^,()]+?)\s*(?:[+-]\d+\s*)?\(([^)]*)\)/g)].map((m) => ({ name: m[1].trim().toLowerCase(), damage: m[2].replace(/^(\d+d\d+)[+-]\d+/, '$1').trim() }));
  fallback(parsed.length ? 'companion attacks from notes' : 'companion attacks missing');
  return parsed;
}

function senses(d: Doc): string {
  const s = d.system.traits?.senses ?? {};
  const parts: string[] = [];
  for (const [k, v] of Object.entries<any>(s)) {
    if (k === 'custom' || !v) continue;
    if (!SENSES[k]) { fallback(`unknown sense code ${k}`); continue; }
    if (typeof v === 'object' && !(v.enabled || v.value > 0)) continue;
    parts.push(v?.value > 0 ? `${SENSES[k]} ${v.value} ft` : SENSES[k]);
  }
  // Familiars store a free-text senses line, often with a skill tacked on: "low-light vision; Perception +10".
  if (typeof s.custom === 'string' && s.custom.trim()) parts.push(...s.custom.replace(/;?\s*Perception [+-]\d+.*$/i, '').split(/[;,]\s*/));
  const seen = new Set<string>();
  return parts
    .map((p) => p.replace(/\bft\./g, 'ft').trim().toLowerCase())
    .filter((p) => p && (seen.has(p) ? false : (seen.add(p), true)))
    .join(', ');
}

/** Split a comma list, ignoring commas inside parentheses. */
const splitList = (s: string) => s.split(/,\s*(?![^()]*\))/).map((x) => x.trim()).filter(Boolean);

function special(d: Doc, base: string, raw: string, sensesText: string): string[] {
  const list: string[] = [];
  // Values end at the line or at a "; Languages …" tail; a label with no value ("Special Attacks:") yields nothing.
  const grab = (s: string, re: RegExp) => splitList((s.match(re)?.[1] ?? '').replace(/;\s*Languages?\b.*$/i, '')).filter((x) => !/^[A-Z][a-z]+( [A-Z][a-z]+)?[ \t]*:/.test(x));
  // Companion notes: "Special Attacks: rake (1d4)" and "Special Qualities: low-light vision, scent".
  list.push(...grab(base, /Special Attacks?[ \t]*:[ \t]*([^\n]*)/), ...grab(base, /Special Qualities[ \t]*:[ \t]*([^\n]*)/));
  // Familiar stat blocks: "Special Attacks …" before the spell lists or Statistics, "SQ …" before Ecology.
  list.push(...grab(raw, /\bSpecial Attacks\s+(.+?)(?=\s+(?:Spell-Like|Psychic Magic|Spells|Statistics|Str)\b)/), ...grab(raw, /\bSQ\s+(.+?)(?=\s+(?:Ecology|Description|Environment)\b)/));
  for (const i of d.items ?? []) {
    if (i.type !== 'feat') continue;
    const m = i.name.match(/^(?:Special Quality|Aura|Defensive Ability|Special Attack):\s*(.+)$/i);
    if (m) list.push(m[1]);
  }
  const seen = new Set<string>();
  return list
    .map((x) => x.toLowerCase().replace(/\bft\./g, 'ft').replace(/\.$/, ''))
    .filter((x) => !sensesText.toLowerCase().includes(x))
    .filter((x) => (seen.has(x) ? false : (seen.add(x), true)));
}

function companion(d: Doc, kind: DbCompanion['kind']): DbCompanion {
  const s = d.system;
  const n = notes(d);
  const abilities = {} as DbCompanion['abilities'];
  for (const a of ABILITIES) {
    const v = s.abilities?.[a]?.value;
    if (typeof v === 'number') abilities[a] = v;
    else {
      const noted = notedAbility(n.base, a) || notedAbility(n.raw, a);
      abilities[a] = noted || 10;
      fallback(noted ? 'companion ability from notes' : 'companion ability defaulted to 10');
    }
  }
  let size = SIZES[s.traits?.size] ?? '';
  if (!size) {
    // Familiar stat blocks open with "N Tiny Animal" or at least show the size modifier in the AC
    // line. Companion notes only give the size after advancement, so the base section is searched
    // alone and falls back to Foundry's default size, medium.
    const noted = n.base.match(/\b(Fine|Diminutive|Tiny|Small|Medium|Large|Huge|Gargantuan|Colossal)\b/)?.[1]
      ?? SIZE_MOD[n.base.match(/\(.*?([+-]\d+) size\)/)?.[1] ?? ''];
    size = (noted ?? 'Medium').toLowerCase();
    fallback(noted ? 'companion size from notes' : 'companion size defaulted to medium');
  }
  let naturalArmor = s.attributes?.naturalAC;
  if (typeof naturalArmor !== 'number') {
    // Familiar stat blocks: "AC 16, touch 15, flat-footed 13 (+3 Dex, +1 natural, +2 size)".
    const noted = Number(n.raw.match(/\+(\d+) natural\b/)?.[1]);
    naturalArmor = noted || 0;
    fallback(noted ? 'companion natural armor from notes' : 'companion natural armor defaulted to 0');
  }
  const sensesText = senses(d);
  const advancement = n.advancement
    .split('\n')
    .map((l) => l.replace(/\s+:/g, ':').trim())
    .filter((l) => l && !/^[^:]+:(\s*NULL)?$/.test(l))
    .join('\n');
  return {
    name: d.name,
    kind,
    size,
    speed: speed(d, n.raw),
    naturalArmor,
    abilities,
    attacks: attacks(d, n.base, n.raw),
    senses: sensesText,
    special: special(d, n.base, n.raw, sensesText),
    advancement: kind === 'animal' ? text(advancement, 600) : '',
    source: source(s) || n.raw.match(/\bSource:?\s+([^\n]+?)(?=\s+XP\b|\n|$)/)?.[1]?.trim() || '',
  };
}

const companions: DbCompanion[] = opts.content
  ? [
      ...load('pf-companions', opts.content).filter((d) => d.type === 'character').map((d) => companion(d, 'animal')),
      ...load('pf-familiars', opts.content).filter((d) => d.type === 'npc').map((d) => companion(d, 'familiar')),
    ]
  : [];

// --- Eidolon evolutions ------------------------------------------------------
const evolutions: DbEvolution[] = opts.content
  ? load('pf-eidolon-evolutions', opts.content).flatMap((d) => {
      // Entries without a cost ("Bite (Attack)", "Evasion") are class features, not evolutions.
      const m = d.name.match(/^(.*?)\s*\((\d+) EP\)$/);
      if (!m) return [];
      const description = text(d.system.description?.value);
      return [{ name: m[1], cost: Number(m[2]), summary: text(d.system.description?.summary, 200) || text(firstSentence(description), 200), description, source: source(d.system) }];
    })
  : [];

// --- Output ------------------------------------------------------------------
const byName = <T extends { name: string }>(a: T[]) => {
  const seen = new Set<string>();
  return a
    .sort((x, y) => x.name.localeCompare(y.name))
    .filter((x) => (seen.has(x.name) ? false : (seen.add(x.name), true)));
};
// Animal companions and familiars can share a species name (Dire Rat), so dedupe within each kind.
const byKindAndName = (a: DbCompanion[]) => byName(a.map((c) => ({ ...c, name: `${c.kind}\u0000${c.name}` }))).map((c) => ({ ...c, name: c.name.split('\u0000')[1] }));

// Companions and evolutions come only from pf-content; a system-only run leaves those files alone.
const outputs: Record<string, unknown[]> = { spells: byName(spells), feats: byName(feats), items: byName(items), classes: byName(classes) };
if (opts.content) Object.assign(outputs, { companions: byKindAndName(companions), evolutions: byName(evolutions) });
for (const [name, data] of Object.entries(outputs)) {
  const json = JSON.stringify(data);
  writeFileSync(join(out, `${name}.json`), json);
  console.log(`${name}: ${data.length} entries, ${(json.length / 1024).toFixed(0)} KiB`);
}
if (unknownSkills.size) console.warn(`unknown class skill codes (dropped): ${[...unknownSkills].sort().join(', ')}`);
for (const [what, n] of Object.entries(fallbacks).sort()) console.log(`fallback: ${what}: ${n}`);

// The OGL requires shipping the license and the copyright notices with the
// content. Each source ships the same license text followed by its own Section
// 15 notices; write the license once and the union of the notices.
const oglFiles = [
  join(root, '..', 'OGL.txt'),
  ...(opts.content ? [opts['ogl-content'] ?? join(opts.content, '..', 'OGL.txt')] : []),
  ...(opts.archetypes ? [opts['ogl-archetypes'] ?? join(opts.archetypes, '..', 'OGL.txt')] : []),
];
let license = '';
const notices: string[] = [];
for (const file of oglFiles) {
  if (!existsSync(file)) throw new Error(`OGL text not found at ${file}; pass --ogl-content/--ogl-archetypes or place OGL.txt next to the src directory`);
  const lines = readFileSync(file, 'utf8').replace(/\r/g, '').split('\n');
  const i = lines.findIndex((l) => /^15\.\s*COPYRIGHT NOTICE/.test(l));
  if (i < 0) throw new Error(`${file} has no "15. COPYRIGHT NOTICE" section`);
  license ||= lines.slice(0, i + 1).join('\n');
  for (const l of lines.slice(i + 1).map((l) => l.trim())) if (l && !notices.includes(l)) notices.push(l);
}
writeFileSync(join(out, 'OGL.txt'), `${license}\n${notices.join('\n')}\n`);
console.log(`OGL.txt: ${notices.length} copyright notices from ${oglFiles.length} source(s)`);
